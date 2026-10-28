import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
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

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private config = inject(APP_CONFIG_TOKEN);

  isAuthenticated = signal<boolean>(!!localStorage.getItem('access_token'));
  currentUser = signal<User | null>(null);
  
  userDisplayName = computed(() => {
    const user = this.currentUser();
    if (!user) return null;
    return user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username;
  });

  constructor() {
    this.loadUserFromStorage();
  }

  private loadUserFromStorage(): void {
    const token = localStorage.getItem('access_token');
    const userData = localStorage.getItem('current_user');
    if (token && userData) {
      this.isAuthenticated.set(true);
      try {
        this.currentUser.set(JSON.parse(userData));
      } catch {
        this.currentUser.set(null);
      }
    }
  }

  login(credentials: LoginCredentials): Promise<boolean> {
    return new Promise((resolve) => {
      // Demo login - in production, call API
      if (credentials.email && credentials.password) {
        const mockUser: User = {
          id: '1',
          email: credentials.email,
          firstName: credentials.email.split('@')[0],
          lastName: '',
          username: credentials.email.split('@')[0],
          provider: 'local'
        };
        const mockToken = 'mock_access_token_' + Date.now();
        localStorage.setItem('access_token', mockToken);
        localStorage.setItem('current_user', JSON.stringify(mockUser));
        this.isAuthenticated.set(true);
        this.currentUser.set(mockUser);
        resolve(true);
      } else {
        resolve(false);
      }
    });
  }

  register(data: RegisterData): Promise<boolean> {
    return new Promise((resolve) => {
      if (data.email && data.password && data.username) {
        const mockUser: User = {
          id: Date.now().toString(),
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          username: data.username,
          provider: 'local',
          createdAt: new Date()
        };
        const mockToken = 'mock_access_token_' + Date.now();
        localStorage.setItem('access_token', mockToken);
        localStorage.setItem('current_user', JSON.stringify(mockUser));
        this.isAuthenticated.set(true);
        this.currentUser.set(mockUser);
        resolve(true);
      } else {
        resolve(false);
      }
    });
  }

  loginWithGoogle(): void {
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
    localStorage.setItem('access_token', mockToken);
    localStorage.setItem('current_user', JSON.stringify(mockUser));
    this.isAuthenticated.set(true);
    this.currentUser.set(mockUser);
    this.router.navigate(['/']);
  }

  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('current_user');
    this.isAuthenticated.set(false);
    this.currentUser.set(null);
    this.router.navigate(['/auth/login']);
  }

  setTokens(accessToken: string, refreshToken?: string): void {
    localStorage.setItem('access_token', accessToken);
    if (refreshToken) {
      localStorage.setItem('refresh_token', refreshToken);
    }
    this.isAuthenticated.set(true);
  }
}
