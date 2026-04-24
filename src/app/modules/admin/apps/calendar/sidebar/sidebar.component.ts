// C:\pi\RH-APPLICATION-FRONTEND\src\app\modules\admin\apps\calendar\sidebar\sidebar.component.ts

import { Component, EventEmitter, Output, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormationService } from '../../../../../services/formation.service';
import { AvisService } from '../../../../employee-formation/services/avis.service';
import { FormationStats } from '../../../../../shared/models/formation.model';
import { DialogService } from '../../../../../core/services/dialog.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../../environments/environment';
import { RecommendationService, TechnologyRecommendation } from '../recommendation.service';

interface PropositionVote {
    id: string;
    titre: string;
    description: string;
    type: string;
    statutVote: string;
    pourcentagePour: number;
    totalVotes: number;
    votesPour: number;
    votesContre: number;
    dateFinVote: Date;
}

@Component({
    selector: 'calendar-sidebar',
    templateUrl: './sidebar.component.html',
    styleUrls: ['./sidebar.component.scss']
})
export class CalendarSidebarComponent implements OnInit {
    @Output() calendarUpdated = new EventEmitter<void>();
    @Output() formationSelected = new EventEmitter<string>();
    
    stats: FormationStats = {
        total: 0,
        actives: 0,
        inactives: 0,
        parType: {},
        placesTotales: 0,
        placesDisponibles: 0,
        placesOccupees: 0,
        tauxRemplissage: 0
    };

    formationsTerminees: any[] = [];
    avisEnAttente: any[] = [];
    avisValides: any[] = [];
    selectedFormation: any = null;
    showAvisDetail: boolean = false;
    
    // ========== RECOMMANDATIONS IA ==========
    technologyRecommendations: TechnologyRecommendation[] = [];
    isLoadingRecommendations: boolean = false;
    
    // ========== PROPOSITIONS AVEC VOTES ==========
    propositionsVote: PropositionVote[] = [];
    isLoadingVotes: boolean = false;
    adminId = 'admin1';

    constructor(
        private formationService: FormationService,
        private avisService: AvisService,
        private dialogService: DialogService,
        private router: Router,
        private http: HttpClient,
        private recommendationService: RecommendationService
    ) { }

    ngOnInit(): void {
        this.loadStats();
        this.loadFormationsTerminees();
        this.loadAvisEnAttente();
        this.loadRecommendations();
        this.loadPropositionsVote();
    }

    // ========== RECOMMANDATIONS IA ==========
    
    loadRecommendations(): void {
        this.isLoadingRecommendations = true;
        this.recommendationService.getTechnologyRecommendations().subscribe({
            next: (data) => {
                this.technologyRecommendations = data;
                this.isLoadingRecommendations = false;
            },
            error: (err) => {
                console.error('Erreur chargement recommandations:', err);
                this.isLoadingRecommendations = false;
                // Données mock pour test
                this.technologyRecommendations = [
                    { technologie: 'LangChain', score: 92, source: 'GitHub Trends', priorite: 'HAUTE', suggestionsFormations: ['Formation LangChain'] },
                    { technologie: 'RAG', score: 88, source: 'ArXiv', priorite: 'HAUTE', suggestionsFormations: ['Formation RAG'] },
                    { technologie: 'WebGPU', score: 75, source: 'GitHub', priorite: 'MOYENNE', suggestionsFormations: ['Formation WebGPU'] }
                ];
                this.isLoadingRecommendations = false;
            }
        });
    }

   // Remplacer la méthode creerPropositionDepuisRecommandation par :

creerPropositionDepuisRecommandation(rec: TechnologyRecommendation): void {
    this.dialogService.confirm({
        title: 'Créer une proposition',
        message: `Voulez-vous créer une proposition de formation pour "${rec.technologie}" ?\n\nScore IA: ${rec.score}%\nPriorité: ${rec.priorite}`,
        confirmText: 'Créer',
        cancelText: 'Annuler',
        type: 'info'
    }).subscribe(confirmed => {
        if (confirmed) {
            this.isLoadingRecommendations = true;
            
            // Utiliser l'endpoint existant pour générer des propositions
            // Ou appeler un endpoint POST simple
            const propositionData = {
                technologie: rec.technologie,
                titre: `Formation ${rec.technologie}`,
                description: rec.suggestionsFormations[0] || `Formation complète sur ${rec.technologie}`,
                dureeHeures: 14,
                niveau: 'INTERMEDIAIRE',
                type: 'TECHNIQUE',
                source: 'IA_RECOMMENDATION',
                scoreIA: rec.score,
                statut: 'EN_ATTENTE_VALIDATION'
            };
            
            // Essayer d'abord avec l'endpoint POST standard
            this.http.post(`${environment.apiUrl}/formations/propositions`, propositionData).subscribe({
                next: () => {
                    this.dialogService.alert({
                        title: 'Proposition créée',
                        message: `La formation "${rec.technologie}" a été ajoutée aux propositions.`,
                        type: 'success',
                        confirmText: 'Fermer'
                    });
                    this.loadPropositionsVote();
                    this.isLoadingRecommendations = false;
                },
                error: (err) => {
                    console.error('Erreur:', err);
                    // Si l'endpoint n'existe pas, afficher un message pour créer manuellement
                    this.dialogService.alert({
                        title: 'Action requise',
                        message: `Veuillez créer manuellement la proposition pour "${rec.technologie}" dans l'interface d'administration.`,
                        type: 'info',
                        confirmText: 'OK'
                    });
                    this.isLoadingRecommendations = false;
                }
            });
        }
    });
}

