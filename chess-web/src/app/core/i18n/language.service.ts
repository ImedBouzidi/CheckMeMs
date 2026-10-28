import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { Directionality } from '@angular/cdk/bidi';

import {
  APP_LANGUAGES,
  APP_TRANSLATIONS,
  AppLanguage,
  AppLanguageCode,
  DEFAULT_LANGUAGE,
  TranslationKey,
  isAppLanguageCode,
  languageDirection
} from './app-i18n';

const STORAGE_KEY = 'checkme-language';
const LEGACY_STORAGE_KEY = 'kids-instructor-language';

function readStoredLanguage(): AppLanguageCode {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE;

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isAppLanguageCode(stored)) return stored;

    const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (isAppLanguageCode(legacy)) return legacy;
  } catch {
    // Storage can be unavailable in private browsing contexts.
  }

  return DEFAULT_LANGUAGE;
}

@Injectable({ providedIn: 'root' })
export class LanguageService {
  readonly languages: AppLanguage[] = APP_LANGUAGES;
  readonly language = signal<AppLanguageCode>(readStoredLanguage());
  readonly code = this.language.asReadonly();
  readonly direction = computed(() => languageDirection(this.language()));
  readonly activeLanguage = computed<AppLanguage>(
    () => this.languages.find(item => item.code === this.language()) ?? this.languages[0]
  );

  private readonly directionality: Directionality;

  constructor() {
    const initialLanguage = this.language();
    const initialDirection = languageDirection(initialLanguage);

    // Apply the initial document direction before Angular Material's Directionality
    // service is created, so the sidenav lays itself out correctly on first paint.
    if (typeof document !== 'undefined') {
      document.documentElement.lang = initialLanguage;
      document.documentElement.dir = initialDirection;
    }

    this.directionality = inject(Directionality);

    effect(() => {
      const code = this.language();
      const direction = languageDirection(code);
      if (typeof document === 'undefined') return;

      document.documentElement.lang = code;
      document.documentElement.dir = direction;

      // CDK reads the document direction once. Notify it explicitly when the user
      // changes language so RTL-aware components (sidenav, overlays) re-layout.
      if (this.directionality.value !== direction) {
        // `Directionality.value` is typed as readonly but is intentionally writable at
        // runtime; this mirrors what CDK's own `Dir` directive does when `dir` changes.
        (this.directionality as { value: 'ltr' | 'rtl' }).value = direction;
        this.directionality.change.emit(direction);
      }
    });
  }

  setLanguage(code: string): boolean {
    if (!isAppLanguageCode(code)) return false;

    this.language.set(code);

    try {
      window.localStorage.setItem(STORAGE_KEY, code);
      window.localStorage.setItem(LEGACY_STORAGE_KEY, code);
    } catch {
      // Ignore storage failures; the in-memory choice still applies.
    }

    return true;
  }

  t(key: TranslationKey, params?: Record<string, string | number>): string {
    const dictionary = APP_TRANSLATIONS[this.language()] ?? APP_TRANSLATIONS[DEFAULT_LANGUAGE];
    const template = dictionary[key] ?? APP_TRANSLATIONS[DEFAULT_LANGUAGE][key] ?? key;

    if (!params) return template;

    return template.replace(/\{(\w+)\}/g, (match, name: string) =>
      Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match
    );
  }
}
