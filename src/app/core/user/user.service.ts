import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, ReplaySubject, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { User } from 'app/core/user/user.types';

@Injectable({
    providedIn: 'root'
})
export class UserService
{
    private _user: ReplaySubject<User> = new ReplaySubject<User>(1);

    /**
     * Constructor
     */
    constructor(private _httpClient: HttpClient)
    {
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Accessors
    // -----------------------------------------------------------------------------------------------------

    /**
     * Setter & getter for user
     *
     * @param value
     */
    set user(value: User)
    {
        // Store the value
        this._user.next(value);
    }

    get user$(): Observable<User>
    {
        return this._user.asObservable();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Get the current logged in user data
     */
    get(): Observable<User>
    {
        const localUserStr = localStorage.getItem('currentUser');
        if (!localUserStr) {
            return this._httpClient.get<User>('api/common/user').pipe(tap(user => this._user.next(user)));
        }
        const localUser = JSON.parse(localUserStr);
        return this._httpClient.get<any>(`http://localhost:8081/api/users/${localUser.id}`).pipe(
            map(response => {
                return {
                    id: response.id,
                    name: response.prenom + ' ' + response.nom,
                    email: response.email,
                    avatar: response.photoUrl,
                    status: response.status === 'ACTIF' ? 'online' : 'away',
                    role: response.role?.toLowerCase(),
                    nom: response.nom,
                    prenom: response.prenom,
                    telephone: response.telephone,
                    adresse: response.adresse,
                    departement: response.departement,
                    poste: response.poste
                } as User;
            }),
            tap((user) => {
                this._user.next(user);
            }),
            catchError((err) => {
                console.warn("Erreur Backend API Users — fallback sur données locales", err);
                // Au lieu de rediriger (ce qui cause une boucle infinie),
                // on construit un User basique à partir du localStorage
                const fallbackUser: User = {
                    id: localUser.id,
                    name: (localUser.prenom || '') + ' ' + (localUser.nom || ''),
                    email: localUser.email || '',
                    avatar: localUser.photoUrl || localUser.avatar || '',
                    status: 'online',
                    role: localUser.role?.toLowerCase() || 'employe',
                    nom: localUser.nom || '',
                    prenom: localUser.prenom || '',
                    telephone: '',
                    adresse: '',
                    departement: '',
                    poste: ''
                };
                this._user.next(fallbackUser);
                return of(fallbackUser);
            })
        );
    }

    /**
     * Update the user
     *
     * @param user
     */
    update(user: User): Observable<any>
    {
        const localUserStr = localStorage.getItem('currentUser');
        if (!localUserStr) {
             return this._httpClient.patch<User>('api/common/user', {user}).pipe(
                 map((response) => {
                     this._user.next(response);
                 })
             );
        }
        
        const localUser = JSON.parse(localUserStr);
        const updateData = {
           nom: user.nom,
           prenom: user.prenom,
           telephone: user.telephone,
           adresse: user.adresse,
           departement: user.departement,
           poste: user.poste,
           photoUrl: user.avatar
        };

        return this._httpClient.put<any>(`http://localhost:8081/api/users/${localUser.id}`, updateData).pipe(
            tap(() => {
                this.get().subscribe();
            })
        );
    }
}
