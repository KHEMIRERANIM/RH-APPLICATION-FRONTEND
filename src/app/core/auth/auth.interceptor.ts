import { Injectable } from '@angular/core';
import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from 'app/core/auth/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor
{
    constructor(private _authService: AuthService) {}

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>>
    {
        // Ignorer les requetes externes (Pexels, etc.) ou ws-tracking
        if (req.url.includes('api.pexels.com') || req.url.includes('/ws-tracking')) {
            return next.handle(req);
        }

        let newReq = req.clone();

        const token = this._authService.accessToken;
        if (token) {
            newReq = req.clone({
                headers: req.headers.set('Authorization', 'Bearer ' + token)
            });
        }

        return next.handle(newReq).pipe(
            catchError((error) => {
                if (error instanceof HttpErrorResponse && error.status === 401) {
                    // Only sign out if the token is actually expired or missing.
                    // If the token is still valid, let the error pass through
                    // so individual services can handle it with their own catchError.
                    if (this._authService.isTokenExpired()) {
                        if (!window.location.pathname.includes('/sign-in')) {
                            this._authService.signOut();
                            window.location.href = '/sign-in';
                        }
                    }
                }
                return throwError(error);
            })
        );
    }
}
