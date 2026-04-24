// C:\pi\RH-APPLICATION-FRONTEND\src\app\modules\admin\apps\calendar\components\propositions-admin\propositions-admin.component.ts

import { Component, OnInit } from '@angular/core';
import { AdminPropositionService, Proposition } from '../admin-proposition.service';
import { DialogService } from '../../../../../core/services/dialog.service';

@Component({
    selector: 'app-propositions-admin',
    templateUrl: './propositions-admin.component.html',
    styleUrls: ['./propositions-admin.component.scss']
})
export class PropositionsAdminComponent implements OnInit {
    
    propositionsEnAttente: Proposition[] = [];
    propositionsValidees: Proposition[] = [];
    propositionsVoteOuvert: Proposition[] = [];
    stats: any = {};
    isLoading = false;
    adminId = 'admin1';

    constructor(
        private propositionService: AdminPropositionService,
        private dialogService: DialogService
    ) {}

    ngOnInit(): void {
        this.loadAllData();
    }

    loadAllData(): void {
        this.isLoading = true;
        this.loadPropositionsEnAttente();
        this.loadPropositionsValidees();
        this.loadStats();
    }

    loadPropositionsEnAttente(): void {
        this.propositionService.getPropositionsEnAttente().subscribe({
            next: (data) => {
                this.propositionsEnAttente = data;
                this.isLoading = false;
            },
            error: (err) => console.error(err)
        });
    }

    loadPropositionsValidees(): void {
        this.propositionService.getPropositionsValidees().subscribe({
            next: (data) => {
                this.propositionsValidees = data;
                // Charger les stats de vote pour chaque proposition validée
                this.propositionsValidees.forEach(p => {
                    this.loadVoteStats(p.id);
                });
            },
            error: (err) => console.error(err)
        });
    }

    loadVoteStats(propositionId: string): void {
        this.propositionService.getStatsVote(propositionId).subscribe({
            next: (stats) => {
                const proposition = this.propositionsValidees.find(p => p.id === propositionId);
                if (proposition) {
                    proposition.totalVotes = stats.totalVotes;
                    proposition.votesPour = stats.votesPour;
                    proposition.votesContre = stats.votesContre;
                    proposition.pourcentagePour = stats.pourcentagePour;
                    proposition.seuilMinimum = stats.seuilMinimum;
                    proposition.dateFinVote = stats.dateFinVote;
                    proposition.statutVote = stats.statutVote;
                    proposition.votesDetails = stats.votesDetails;
                }
            },
            error: (err) => console.error(err)
        });
    }

    loadStats(): void {
        this.propositionService.getStats().subscribe({
            next: (data) => this.stats = data,
            error: (err) => console.error(err)
        });
    }

    genererPropositionsIA(): void {
        this.dialogService.confirm({
            title: 'Générer des propositions IA',
            message: 'Voulez-vous générer de nouvelles propositions de formation basées sur les tendances du marché ?',
            confirmText: 'Générer',
            cancelText: 'Annuler',
            type: 'info'
        }).subscribe(confirmed => {
            if (confirmed) {
                this.isLoading = true;
                this.propositionService.genererPropositionsIA().subscribe({
                    next: () => {
                        this.dialogService.alert({
                            title: 'Succès',
                            message: 'Propositions générées avec succès !',
                            type: 'success',
                            confirmText: 'Fermer'
                        });
                        this.loadPropositionsEnAttente();
                        this.isLoading = false;
                    },
                    error: (err) => {
                        console.error(err);
                        this.isLoading = false;
                    }
                });
            }
        });
    }

    validerProposition(proposition: Proposition): void {
        this.dialogService.confirm({
            title: 'Valider la proposition',
            message: `Souhaitez-vous valider la formation "${proposition.titre}" ?`,
            confirmText: 'Valider',
            cancelText: 'Annuler',
            type: 'confirm'
        }).subscribe(confirmed => {
            if (confirmed) {
                this.propositionService.validerProposition(proposition.id, this.adminId, 'Formation pertinente').subscribe({
                    next: () => {
                        this.dialogService.alert({
                            title: 'Proposition validée',
                            message: 'Vous pouvez maintenant ouvrir le vote pour cette formation.',
                            type: 'success',
                            confirmText: 'Fermer'
                        });
                        this.loadAllData();
                    },
                    error: (err) => console.error(err)
                });
            }
        });
    }