    // ========== PROPOSITIONS ET VOTES ==========
   loadPropositionsVote(): void {
    this.isLoadingVotes = true;
    // Récupérer TOUTES les propositions (pas seulement validées)
    this.http.get<PropositionVote[]>(`${environment.apiUrl}/formations/propositions/en-attente`).subscribe({
        next: (data) => {
            // Afficher les propositions en attente et celles avec votes
            this.propositionsVote = data;
            this.propositionsVote.forEach(p => {
                this.loadVoteStats(p.id);
            });
            this.isLoadingVotes = false;
        },
        error: (err) => {
            console.error('Erreur:', err);
            this.isLoadingVotes = false;
        }
    });
}
    loadVoteStats(propositionId: string): void {
        this.http.get(`${environment.apiUrl}/formations/propositions/${propositionId}/stats-vote`).subscribe({
            next: (stats: any) => {
                const proposition = this.propositionsVote.find(p => p.id === propositionId);
                if (proposition) {
                    proposition.totalVotes = stats.totalVotes;
                    proposition.votesPour = stats.votesPour;
                    proposition.votesContre = stats.votesContre;
                    proposition.pourcentagePour = stats.pourcentagePour;
                    proposition.dateFinVote = stats.dateFinVote;
                    proposition.statutVote = stats.statutVote;
                }
            },
            error: (err) => console.error(err)
        });
    }

    ouvrirVote(proposition: PropositionVote): void {
        const dureeJours = prompt('Durée du vote (en jours) :', '7');
        if (dureeJours) {
            this.http.post(`${environment.apiUrl}/formations/propositions/${proposition.id}/ouvrir-vote`, {
                dureeJours: parseInt(dureeJours),
                seuilMinimum: 5
            }).subscribe({
                next: () => {
                    this.dialogService.alert({
                        title: 'Vote ouvert',
                        message: `Le vote est ouvert pour ${dureeJours} jours.`,
                        type: 'success',
                        confirmText: 'Fermer'
                    });
                    this.loadPropositionsVote();
                },
                error: (err) => console.error(err)
            });
        }
    }

    cloturerVote(proposition: PropositionVote): void {
        this.dialogService.confirm({
            title: 'Clôturer le vote',
            message: `Voulez-vous clôturer le vote pour "${proposition.titre}" ?\nRésultat actuel: ${proposition.pourcentagePour}% pour`,
            confirmText: 'Clôturer',
            cancelText: 'Annuler',
            type: 'confirm'
        }).subscribe(confirmed => {
            if (confirmed) {
                this.http.post(`${environment.apiUrl}/formations/propositions/${proposition.id}/cloturer-vote`, {}).subscribe({
                    next: () => {
                        this.dialogService.alert({
                            title: 'Vote clôturé',
                            message: `Le vote est clôturé. ${proposition.pourcentagePour}% des employés sont pour.`,
                            type: 'success',
                            confirmText: 'Fermer'
                        });
                        this.loadPropositionsVote();
                    },
                    error: (err) => console.error(err)
                });
            }
        });
    }

