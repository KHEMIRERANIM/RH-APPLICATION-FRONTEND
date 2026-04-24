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
                    console.error('Erreur 401 Unauthorized sur la requete :', req.url);
                    // On commente la deconnexion agressive car le backend retourne 401 
                    // au lieu de 403 pour les problemes de permissions
                    /*
                    if (!window.location.pathname.includes('/sign-in')) {
                        this._authService.signOut();
                        window.location.href = '/sign-in';
                    }
                    */
                }
                return throwError(error);
            })
        );
    }
}
