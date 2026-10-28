import { Injectable, effect, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'checkme-theme';

function systemTheme(): ThemeMode {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function readStoredTheme(): { mode: ThemeMode; explicit: boolean } {
  if (typeof window === 'undefined') return { mode: 'light', explicit: false };

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return { mode: stored, explicit: true };
  } catch {
    // Storage can be unavailable in private browsing contexts.
  }

  return { mode: systemTheme(), explicit: false };
}

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly initial = readStoredTheme();
  private readonly explicit = signal(this.initial.explicit);
  readonly theme = signal<ThemeMode>(this.initial.mode);

  constructor() {
    effect(() => {
      const mode = this.theme();
      if (typeof document === 'undefined') return;

      document.documentElement.classList.toggle('dark-theme', mode === 'dark');
      document.documentElement.style.colorScheme = mode;
    });

    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      const query = window.matchMedia('(prefers-color-scheme: dark)');
      query.addEventListener?.('change', event => {
        if (!this.explicit()) {
          this.theme.set(event.matches ? 'dark' : 'light');
        }
      });
    }
  }

  toggle(): void {
    this.setTheme(this.theme() === 'dark' ? 'light' : 'dark');
  }

  setTheme(mode: ThemeMode): void {
    this.explicit.set(true);
    this.theme.set(mode);

    try {
      window.localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // Ignore storage failures; the in-memory choice still applies.
    }
  }
}
