import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';

@Injectable()
export class AuthService
{
    private _authenticated: boolean = false;
    private apiUrl = 'http://localhost:8081/api/auth';

    /**
     * Constructor
     */
    constructor(private _httpClient: HttpClient)
    {
        this.check().subscribe();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Accessors
    // -----------------------------------------------------------------------------------------------------

    set accessToken(token: string)
    {
        localStorage.setItem('accessToken', token);
    }

    get accessToken(): string
    {
        return localStorage.getItem('accessToken') ?? '';
    }

    /**
     * Get access token (alias pour l'intercepteur)
     */
    getToken(): string | null
    {
        return localStorage.getItem('accessToken');
    }

    get currentUser(): any
    {
        const userStr = localStorage.getItem('currentUser');
        return userStr ? JSON.parse(userStr) : null;
    }

    isAdmin(): boolean
    {
        const user = this.currentUser;
        return user?.role === 'ADMIN';
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    signIn(credentials: { email: string; password: string }): Observable<any>
    {
        if ( this._authenticated )
        {
            return throwError(() => new Error('User is already logged in.'));
        }

        return this._httpClient.post(`${this.apiUrl}/login`, credentials).pipe(
            tap((response: any) => {
                this.accessToken = response.token;
                
                localStorage.setItem('currentUser', JSON.stringify({
                    id: response.id,
                    email: response.email,
                    role: response.role,
                    nom: response.nom,
                    prenom: response.prenom,
                    photoUrl: response.photoUrl || response.avatar,
                    isActive: response.isActive
                }));
                
                this._authenticated = true;
            }),
            switchMap((response: any) => of(response))
        );
    }

    signInUsingToken(): Observable<any>
    {
        if (this.accessToken && this.currentUser) {
            this._authenticated = true;
            return of(true);
        }
        
        return of(false);
    }

    signOut(): Observable<any>
    {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('currentUser');

        this._authenticated = false;

        return of(true);
    }

    check(): Observable<boolean>
    {
        if ( this._authenticated )
        {
            return of(true);
        }

        if ( !this.accessToken )
        {
            return of(false);
        }

        if ( !this.currentUser )
        {
            return of(false);
        }

        this._authenticated = true;
        return of(true);
    }
    
    getProfile(): Observable<any>
    {
        return this._httpClient.get('http://localhost:8081/api/users/me');
    }

    forgotPassword(email: string): Observable<any>
    {
        return this._httpClient.post(`${this.apiUrl}/forgot-password`, { email });
    }

    resetPassword(password: string): Observable<any>
    {
        return this._httpClient.post(`${this.apiUrl}/reset-password`, { password });
    }

    signUp(user: any): Observable<any>
    {
        return this._httpClient.post(`${this.apiUrl}/register-candidate`, user);
    }

    unlockSession(credentials: { email: string; password: string }): Observable<any>
    {
        return this._httpClient.post(`${this.apiUrl}/unlock-session`, credentials);
    }
}
