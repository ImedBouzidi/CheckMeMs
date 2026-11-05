import { AppConfig } from './app-config.model';

/**
 * Hosted trial build.
 *
 * The API is served from the same origin by nginx (`/api` -> gateway), so no
 * host or CORS configuration is required. Keycloak is intentionally absent:
 * `AuthService` creates a synthetic per-browser identity and the backend runs
 * the `demo` Spring profile.
 */
export const APP_CONFIG: AppConfig = {
  apiBaseUrl: '/api',
  keycloak: {
    issuer: '',
    realm: '',
    clientId: '',
    redirectUri: window.location.origin + '/',
    postLogoutRedirectUri: window.location.origin + '/'
  },
  features: {
    enableEngine: true,
    enablePuzzles: true,
    enableOpenings: true,
    enableLearning: true
  },
  demoMode: true
};
