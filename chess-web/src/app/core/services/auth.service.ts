import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { User } from '../models/user.model';
import { APP_CONFIG_TOKEN } from '../tokens/app-config.token';
import { inject } from '@angular/core';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
}

/** Shape returned by user-profile-service `/api/auth/login`. */
interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/** Shape returned by the Keycloak token endpoint when refreshing. */
interface KeycloakTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const EXPIRES_AT_KEY = 'token_expires_at';
const USER_KEY = 'current_user';
const DEMO_USER_ID_KEY = 'checkme.demo.user-id';
const GUEST_SCOPE = 'guest';

/**
 * A browser-stable id for the no-login demo. It is sent as `X-Demo-User` and
 * becomes the principal in the backend `demo` profile, keeping each visitor's
 * games and analysis separate without accounts.
 */
function getOrCreateDemoId(): string {
  const fallback = `demo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  try {
    const existing = localStorage.getItem(DEMO_USER_ID_KEY);
    if (existing && /^demo-[A-Za-z0-9_-]{4,64}$/.test(existing)) return existing;

    const generated = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? `demo-${crypto.randomUUID()}`
      : fallback;
    localStorage.setItem(DEMO_USER_ID_KEY, generated);
    return generated;
  } catch {
    return fallback;
  }
}

/** Stable identifier for the session owner; local progress is stored per scope. */
function scopeOf(token: string | null): string {
  if (!token) return GUEST_SCOPE;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as {
      sub?: string;
      preferred_username?: string;
    };
    return payload.sub || payload.preferred_username || GUEST_SCOPE;
  } catch {
    return GUEST_SCOPE;
  }
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private config = inject(APP_CONFIG_TOKEN);

  /** Hosted no-login demo build. */
  readonly demoMode = this.config.demoMode;
  readonly demoUserId: string | null = this.config.demoMode ? getOrCreateDemoId() : null;

  isAuthenticated = signal<boolean>(false);
  currentUser = signal<User | null>(null);
  accountScope = signal<string>(GUEST_SCOPE);

  private pendingRefresh?: Promise<boolean>;

  userDisplayName = computed(() => {
    const user = this.currentUser();
    if (!user) return null;
    return user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username;
  });

  constructor() {
    if (this.demoMode) {
      this.startDemoSession();
    } else {
      this.restoreSession();
    }
  }

  /** Only a signed JWT counts: earlier demo builds stored `mock_access_token_…` values. */
  accessToken(): string | null {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    return token && token.split('.').length === 3 ? token : null;
  }

  get canRefresh(): boolean {
    return !!localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  /** Auth traffic must never be retried or refreshed by the interceptor. */
  isAuthEndpoint(url: string): boolean {
    return url.includes('/api/auth/') || url.includes('/protocol/openid-connect/');
  }

  /** Returns the token to send, having refreshed it first when it is about to lapse. */
  ensureFreshToken(withinSeconds = 20): Promise<string | null> {
    const token = this.accessToken();
    if (!token) return Promise.resolve(null);

    const expiresAt = Number(localStorage.getItem(EXPIRES_AT_KEY) ?? 0);
    if (!this.canRefresh || expiresAt - Date.now() / 1000 > withinSeconds) {
      return Promise.resolve(token);
    }

    return this.refreshSession().then(() => this.accessToken());
  }

  refreshSession(): Promise<boolean> {
    if (!this.pendingRefresh) {
      const inflight = this.performRefresh().finally(() => {
        if (this.pendingRefresh === inflight) this.pendingRefresh = undefined;
      });
      this.pendingRefresh = inflight;
    }
    return this.pendingRefresh;
  }

  async login(credentials: LoginCredentials): Promise<boolean> {
    if (this.demoMode) return false;
    if (!credentials.email || !credentials.password) return false;

    try {
      const session = await firstValueFrom(
        this.http.post<AuthSession>(`${this.config.apiBaseUrl}/auth/login`, credentials)
      );
      this.startSession(session.accessToken, session.refreshToken, session.expiresIn, credentials.email);
      return true;
    } catch {
      return false;
    }
  }

  async register(data: RegisterData): Promise<boolean> {
    if (this.demoMode) return false;
    if (!data.email || !data.password || !data.username) return false;

    try {
      await firstValueFrom(this.http.post(`${this.config.apiBaseUrl}/auth/register`, data));
    } catch {
      return false;
    }

    // Registration hands back no tokens, so sign the new account straight in.
    await this.login({ email: data.email, password: data.password });
    return true;
  }

  loginWithGoogle(): void {
    if (this.demoMode) return;
    console.log('Redirecting to Google OAuth...');
    // In production, integrate with Keycloak or Google OAuth
    const mockUser: User = {
      id: 'google_' + Date.now(),
      email: 'user@gmail.com',
      firstName: 'Google',
      lastName: 'User',
      username: 'googleuser',
      provider: 'google',
      avatar: 'https://lh3.googleusercontent.com/a/default-user'
    };
    const mockToken = 'mock_google_token_' + Date.now();
    localStorage.setItem(ACCESS_TOKEN_KEY, mockToken);
    localStorage.setItem(USER_KEY, JSON.stringify(mockUser));
    this.isAuthenticated.set(false);
    this.currentUser.set(mockUser);
    this.router.navigate(['/']);
  }

  logout(): void {
    if (this.demoMode) {
      // Nothing to sign out of; keep the same browser identity and progress.
      this.startDemoSession();
      this.router.navigate(['/']);
      return;
    }

    this.clearSession();
    this.router.navigate(['/auth/login']);
  }

  private async performRefresh(): Promise<boolean> {
    if (this.demoMode) return false;

    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) return false;

    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: this.config.keycloak.clientId,
      refresh_token: refreshToken
    });

    try {
      const tokens = await firstValueFrom(
        this.http.post<KeycloakTokens>(
          `${this.config.keycloak.issuer}/protocol/openid-connect/token`,
          body.toString(),
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        )
      );
      const email = this.currentUser()?.email ?? '';
      this.startSession(tokens.access_token, tokens.refresh_token ?? refreshToken, tokens.expires_in, email);
      return true;
    } catch {
      // The Keycloak session is gone (idle timeout or logout), so a retry can never succeed.
      // Land on the login page instead of leaving the caller with a dead session.
      this.clearSession();
      this.router.navigate(['/auth/login']);
      return false;
    }
  }

  private startSession(accessToken: string, refreshToken: string, expiresIn: number, email: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    localStorage.setItem(EXPIRES_AT_KEY, String(Math.floor(Date.now() / 1000) + expiresIn));

    const existing = this.currentUser();
    const handle = email.split('@')[0] || 'player';
    const user: User = existing && existing.email === email
      ? existing
      : { id: handle, email, firstName: handle, lastName: '', username: handle, provider: 'local' };

    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this.currentUser.set(user);
    this.isAuthenticated.set(true);
    this.accountScope.set(scopeOf(accessToken));
  }

  /**
   * Demo builds never hold a JWT. The synthetic user exists so existing UI and
   * storage-scope logic keep working; the backend recognizes the browser via
   * the `X-Demo-User` header instead of a bearer token.
   */
  private startDemoSession(): void {
    this.clearStoredAuth();
    const id = this.demoUserId ?? 'demo';
    const user: User = {
      id,
      email: 'demo@checkme.local',
      firstName: 'Demo',
      lastName: 'Player',
      username: 'demo',
      provider: 'local'
    };

    this.currentUser.set(user);
    this.isAuthenticated.set(true);
    this.accountScope.set(id);
  }

  private clearStoredAuth(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(EXPIRES_AT_KEY);
    localStorage.removeItem(USER_KEY);
  }

  private clearSession(): void {
    this.clearStoredAuth();
    this.isAuthenticated.set(false);
    this.currentUser.set(null);
    this.accountScope.set(GUEST_SCOPE);
  }

  private restoreSession(): void {
    const token = this.accessToken();
    const userData = localStorage.getItem(USER_KEY);

    if (!token) {
      if (localStorage.getItem(ACCESS_TOKEN_KEY)) this.clearSession();
      return;
    }

    this.isAuthenticated.set(true);
    this.accountScope.set(scopeOf(token));
    if (userData) {
      try {
        this.currentUser.set(JSON.parse(userData));
      } catch {
        this.currentUser.set(null);
      }
    }
  }
}
