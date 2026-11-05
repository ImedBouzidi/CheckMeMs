export interface AppConfig {
  apiBaseUrl: string;
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
  /**
   * Hosted no-login demo. When enabled, the app uses a synthetic per-browser
   * identity instead of Keycloak and the API is expected to run the `demo`
   * Spring profile.
   */
  demoMode: boolean;
}
