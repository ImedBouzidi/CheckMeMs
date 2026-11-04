export interface AppConfig {
  apiBaseUrl: string;
  wsUrl: string;
  keycloak: {
    issuer: string;
    realm: string;
    clientId: string;
    redirectUri: string;
    postLogoutRedirectUri: string;
  };
  features: {
    enableEngine: boolean;
    enablePuzzles: boolean;
    enableOpenings: boolean;
    enableLearning: boolean;
  };
}

export const APP_CONFIG: AppConfig = {
  apiBaseUrl: 'http://localhost:8081/api',
  wsUrl: 'ws://localhost:8081/ws',
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
  }
};
