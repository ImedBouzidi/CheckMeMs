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
    issuer: 'http://localhost:8080/realms/chess-platform',
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
