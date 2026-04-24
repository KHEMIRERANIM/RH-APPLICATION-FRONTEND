// participant.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface ParticipantInscription {
    id: string;
    formationId: string;
    employeId: string;
    employeNom: string;
    employePrenom: string;
    employeEmail: string;
    statut: 'INSCRIT' | 'PRESENT' | 'ABSENT' | 'VALIDE';
    presenceValidee: boolean;
    dateInscription: Date;
    datePresence?: Date;
    commentaire?: string;
    createdAt: Date;
    updatedAt: Date;
}

@Injectable({
    providedIn: 'root'
})
export class ParticipantService {
    private http = inject(HttpClient);
    private apiUrl = environment.apiUrl + '/participants';

    getParticipantsByFormation(formationId: string): Observable<ParticipantInscription[]> {
        return this.http.get<ParticipantInscription[]>(`${this.apiUrl}/formation/${formationId}`);
    }

    getInscription(formationId: string, employeId: string): Observable<ParticipantInscription> {
        return this.http.get<ParticipantInscription>(`${this.apiUrl}/formation/${formationId}/employe/${employeId}`);
    }

    inscrireParticipant(formationId: string, employeId: string, nom: string, prenom: string, email: string): Observable<ParticipantInscription> {
        return this.http.post<ParticipantInscription>(`${this.apiUrl}/inscription`, null, {
            params: { formationId, employeId, nom, prenom, email }
        });
    }

    validerPresence(formationId: string, employeId: string, commentaire?: string): Observable<ParticipantInscription> {
        return this.http.put<ParticipantInscription>(`${this.apiUrl}/formation/${formationId}/employe/${employeId}/presence`, null, {
            params: { commentaire: commentaire || '' }
        });
    }

    annulerInscription(formationId: string, employeId: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/formation/${formationId}/employe/${employeId}`);
    }

    getStatistiquesFormation(formationId: string): Observable<any> {
        return this.http.get(`${this.apiUrl}/formation/${formationId}/statistiques`);
    }
}