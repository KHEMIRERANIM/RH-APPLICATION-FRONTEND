// src/app/modules/employee/services/avis.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface Avis {
    id: string;
    formationId: string;
    employeId: string;
    employeNom: string;
    employePrenom: string;
    employeEmail: string;
    note: number;
    titre: string;
    commentaire: string;
    valide: boolean;
    createdAt: Date;
}

@Injectable({
    providedIn: 'root'
})
export class AvisService {
    private http = inject(HttpClient);
    private apiUrl = environment.apiUrl + '/avis';

    ajouterAvis(formationId: string, employeId: string, note: number, titre: string, commentaire: string): Observable<any> {
        return this.http.post(this.apiUrl, { formationId, employeId, note, titre, commentaire });
    }

    getAvisByFormation(formationId: string): Observable<Avis[]> {
        return this.http.get<Avis[]>(`${this.apiUrl}/formation/${formationId}`);
    }

    getStatistiquesAvis(formationId: string): Observable<any> {
        return this.http.get(`${this.apiUrl}/formation/${formationId}/statistiques`);
    }

    aDejaAvis(formationId: string, employeId: string): Observable<boolean> {
        return this.http.get<boolean>(`${this.apiUrl}/formation/${formationId}/dejaAvis/${employeId}`);
    }
      // Nouvelle méthode pour récupérer les avis en attente
    getAvisEnAttente(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/en-attente`);
    }

    // Valider un avis
    validerAvis(avisId: string): Observable<any> {
        return this.http.put(`${this.apiUrl}/${avisId}/valider`, {});
    }

    // Supprimer/rejeter un avis
    supprimerAvis(avisId: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${avisId}`);
    }
// Dans avis.service.ts
getAvisByFormationAndEmploye(formationId: string, employeId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/formation/${formationId}/employe/${employeId}`);
}
  
}