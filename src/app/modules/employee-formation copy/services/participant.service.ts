// src/app/modules/employee/services/participant.service.ts
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
    statut: 'CONFIRME' | 'PRESENT' | 'ABSENT' | 'VALIDE' | 'EN_ATTENTE';
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

    constructor() {
        console.log('ParticipantService initialized with URL:', this.apiUrl);
    }

    getParticipantsByFormation(formationId: string): Observable<ParticipantInscription[]> {
        if (!formationId) {
            throw new Error('formationId est requis');
        }
        return this.http.get<ParticipantInscription[]>(`${this.apiUrl}/formation/${formationId}`);
    }

    getInscription(formationId: string, employeId: string): Observable<ParticipantInscription> {
        if (!formationId || !employeId) {
            throw new Error('formationId et employeId sont requis');
        }
        return this.http.get<ParticipantInscription>(`${this.apiUrl}/formation/${formationId}/employe/${employeId}`);
    }

    inscrireParticipant(formationId: string, employeId: string, nom: string, prenom: string, email: string): Observable<ParticipantInscription> {
        if (!formationId || !employeId || !nom || !prenom || !email) {
            throw new Error('Tous les champs sont requis pour l\'inscription');
        }
        return this.http.post<ParticipantInscription>(`${this.apiUrl}/inscription`, null, {
            params: { formationId, employeId, nom, prenom, email }
        });
    }

    validerPresence(formationId: string, employeId: string, commentaire?: string): Observable<ParticipantInscription> {
        if (!formationId || !employeId) {
            throw new Error('formationId et employeId sont requis');
        }
        return this.http.put<ParticipantInscription>(`${this.apiUrl}/formation/${formationId}/employe/${employeId}/presence`, null, {
            params: { commentaire: commentaire || '' }
        });
    }

    // ✅ NOUVELLE MÉTHODE : Marquer comme absent
    marquerAbsent(formationId: string, employeId: string, commentaire?: string): Observable<ParticipantInscription> {
        if (!formationId || !employeId) {
            throw new Error('formationId et employeId sont requis');
        }
        return this.http.put<ParticipantInscription>(`${this.apiUrl}/formation/${formationId}/employe/${employeId}/absent`, null, {
            params: { commentaire: commentaire || 'Absent' }
        });
    }

    // ✅ NOUVELLE MÉTHODE : Réinitialiser le statut
    reinitialiserStatut(formationId: string, employeId: string): Observable<ParticipantInscription> {
        if (!formationId || !employeId) {
            throw new Error('formationId et employeId sont requis');
        }
        return this.http.put<ParticipantInscription>(`${this.apiUrl}/formation/${formationId}/employe/${employeId}/reset`, null);
    }

    annulerInscription(formationId: string, employeId: string): Observable<void> {
        if (!formationId || !employeId) {
            throw new Error('formationId et employeId sont requis');
        }
        return this.http.delete<void>(`${this.apiUrl}/formation/${formationId}/employe/${employeId}`);
    }

    getStatistiquesFormation(formationId: string): Observable<any> {
        if (!formationId) {
            throw new Error('formationId est requis');
        }
        return this.http.get(`${this.apiUrl}/formation/${formationId}/statistiques`);
    }
}