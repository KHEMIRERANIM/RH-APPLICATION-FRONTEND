// C:\pi\RH-APPLICATION-FRONTEND\src\app\modules\employee\components\votes-propositions\votes-propositions.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VotePropositionService, Proposition, VoteStats } from '../../services/vote-proposition.service';
import { DialogService } from '../../../../core/services/dialog.service';

@Component({
    selector: 'app-votes-propositions',
    standalone: false,
    templateUrl: './votes-propositions.component.html',
    styleUrls: ['./votes-propositions.component.scss']
})
export class VotesPropositionsComponent implements OnInit {
    propositions: Proposition[] = [];
    stats: { [key: string]: VoteStats } = {};
    aVote: { [key: string]: boolean } = {};
    votesUtilisateur: { [key: string]: string } = {};
    commentaires: { [key: string]: string } = {};
    isLoading = true;
    tempsRestant: { [key: string]: string } = {};

    constructor(
        private voteService: VotePropositionService,
        private dialogService: DialogService
    ) {}

    ngOnInit(): void {
        this.loadPropositions();
        setInterval(() => this.refreshData(), 30000);
    }

    loadPropositions(): void {
        this.isLoading = true;
        this.voteService.getPropositionsOuvertesVote().subscribe({
            next: (data) => {
                this.propositions = data;
                this.propositions.forEach(p => {
                    this.loadStats(p.id);
                    this.checkIfVoted(p.id);
                    this.calculerTempsRestant(p);
                });
                this.isLoading = false;
            },
            error: (err) => {
                console.error('Erreur:', err);
                this.isLoading = false;
            }
        });
    }

    loadStats(propositionId: string): void {
        this.voteService.getStatsVote(propositionId).subscribe({
            next: (data) => this.stats[propositionId] = data,
            error: (err) => console.error(err)
        });
    }

    checkIfVoted(propositionId: string): void {
        this.voteService.hasEmployeVoted(propositionId).subscribe({
            next: (data) => {
                this.aVote[propositionId] = data.aVote;
                if (data.vote) {
                    this.votesUtilisateur[propositionId] = data.vote.vote;
                }
            },
            error: (err) => console.error(err)
        });
    }

    calculerTempsRestant(proposition: Proposition): void {
        if (proposition.dateFinVote) {
            const fin = new Date(proposition.dateFinVote);
            const now = new Date();
            const diff = fin.getTime() - now.getTime();
            
            if (diff <= 0) {
                this.tempsRestant[proposition.id] = 'Terminé';
            } else {
                const jours = Math.floor(diff / (1000 * 60 * 60 * 24));
                const heures = Math.floor((diff % (86400000)) / (1000 * 60 * 60));
                if (jours > 0) {
                    this.tempsRestant[proposition.id] = `${jours}j ${heures}h restants`;
                } else {
                    this.tempsRestant[proposition.id] = `${heures}h restantes`;
                }
            }
        }
    }

    voter(propositionId: string, vote: string): void {
        const commentaire = this.commentaires[propositionId] || '';
        
        this.dialogService.confirm({
            title: 'Confirmation du vote',
            message: `Souhaitez-vous voter "${this.getVoteLabel(vote)}" pour cette formation ?`,
            confirmText: 'Confirmer',
            cancelText: 'Annuler',
            type: 'info'
        }).subscribe(confirmed => {
            if (confirmed) {
                this.voteService.voter(propositionId, vote, commentaire).subscribe({
                    next: (response) => {
                        this.dialogService.alert({
                            title: 'Vote enregistré !',
                            message: `Votre vote a bien été pris en compte.\n\n${response.pourcentagePour}% des participants sont pour.`,
                            type: 'success',
                            confirmText: 'Fermer'
                        });
                        this.loadStats(propositionId);
                        this.checkIfVoted(propositionId);
                    },
                    error: (err) => {
                        this.dialogService.alert({
                            title: 'Erreur',
                            message: err.error?.message || 'Impossible d\'enregistrer votre vote',
                            type: 'error',
                            confirmText: 'Fermer'
                        });
                    }
                });
            }
        });
    }

    refreshData(): void {
        this.propositions.forEach(p => {
            this.loadStats(p.id);
            this.calculerTempsRestant(p);
        });
    }

    getVoteLabel(vote: string): string {
        switch(vote) {
            case 'POUR': return '👍 Pour';
            case 'CONTRE': return '👎 Contre';
            case 'PEUT_ETRE': return '🤔 Peut-être';
            default: return '';
        }
    }

    getVoteClass(vote: string): string {
        switch(vote) {
            case 'POUR': return 'vote-pour';
            case 'CONTRE': return 'vote-contre';
            case 'PEUT_ETRE': return 'vote-peut-etre';
            default: return '';
        }
    }

    getTypeColor(type: string): string {
        const colors: { [key: string]: string } = {
            'TECHNIQUE': '#3b82f6',
            'MANAGERIAL': '#10b981',
            'RSE': '#8b5cf6',
            'SOFT_SKILLS': '#f59e0b',
            'SECURITE': '#ef4444'
        };
        return colors[type] || '#6b7280';
    }

    getPourcentageClass(pourcentage: number): string {
        if (pourcentage >= 70) return 'bg-green-500';
        if (pourcentage >= 50) return 'bg-yellow-500';
        return 'bg-red-500';
    }
}