
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, retry } from 'rxjs/operators';
import { Formateur } from '../models/formateur.model';
import { Formation } from '../../../shared/models/formation.model';
import { DialogService } from '../../../core/services/dialog.service';

@Injectable({
    providedIn: 'root'
})
export class FormateurService {
    private apiUrl = 'http://localhost:8081/api/formateurs';
    
    // Ajouter les headers avec le token
   private getHeaders(): HttpHeaders {
    return new HttpHeaders({
        'Content-Type': 'application/json',
        'Accept': 'application/json'
        // ❌ Pas besoin d'Authorization — le cookie httpOnly est envoyé automatiquement
    });
}

    constructor(
        private http: HttpClient,
        private dialogService: DialogService
    ) {}
   

    getFormateurs(): Observable<Formateur[]> {
        console.log('🔍 Appel API:', this.apiUrl);
        
        return this.http.get<Formateur[]>(this.apiUrl, { 
            headers: this.getHeaders(),
            withCredentials: true // Important pour les cookies
        }).pipe(
            retry(1),
            map(response => {
                console.log('✅ Formateurs reçus:', response);
                return response;
            }),
            catchError(this.handleError.bind(this))
        );
    }

    getFormateurById(id: string): Observable<Formateur> {
        console.log(`🔍 Récupération formateur ${id}`);
        
        return this.http.get<Formateur>(`${this.apiUrl}/${id}`, { 
            headers: this.getHeaders(),
            withCredentials: true
        }).pipe(
            catchError(this.handleError.bind(this))
        );
    }

    createFormateur(formateur: Partial<Formateur>): Observable<Formateur> {
        console.log('📝 Création formateur:', formateur);
        
        return this.http.post<Formateur>(this.apiUrl, formateur, { 
            headers: this.getHeaders(),
            withCredentials: true
        }).pipe(
            map(response => {
                console.log('✅ Formateur créé:', response);
                return response;
            }),
            catchError(this.handleError.bind(this))
        );
    }

    updateFormateur(id: string, formateur: Partial<Formateur>): Observable<Formateur> {
        console.log(`✏️ Mise à jour formateur ${id}:`, formateur);
        
        return this.http.put<Formateur>(`${this.apiUrl}/${id}`, formateur, { 
            headers: this.getHeaders(),
            withCredentials: true
        }).pipe(
            map(response => {
                console.log('✅ Formateur mis à jour:', response);
                return response;
            }),
            catchError(this.handleError.bind(this))
        );
    }

    deleteFormateur(id: string): Observable<void> {
        console.log(`🗑️ Suppression formateur ${id}`);
        
        return this.http.delete<void>(`${this.apiUrl}/${id}`, { 
            headers: this.getHeaders(),
            withCredentials: true
        }).pipe(
            map(() => {
                console.log('✅ Formateur supprimé');
            }),
            catchError(this.handleError.bind(this))
        );
    }

    assignerFormation(formateurId: string, formationId: string): Observable<Formateur> {
        console.log(`🔗 Assignation formation ${formationId} au formateur ${formateurId}`);
        
        return this.http.post<Formateur>(`${this.apiUrl}/${formateurId}/formations/${formationId}`, {}, { 
            headers: this.getHeaders(),
            withCredentials: true
        }).pipe(
            catchError(this.handleError.bind(this))
        );
    }

    retirerFormation(formateurId: string, formationId: string): Observable<Formateur> {
        console.log(`🔗 Retrait formation ${formationId} du formateur ${formateurId}`);
        
        return this.http.delete<Formateur>(`${this.apiUrl}/${formateurId}/formations/${formationId}`, { 
            headers: this.getHeaders(),
            withCredentials: true
        }).pipe(
            catchError(this.handleError.bind(this))
        );
    }

    getFormationsByFormateur(formateurId: string): Observable<Formation[]> {
        console.log(`📚 Récupération formations du formateur ${formateurId}`);
        
        return this.http.get<Formation[]>(`${this.apiUrl}/${formateurId}/formations`, { 
            headers: this.getHeaders(),
            withCredentials: true
        }).pipe(
            catchError(this.handleError.bind(this))
        );
    }

    private handleError(error: HttpErrorResponse): Observable<never> {
        console.error('❌ Erreur détaillée:', error);
        
        let errorMessage = 'Une erreur est survenue';
        let technicalDetails = '';
        
        if (error.error instanceof ErrorEvent) {
            // Erreur côté client
            errorMessage = `Erreur client: ${error.error.message}`;
            technicalDetails = error.error.message;
            console.error('❌ Erreur client:', error.error);
        } else {
            // Erreur côté serveur
            const status = error.status;
            const statusText = error.statusText;
            const errorBody = error.error;
            
            console.error(`❌ Erreur serveur ${status}:`, errorBody);
            
            if (status === 0) {
                errorMessage = '❌ Impossible de se connecter au serveur';
                technicalDetails = 'Le backend Spring Boot n\'est pas accessible. Vérifiez qu\'il est démarré sur http://localhost:8080';
            } 
            else if (status === 401) {
                errorMessage = '❌ Non authentifié';
                technicalDetails = 'Vous devez être connecté pour accéder à cette ressource. Le token d\'authentification est manquant ou expiré.';
                
                
            }
            else if (status === 403) {
                errorMessage = '❌ Accès interdit';
                technicalDetails = 'Vous n\'avez pas les droits nécessaires pour accéder à cette ressource.';
            }
            else if (status === 404) {
                errorMessage = '❌ API non trouvée';
                technicalDetails = `L'URL ${this.apiUrl} n'existe pas. Vérifiez que l'endpoint est correct dans le backend.`;
            }
            else if (status === 500) {
                errorMessage = '❌ Erreur serveur';
                technicalDetails = 'Une erreur interne est survenue sur le serveur. Vérifiez les logs du backend.';
            }
            else {
                errorMessage = `❌ Erreur ${status}: ${statusText}`;
                technicalDetails = errorBody?.message || error.message;
            }
        }
        
        // Afficher l'alerte
        this.dialogService.alert({
            title: errorMessage,
            message: technicalDetails,
            type: error.status === 401 ? 'warning' : 'error',
            confirmText: 'Fermer'
        });
        
        return throwError(() => new Error(errorMessage));
    }
}