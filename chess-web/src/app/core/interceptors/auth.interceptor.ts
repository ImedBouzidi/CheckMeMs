import { HttpErrorResponse, HttpEvent, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, Observable, switchMap, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  if (auth.isAuthEndpoint(req.url)) {
    return next(req);
  }

  const send = (token: string | null): Observable<HttpEvent<unknown>> =>
    next(token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req);

  let retried = false;

  return from(auth.ensureFreshToken()).pipe(
    switchMap(token =>
      send(token).pipe(
        catchError((error: HttpErrorResponse) => {
          if (error.status !== 401 || retried || !auth.canRefresh) {
            return throwError(() => error);
          }

          retried = true;
          return from(auth.refreshSession()).pipe(
            switchMap(refreshed => (refreshed ? send(auth.accessToken()) : throwError(() => error)))
          );
        })
      )
    )
  );
};