    publierFormation(proposition: PropositionVote): void {
        this.dialogService.confirm({
            title: 'Publier la formation',
            message: `Voulez-vous créer et publier la formation "${proposition.titre}" ?\n\n📊 Résultats:\n• ${proposition.votesPour} votes pour\n• ${proposition.votesContre} votes contre\n• ${proposition.pourcentagePour}% pour`,
            confirmText: 'Publier',
            cancelText: 'Annuler',
            type: 'confirm'
        }).subscribe(confirmed => {
            if (confirmed) {
                this.http.post(`${environment.apiUrl}/formations/propositions/${proposition.id}/publier`, {}).subscribe({
                    next: () => {
                        this.dialogService.alert({
                            title: 'Formation publiée !',
                            message: `La formation a été ajoutée au catalogue.`,
                            type: 'success',
                            confirmText: 'Fermer'
                        });
                        this.loadPropositionsVote();
                        this.calendarUpdated.emit();
                    },
                    error: (err) => console.error(err)
                });
            }
        });
    }

    getStatutVoteLabel(statutVote: string): string {
        const labels: {[key: string]: string} = {
            'OUVERT': '🔓 Vote ouvert',
            'CLOTURE': '🔒 Vote clos'
        };
        return labels[statutVote] || '⚪ En attente';
    }

    getPourcentageClass(pourcentage: number): string {
        if (pourcentage >= 70) return 'bg-green-500';
        if (pourcentage >= 50) return 'bg-yellow-500';
        return 'bg-red-500';
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

    getPriorityColor(priority: string): string {
        switch(priority) {
            case 'HAUTE': return '#ef4444';
            case 'MOYENNE': return '#f59e0b';
            default: return '#10b981';
        }
    }

    // ========== MÉTHODES EXISTANTES ==========
    
    loadStats(): void {
        this.formationService.getFormationStats().subscribe({
            next: (stats) => {
                this.stats = stats;
            },
            error: (err) => console.error(err)
        });
    }

    loadFormationsTerminees(): void {
        this.formationService.getFormationsTerminees().subscribe({
            next: (formations) => {
                this.formationsTerminees = formations;
                this.formationsTerminees.forEach(formation => {
                    this.loadAvisForFormation(formation.id);
                });
            },
            error: (err) => console.error(err)
        });
    }

    loadAvisForFormation(formationId: string): void {
        this.avisService.getAvisByFormation(formationId).subscribe({
            next: (avis) => {
                const formation = this.formationsTerminees.find(f => f.id === formationId);
                if (formation) {
                    formation.avis = avis;
                    formation.stats = this.calculerStatsAvis(avis);
                }
            },
            error: (err) => console.error(err)
        });
    }

    loadAvisEnAttente(): void {
        this.avisService.getAvisEnAttente().subscribe({
            next: (avis) => {
                this.avisEnAttente = avis;
            },
            error: (err) => console.error(err)
        });
    }

    calculerStatsAvis(avis: any[]): any {
        const valides = avis.filter(a => a.valide);
        const enAttente = avis.filter(a => !a.valide);
        const moyenne = valides.length > 0 
            ? valides.reduce((sum, a) => sum + a.note, 0) / valides.length 
            : 0;
        
        return {
            total: avis.length,
            valides: valides.length,
            enAttente: enAttente.length,
            moyenne: Math.round(moyenne * 10) / 10,
            repartition: this.calculerRepartitionNotes(valides)
        };
    }

    calculerRepartitionNotes(avis: any[]): { [key: number]: number } {
        const repartition: { [key: number]: number } = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0};
        avis.forEach(a => {
            if (a.note >= 1 && a.note <= 5) {
                repartition[a.note]++;
            }
        });
        return repartition;
    }

    validerAvis(avisId: string): void {
        this.avisService.validerAvis(avisId).subscribe({
            next: () => {
                this.loadAvisEnAttente();
                this.loadFormationsTerminees();
                this.dialogService.alert({
                    title: 'Avis validé',
                    message: 'L\'avis a été validé avec succès.',
                    type: 'success',
                    confirmText: 'Fermer'
                });
            },
            error: (err) => console.error(err)
        });
    }

    rejeterAvis(avisId: string): void {
        this.avisService.supprimerAvis(avisId).subscribe({
            next: () => {
                this.loadAvisEnAttente();
                this.loadFormationsTerminees();
                this.dialogService.alert({
                    title: 'Avis rejeté',
                    message: 'L\'avis a été supprimé avec succès.',
                    type: 'success',
                    confirmText: 'Fermer'
                });
            },
            error: (err) => console.error(err)
        });
    }

    voirDetailsFormation(formation: any): void {
        this.selectedFormation = formation;
        this.showAvisDetail = true;
    }

    fermerDetails(): void {
        this.showAvisDetail = false;
        this.selectedFormation = null;
    }

    refreshCalendar(): void {
        this.loadStats();
        this.loadFormationsTerminees();
        this.loadAvisEnAttente();
        this.loadRecommendations();
        this.loadPropositionsVote();
        this.calendarUpdated.emit();
    }
}