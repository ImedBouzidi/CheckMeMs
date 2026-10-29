import { Injectable, computed, inject } from '@angular/core';
import { AuthService } from './auth.service';

/**
 * Namespaces device-local progress by account, so a shared browser does not show
 * another player's games, puzzles or lessons.
 */
@Injectable({ providedIn: 'root' })
export class StorageScopeService {
  private readonly auth = inject(AuthService);

  readonly scope = computed(() => this.auth.accountScope());

  key(baseKey: string): string {
    return `${baseKey}.${this.scope()}`;
  }

  read<T>(baseKey: string): T | null {
    const scoped = this.key(baseKey);
    try {
      const raw = window.localStorage.getItem(scoped);
      if (raw) return JSON.parse(raw) as T;

      // History written before accounts were separated belongs to whoever claims it first.
      const legacy = window.localStorage.getItem(baseKey);
      if (legacy) window.localStorage.setItem(scoped, legacy);
      return legacy ? (JSON.parse(legacy) as T) : null;
    } catch {
      return null;
    }
  }

  write(baseKey: string, value: unknown): void {
    try {
      window.localStorage.setItem(this.key(baseKey), JSON.stringify(value));
    } catch {
      // Ignore storage failures; the in-memory state still applies.
    }
  }

  remove(baseKey: string): void {
    try {
      window.localStorage.removeItem(this.key(baseKey));
    } catch {
      // Storage can be unavailable in private mode.
    }
  }
}
