// formateurs/formateur.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, retry } from 'rxjs/operators';
import { Formateur } from '../models/formateur.model';
import { Formation } from '../../../shared/models/formation.model';
import { DialogService } from '../../../core/services/dialog.service';
import { environment } from '../../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class FormateurService {
    private http = inject(HttpClient);
    private dialogService = inject(DialogService);
    private apiUrl = environment.apiUrl + '/formateurs';

    constructor() {
        console.log('FormateurService URL:', this.apiUrl);
    }

    getFormateurs(): Observable<Formateur[]> {
        console.log('🔍 Appel API:', this.apiUrl);
        
        return this.http.get<Formateur[]>(this.apiUrl).pipe(
            map(response => {
                console.log('✅ Formateurs reçus:', response);
                return response;
            }),
            catchError(this.handleError.bind(this))
        );
    }

    getFormateurById(id: string): Observable<Formateur> {
        return this.http.get<Formateur>(`${this.apiUrl}/${id}`).pipe(
            catchError(this.handleError.bind(this))
        );
    }

    createFormateur(formateur: Partial<Formateur>): Observable<Formateur> {
        console.log('📝 Création formateur:', formateur);
        
        return this.http.post<Formateur>(this.apiUrl, formateur).pipe(
            map(response => {
                console.log('✅ Formateur créé:', response);
                return response;
            }),
            catchError(this.handleError.bind(this))
        );
    }

    updateFormateur(id: string, formateur: Partial<Formateur>): Observable<Formateur> {
        console.log(`✏️ Mise à jour formateur ${id}:`, formateur);
        
        return this.http.put<Formateur>(`${this.apiUrl}/${id}`, formateur).pipe(
            map(response => {
                console.log('✅ Formateur mis à jour:', response);
                return response;
            }),
            catchError(this.handleError.bind(this))
        );
    }

    deleteFormateur(id: string): Observable<void> {
        console.log(`🗑️ Suppression formateur ${id}`);
        
        return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
            map(() => {
                console.log('✅ Formateur supprimé');
            }),
            catchError(this.handleError.bind(this))
        );
    }

    assignerFormation(formateurId: string, formationId: string): Observable<Formateur> {
        return this.http.post<Formateur>(`${this.apiUrl}/${formateurId}/formations/${formationId}`, {}).pipe(
            catchError(this.handleError.bind(this))
        );
    }

    retirerFormation(formateurId: string, formationId: string): Observable<Formateur> {
        return this.http.delete<Formateur>(`${this.apiUrl}/${formateurId}/formations/${formationId}`).pipe(
            catchError(this.handleError.bind(this))
        );
    }

    getFormationsByFormateur(formateurId: string): Observable<Formation[]> {
        return this.http.get<Formation[]>(`${this.apiUrl}/${formateurId}/formations`).pipe(
            catchError(this.handleError.bind(this))
        );
    }

    private handleError(error: HttpErrorResponse): Observable<never> {
        console.error('❌ Erreur détaillée:', error);
        
        let errorMessage = 'Une erreur est survenue';
        
        if (error.error instanceof ErrorEvent) {
            errorMessage = `Erreur client: ${error.error.message}`;
        } else {
            const status = error.status;
            
            if (status === 0) {
                errorMessage = '❌ Impossible de se connecter au serveur. Vérifiez que le backend est démarré.';
            } else if (status === 401) {
                errorMessage = '❌ Non authentifié. Veuillez vous reconnecter.';
            } else if (status === 403) {
                errorMessage = '❌ Accès interdit. Vous n\'avez pas les droits nécessaires.';
            } else if (status === 404) {
                errorMessage = `❌ API non trouvée: ${this.apiUrl}`;
            } else if (status === 500) {
                errorMessage = '❌ Erreur serveur. Vérifiez les logs du backend.';
            } else {
                errorMessage = `❌ Erreur ${status}: ${error.message}`;
            }
        }
        
        this.dialogService.alert({
            title: 'Erreur',
            message: errorMessage,
            type: 'error',
            confirmText: 'Fermer'
        });
        
        return throwError(() => new Error(errorMessage));
    }
}