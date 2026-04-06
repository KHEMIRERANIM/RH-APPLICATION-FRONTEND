import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, CanActivateChild, CanLoad, Route, Router, RouterStateSnapshot, UrlSegment, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { AuthService } from 'app/core/auth/auth.service';
import { switchMap } from 'rxjs/operators';

@Injectable({
    providedIn: 'root'
})
export class AuthGuard implements CanActivate, CanActivateChild, CanLoad
{
    /**
     * Constructor
     */
    constructor(
        private _authService: AuthService,
        private _router: Router
    )
    {
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Can activate
     *
     * @param route
     * @param state
     */
    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> | Promise<boolean> | boolean
    {
        const redirectUrl = state.url === '/sign-out' ? '/' : state.url;
        return this._check(redirectUrl);
    }

    /**
     * Can activate child
     *
     * @param childRoute
     * @param state
     */
    canActivateChild(childRoute: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree
    {
        const redirectUrl = state.url === '/sign-out' ? '/' : state.url;
        return this._check(redirectUrl);
    }

    /**
     * Can load
     *
     * @param route
     * @param segments
     */
    canLoad(route: Route, segments: UrlSegment[]): Observable<boolean> | Promise<boolean> | boolean
    {
        return this._check('/');
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Private methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Check the authenticated status
     *
     * @param redirectURL
     * @private
     */
    private _check(redirectURL: string): Observable<boolean>
    {
        // 🔥 VÉRIFIER D'ABORD DANS LOCALSTORAGE
        const userStr = localStorage.getItem('currentUser');
        const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
        
        console.log('🔒 AuthGuard - URL:', redirectURL);
        console.log('🔒 AuthGuard - userStr:', userStr ? '✅ présent' : '❌ absent');
        console.log('🔒 AuthGuard - token:', token ? '✅ présent' : '❌ absent');
        
        // Si l'utilisateur est dans localStorage, l'autoriser immédiatement
        if (userStr && token) {
            try {
                const user = JSON.parse(userStr);
                console.log('🔒 AuthGuard - Utilisateur:', user.email, 'Rôle:', user.role);
                
                // ADMIN et EMPLOYE sont autorisés
                if (user.role === 'ADMIN' || user.role === 'EMPLOYE') {
                    console.log('🔒 AuthGuard - ✅ ACCÈS AUTORISÉ (localStorage)');
                    return of(true);
                } else {
                    console.log('🔒 AuthGuard - ❌ Rôle non autorisé:', user.role);
                }
            } catch(e) {
                console.error('🔒 AuthGuard - Erreur parsing:', e);
            }
        }
        
        // Sinon, vérifier via le service d'auth
        console.log('🔒 AuthGuard - Vérification via AuthService...');
        return this._authService.check()
                   .pipe(
                       switchMap((authenticated) => {
                           if ( !authenticated )
                           {
                               console.log('🔒 AuthGuard - ❌ NON AUTHENTIFIÉ, redirection login');
                               this._router.navigate(['sign-in'], {queryParams: {redirectURL}});
                               return of(false);
                           }
                           console.log('🔒 AuthGuard - ✅ ACCÈS AUTORISÉ (AuthService)');
                           return of(true);
                       })
                   );
    }
}