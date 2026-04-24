// C:\pi\RH-APPLICATION-FRONTEND\src\app\services/admin-proposition.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';

export interface Proposition {
    id: string;
    technologie: string;
    titre: string;
    description: string;
    objectifs: string;
    dureeHeures: number;
    niveau: string;
    type: string;
    source: string;
    scoreIA: number;
    statut: string;
    statutVote: string;
    commentaireValidation: string;
    dateProposition: Date;
    dateValidation: Date;
    dateFinVote: Date;
    seuilMinimum: number;
    pourcentagePour: number;
    totalVotes: number;
    votesPour: number;
    votesContre: number;
    votesPeutEtre: number;
    nombreInteresses: number;
    employesInteresses: any[];
    votesDetails: any[];
}

@Injectable({ providedIn: 'root' })
export class AdminPropositionService {
    private apiUrl = `${environment.apiUrl}/formations`;

    constructor(private http: HttpClient) {}

    // Générer des propositions IA
    genererPropositionsIA(): Observable<Proposition[]> {
        return this.http.post<Proposition[]>(`${this.apiUrl}/propositions/generer`, {});
    }

    // Récupérer toutes les propositions en attente
    getPropositionsEnAttente(): Observable<Proposition[]> {
        return this.http.get<Proposition[]>(`${this.apiUrl}/propositions/en-attente`);
    }

    // Récupérer toutes les propositions validées
    getPropositionsValidees(): Observable<Proposition[]> {
        return this.http.get<Proposition[]>(`${this.apiUrl}/propositions/validees`);
    }

    // Valider une proposition
    validerProposition(propositionId: string, adminId: string, commentaire: string): Observable<Proposition> {
        return this.http.post<Proposition>(`${this.apiUrl}/propositions/${propositionId}/valider?adminId=${adminId}`, 
            { commentaire: commentaire });
    }

    // Rejeter une proposition
    rejeterProposition(propositionId: string, adminId: string, raison: string): Observable<Proposition> {
        return this.http.post<Proposition>(`${this.apiUrl}/propositions/${propositionId}/rejeter?adminId=${adminId}`,
            { raison: raison });
    }

    // Ouvrir le vote pour une proposition
    ouvrirVote(propositionId: string, dureeJours: number, seuilMinimum: number): Observable<Proposition> {
        return this.http.post<Proposition>(`${this.apiUrl}/propositions/${propositionId}/ouvrir-vote`,
            { dureeJours: dureeJours, seuilMinimum: seuilMinimum });
    }

    // Clôturer le vote
    cloturerVote(propositionId: string): Observable<Proposition> {
        return this.http.post<Proposition>(`${this.apiUrl}/propositions/${propositionId}/cloturer-vote`, {});
    }

    // Récupérer les statistiques de vote
    getStatsVote(propositionId: string): Observable<any> {
        return this.http.get(`${this.apiUrl}/propositions/${propositionId}/stats-vote`);
    }

    // Publier une formation (transformer proposition en formation)
    publierFormation(propositionId: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/propositions/${propositionId}/publier`, {});
    }

    // Statistiques globales
    getStats(): Observable<any> {
        return this.http.get(`${this.apiUrl}/propositions/stats`);
    }
}