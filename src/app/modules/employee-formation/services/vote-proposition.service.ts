// C:\pi\RH-APPLICATION-FRONTEND\src\app\services/vote-proposition.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface Proposition {
    id: string;
    technologie: string;
    titre: string;
    description: string;
    dureeHeures: number;
    niveau: string;
    type: string;
    scoreIA: number;
    statut: string;
    statutVote: string;
    dateFinVote: Date;
    seuilMinimum: number;
    pourcentagePour: number;
    totalVotes: number;
    votesPour: number;
    votesContre: number;
    votesPeutEtre: number;
}

export interface VoteStats {
    propositionId: string;
    titre: string;
    totalVotes: number;
    votesPour: number;
    votesContre: number;
    votesPeutEtre: number;
    pourcentagePour: number;
    seuilMinimum: number;
    seuilAtteint: boolean;
    dateFinVote: Date;
    statutVote: string;
    votesDetails: any[];
}

@Injectable({ providedIn: 'root' })
export class VotePropositionService {
    private apiUrl = `${environment.apiUrl}/formations`;

    constructor(private http: HttpClient) {}

    // Récupérer toutes les propositions ouvertes au vote
 

    // Voter pour une proposition
    voter(propositionId: string, vote: string, commentaire: string): Observable<any> {
        const employeId = localStorage.getItem('userId');
        const employeNom = localStorage.getItem('userName') || 'Employé';
        const employeEmail = localStorage.getItem('userEmail') || 'employe@company.com';

        const body = {
            employeId: employeId,
            employeNom: employeNom,
            employeEmail: employeEmail,
            vote: vote,
            commentaire: commentaire
        };
        return this.http.post(`${this.apiUrl}/propositions/${propositionId}/voter`, body);
    }

    // Vérifier si l'employé a déjà voté
    hasEmployeVoted(propositionId: string): Observable<any> {
        const employeId = localStorage.getItem('userId');
        return this.http.get(`${this.apiUrl}/propositions/${propositionId}/a-vote/${employeId}`);
    }

    // Récupérer les statistiques de vote
    getStatsVote(propositionId: string): Observable<VoteStats> {
        return this.http.get<VoteStats>(`${this.apiUrl}/propositions/${propositionId}/stats-vote`);
    }
    getPropositionsOuvertesVote(): Observable<Proposition[]> {
    // Récupérer les propositions avec statutVote = 'OUVERT' (peu importe le statut)
    return this.http.get<Proposition[]>(`${this.apiUrl}/propositions/vote/ouvertes`);
}
}