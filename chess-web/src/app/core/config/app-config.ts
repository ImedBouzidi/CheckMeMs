import { AppConfig } from './app-config.model';

export type { AppConfig } from './app-config.model';

export const APP_CONFIG: AppConfig = {
  apiBaseUrl: 'http://localhost:8081/api',
  keycloak: {
    // Must match KC_HOSTNAME published by docker-compose (host port 8085;
    // 8080 is taken by local Jenkins).
    issuer: 'http://localhost:8085/realms/chess-platform',
    realm: 'chess-platform',
    clientId: 'chess-web',
    redirectUri: window.location.origin + '/',
    postLogoutRedirectUri: window.location.origin + '/'
  },
  features: {
    enableEngine: true,
    enablePuzzles: true,
    enableOpenings: true,
    enableLearning: true
  },
  demoMode: false
};