    rejeterProposition(proposition: Proposition): void {
        this.dialogService.prompt({
            title: 'Rejeter la proposition',
            message: `Pourquoi rejetez-vous la formation "${proposition.titre}" ?`,
            confirmText: 'Rejeter',
            cancelText: 'Annuler',
            type: 'warning'
        }).subscribe(result => {
            if (result && result.value) {
                this.propositionService.rejeterProposition(proposition.id, this.adminId, result.value).subscribe({
                    next: () => {
                        this.dialogService.alert({
                            title: 'Proposition rejetée',
                            message: 'La proposition a été rejetée.',
                            type: 'success',
                            confirmText: 'Fermer'
                        });
                        this.loadAllData();
                    },
                    error: (err) => console.error(err)
                });
            }
        });
    }

    ouvrirVote(proposition: Proposition): void {
        this.dialogService.prompt({
            title: 'Ouvrir le vote',
            message: `Durée du vote (en jours) :\nSeuil minimum de votes :`,
            fields: [
                { name: 'dureeJours', label: 'Durée (jours)', type: 'number', defaultValue: 7 },
                { name: 'seuilMinimum', label: 'Seuil minimum de votes', type: 'number', defaultValue: 5 }
            ]
        }).subscribe(result => {
            if (result) {
                this.propositionService.ouvrirVote(proposition.id, result.dureeJours, result.seuilMinimum).subscribe({
                    next: () => {
                        this.dialogService.alert({
                            title: 'Vote ouvert',
                            message: `Le vote est maintenant ouvert pour ${result.dureeJours} jours.`,
                            type: 'success',
                            confirmText: 'Fermer'
                        });
                        this.loadAllData();
                    },
                    error: (err) => console.error(err)
                });
            }
        });
    }

    cloturerVote(proposition: Proposition): void {
        this.dialogService.confirm({
            title: 'Clôturer le vote',
            message: `Voulez-vous clôturer le vote pour "${proposition.titre}" ?\nRésultat actuel: ${proposition.pourcentagePour}% pour`,
            confirmText: 'Clôturer',
            cancelText: 'Annuler',
            type: 'confirm'
        }).subscribe(confirmed => {
            if (confirmed) {
                this.propositionService.cloturerVote(proposition.id).subscribe({
                    next: () => {
                        this.dialogService.alert({
                            title: 'Vote clôturé',
                            message: `Le vote est clôturé. ${proposition.pourcentagePour}% des employés sont pour.`,
                            type: 'success',
                            confirmText: 'Fermer'
                        });
                        this.loadAllData();
                    },
                    error: (err) => console.error(err)
                });
            }
        });
    }

    publierFormation(proposition: Proposition): void {
        this.dialogService.confirm({
            title: 'Publier la formation',
            message: `Voulez-vous créer et publier la formation "${proposition.titre}" ?\n\n📊 Résultats du vote:\n• ${proposition.votesPour} votes pour\n• ${proposition.votesContre} votes contre\n• Taux: ${proposition.pourcentagePour}%`,
            confirmText: 'Publier',
            cancelText: 'Annuler',
            type: 'confirm'
        }).subscribe(confirmed => {
            if (confirmed) {
                this.propositionService.publierFormation(proposition.id).subscribe({
                    next: (response) => {
                        this.dialogService.alert({
                            title: 'Formation publiée !',
                            message: `La formation "${proposition.titre}" a été ajoutée au catalogue.`,
                            type: 'success',
                            confirmText: 'Fermer'
                        });
                        this.loadAllData();
                    },
                    error: (err) => console.error(err)
                });
            }
        });
    }

    getStatutLabel(statut: string): string {
        const labels: {[key: string]: string} = {
            'EN_ATTENTE_VALIDATION': '⏳ En attente',
            'VALIDEE': '✅ Validée',
            'REJETEE': '❌ Rejetée',
            'PROGRAMMEE': '📅 Programmée'
        };
        return labels[statut] || statut;
    }

    getStatutVoteLabel(statutVote: string): string {
        const labels: {[key: string]: string} = {
            'OUVERT': '🔓 Vote ouvert',
            'CLOTURE': '🔒 Vote clos',
            'EN_COURS': '⏳ En cours'
        };
        return labels[statutVote] || '⚪ Non démarré';
    }

    getPourcentageClass(pourcentage: number): string {
        if (pourcentage >= 70) return 'bg-green-500';
        if (pourcentage >= 50) return 'bg-yellow-500';
        return 'bg-red-500';
    }
}