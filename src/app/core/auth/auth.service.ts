import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';

@Injectable()
export class AuthService
{
    private _authenticated: boolean = false;
    private apiUrl = '/api/auth';

    constructor(private _httpClient: HttpClient)
    {
        this.check().subscribe();
    }

    set accessToken(token: string)
    {
        localStorage.setItem('accessToken', token);
    }

    get accessToken(): string
    {
        return localStorage.getItem('accessToken') ?? '';
    }

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

    signIn(credentials: { email: string; password: string }): Observable<any>
    {
        if (this._authenticated)
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
                    poste: response.poste,
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
        if (this.accessToken && this.currentUser && !this.isTokenExpired()) {
            this._authenticated = true;
            return of(true);
        }

        // Token absent or expired — clean up
        if (this.isTokenExpired()) {
            this.signOut();
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
        if (this._authenticated && !this.isTokenExpired())
        {
            return of(true);
        }

        if (!this.accessToken)
        {
            return of(false);
        }

        if (!this.currentUser)
        {
            return of(false);
        }

        // If token is expired, sign out and deny access
        if (this.isTokenExpired())
        {
            this.signOut();
            return of(false);
        }

        this._authenticated = true;
        return of(true);
    }

    /**
     * Decode the JWT payload and check if the token has expired.
     * Returns true if the token is expired or cannot be decoded.
     * Public so the interceptor can use it.
     */
    isTokenExpired(): boolean
    {
        const token = this.accessToken;
        if (!token) {
            return true;
        }

        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            // exp is in seconds, Date.now() is in milliseconds
            // 60-second buffer to avoid edge-case clock drift
            return (payload.exp * 1000) < (Date.now() - 60000);
        } catch (e) {
            return true;
        }
    }

    getProfile(): Observable<any>
    {
        return this._httpClient.get('/api/users/me');
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