import { Injectable } from '@angular/core';
import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from 'app/core/auth/auth.service';
import { AuthUtils } from 'app/core/auth/auth.utils';

@Injectable()
export class AuthInterceptor implements HttpInterceptor
{
    private isRefreshing = false;

    constructor(private _authService: AuthService)
    {
    }

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>>
    {
        // Ne pas interférer avec la route de login
        if (req.url.includes('/auth/login')) {
            return next.handle(req);
        }

        let newReq = req.clone();

        // Ajouter le token s'il existe et n'est pas expiré
        const token = this._authService.accessToken;
        if (token && !AuthUtils.isTokenExpired(token))
        {
            newReq = req.clone({
                headers: req.headers.set('Authorization', 'Bearer ' + token)
            });
        }

        return next.handle(newReq).pipe(
            catchError((error) => {
                if (error instanceof HttpErrorResponse && error.status === 401)
                {
                    console.warn('⚠️ Erreur 401 sur:', req.url);
                    
                    // Vérifier si on est déjà sur sign-in pour éviter la boucle
                    if (window.location.pathname.includes('/sign-in')) {
                        return throwError(() => error);
                    }
                    
                    // Ne PAS supprimer le token si c'est une route employee qui échoue
                    if (req.url.includes('/employee') || req.url.includes('/conges') || req.url.includes('/salaires')) {
                        console.log('🔑 Route protégée mais token présent - on garde la session');
                        return throwError(() => error);
                    }
                    
                    // Pour les autres erreurs, déconnecter
                    this._authService.signOut();
                    window.location.href = '/sign-in';
                }
                return throwError(() => error);
            })
        );
    }
}