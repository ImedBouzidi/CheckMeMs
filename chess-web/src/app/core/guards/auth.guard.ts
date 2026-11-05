import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { APP_CONFIG_TOKEN } from '../tokens/app-config.token';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const config = inject(APP_CONFIG_TOKEN);
  const authService = inject(AuthService);
  const router = inject(Router);

  if (config.demoMode || authService.isAuthenticated()) {
    return true;
  }

  router.navigate(['/auth/login'], { queryParams: { returnUrl: state.url } });
  return false;
};
