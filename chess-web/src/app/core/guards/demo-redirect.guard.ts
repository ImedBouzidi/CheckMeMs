import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { APP_CONFIG_TOKEN } from '../tokens/app-config.token';

/** In the hosted demo there is no login flow, so auth screens redirect home. */
export const demoRedirectGuard: CanActivateFn = () => {
  const config = inject(APP_CONFIG_TOKEN);
  const router = inject(Router);

  return config.demoMode ? router.createUrlTree(['/']) : true;
};
