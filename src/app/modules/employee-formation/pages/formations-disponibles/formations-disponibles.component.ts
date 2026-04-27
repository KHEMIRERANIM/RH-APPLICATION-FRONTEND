// C:\pi\RH-APPLICATION-FRONTEND\src\app\modules\employee\pages\formations-disponibles\formations-disponibles.component.ts

import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { EmployeeFormationService } from '../../services/employee-formation.service';
import { Formation } from '../../../../shared/models/formation.model';
import { DialogService } from '../../../../core/services/dialog.service';
import { MatDialog } from '@angular/material/dialog';
import { UserService } from '../../../../core/user/user.service';
import { User } from '../../../../core/user/user.types';
import { Router } from '@angular/router';
import { FormateurService } from '../../formateurs/formateur.service';
import { StripeService } from '../../services/stripe.service';
import { BuyPointsDialogComponent } from '../../components/Payment/buy-points-dialog.component';
import { VotePropositionService, Proposition } from '../../services/vote-proposition.service';

// ✅ Chemin correct pour le service de recommandation
import { RecommendationService, PersonalizedRecommendation } from '../../../admin/apps/calendar/recommendation.service';

@Component({
    selector: 'app-formations-disponibles',
    templateUrl: './formations-disponibles.component.html',
    styleUrls: ['./formations-disponibles.component.scss']
})
export class FormationsDisponiblesComponent implements OnInit {
    formations: Formation[] = [];
    filteredFormations: Formation[] = [];
    recommendedFormations: Formation[] = [];
    parcoursFormations: Formation[] = [];
    mesFormationsAnimateur: Formation[] = [];
    loading = false;
    searchKeyword = '';
    selectedType = '';
    isLoggedIn: boolean = false;
    userRole: string | null = null;
    userInscriptions: Set<string> = new Set();
    userFormationsCompleted: Set<string> = new Set();
    userPoste: string = '';
    userName: string = '';
    currentUser: User | null = null;

    // Points
    userPoints: number = 0;
    coutFormation: number = 1000;
    isLoadingPoints: boolean = false;

    // Formateur
    isFormateurFlag: boolean = false;
    showPaymentModal: boolean = false;
    selectedPoints: number = 0;
    selectedAmount: number = 0;

    // ========== RECOMMANDATIONS IA ==========
    personalizedRecommendation: PersonalizedRecommendation | null = null;
    isLoadingRecommendations: boolean = false;
    recommendationsBadgeCount: number = 0;

    types = [
        { value: 'TECHNIQUE', label: 'Technique', color: '#3b82f6', icon: '' },
        { value: 'MANAGERIAL', label: 'Managerial', color: '#10b981', icon: '' },
        { value: 'RSE', label: 'RSE', color: '#8b5cf6', icon: '' },
        { value: 'SOFT_SKILLS', label: 'Soft Skills', color: '#f59e0b', icon: '' },
        { value: 'SECURITE', label: 'Sécurité', color: '#ef4444', icon: '' },
        { value: 'OBLIGATOIRE', label: 'Obligatoire', color: '#6366f1', icon: '' }
    ];

    categoriesParPoste: { [key: string]: string[] } = {
        'Développeur Full Stack': ['TECHNIQUE', 'SOFT_SKILLS', 'SECURITE'],
        'Développeur Frontend': ['TECHNIQUE', 'SOFT_SKILLS'],
        'Développeur Backend': ['TECHNIQUE', 'SECURITE'],
        'Développeur Mobile': ['TECHNIQUE', 'SOFT_SKILLS'],
        'Développeur Java': ['TECHNIQUE', 'SECURITE'],
        'Développeur Python': ['TECHNIQUE', 'SOFT_SKILLS'],
        'Data Scientist': ['TECHNIQUE', 'RSE', 'SOFT_SKILLS'],
        'Data Analyst': ['TECHNIQUE', 'SOFT_SKILLS'],
        'Data Engineer': ['TECHNIQUE', 'SECURITE'],
        'DevOps Engineer': ['TECHNIQUE', 'SECURITE'],
        'Cloud Architect': ['TECHNIQUE', 'SECURITE'],
        'Chef de Projet': ['MANAGERIAL', 'SOFT_SKILLS', 'SECURITE'],
        'Scrum Master': ['MANAGERIAL', 'SOFT_SKILLS'],
        'Product Owner': ['MANAGERIAL', 'SOFT_SKILLS'],
        'Responsable RH': ['MANAGERIAL', 'RSE', 'SOFT_SKILLS', 'SECURITE'],
        'Recruteur': ['MANAGERIAL', 'SOFT_SKILLS'],
        'Responsable Marketing': ['MANAGERIAL', 'SOFT_SKILLS', 'RSE'],
        'Commercial': ['SOFT_SKILLS', 'MANAGERIAL'],
        'Comptable': ['TECHNIQUE', 'SOFT_SKILLS'],
        'Contrôleur de Gestion': ['TECHNIQUE', 'MANAGERIAL'],
        'Technicien Support': ['TECHNIQUE', 'SECURITE', 'SOFT_SKILLS'],
        'Assistant Administratif': ['SOFT_SKILLS', 'MANAGERIAL'],
        'default': ['SOFT_SKILLS', 'MANAGERIAL', 'RSE', 'OBLIGATOIRE']
    };

    private posteIcons: { [key: string]: string } = {
        'Développeur Full Stack': '💻',
        'Développeur Frontend': '🎨',
        'Développeur Backend': '⚙️',
        'Développeur Mobile': '📱',
        'Développeur Java': '☕',
        'Développeur Python': '🐍',
        'Data Scientist': '📊',
        'Data Analyst': '📈',
        'Data Engineer': '🏗️',
        'DevOps Engineer': '',
        'Cloud Architect': '☁️',
        'Chef de Projet': '📋',
        'Scrum Master': '🔄',
        'Product Owner': '🎯',
        'Responsable RH': '👥',
        'Recruteur': '🔍',
        'Responsable Marketing': '📢',
        'Commercial': '🤝',
        'Comptable': '💰',
        'Contrôleur de Gestion': '📉',
        'Technicien Support': '🔧',
        'Assistant Administratif': '📎',
        'default': '👤'
    };

    constructor(
        private formationService: EmployeeFormationService,
        private userService: UserService,
        private snackBar: MatSnackBar,
        private dialogService: DialogService,
        private router: Router,
        private formateurService: FormateurService,
        private stripeService: StripeService,
        private dialog: MatDialog,
        private recommendationService: RecommendationService,
        private voteService: VotePropositionService

    ) { }

    ngOnInit(): void {
        this.checkAuthStatus();
        this.loadFormations();
        this.loadCurrentUser();
        if (this.isLoggedIn) {
            this.loadUserInscriptions();
            this.loadUserPoints();
            this.loadPersonalizedRecommendations();
            this.loadPropositionsVote(); // ← Ajoutez cette ligne

        }
    }

    // ========== MÉTHODES RECOMMANDATIONS ==========

    loadPersonalizedRecommendations(): void {
        this.isLoadingRecommendations = true;
        const employeId = this.getCurrentUserId();

        if (!employeId) {
            this.isLoadingRecommendations = false;
            return;
        }

        this.recommendationService.getPersonalizedRecommendations(employeId).subscribe({
            next: (recommendation) => {
                this.personalizedRecommendation = recommendation;
                this.recommendationsBadgeCount = recommendation.suggestionsFormations?.length || 0;
                this.isLoadingRecommendations = false;
                console.log(' Recommandations IA chargées:', recommendation);
            },
            error: (err) => {
                console.error('❌ Erreur chargement recommandations:', err);
                this.isLoadingRecommendations = false;
                this.loadMockRecommendations();
            }
        });
    }

    loadMockRecommendations(): void {
        this.personalizedRecommendation = {
            employeId: this.getCurrentUserId(),
            technologiesConnues: ['Java', 'Spring Boot', 'Angular'],
            technologiesRecommandees: ['LangChain', 'RAG', 'Kubernetes'],
            prochainNiveau: 'INTERMÉDIAIRE',
            suggestionsFormations: [
                {
                    formationId: null,
                    titre: 'Introduction à LangChain pour les LLM',
                    description: 'Apprenez à construire des applications IA avec LangChain',
                    score: 92,
                    raison: 'Technologie émergente'
                },
                {
                    formationId: null,
                    titre: 'Kubernetes pour développeurs Spring',
                    description: 'Déployez vos applications en production',
                    score: 85,
                    raison: 'Demande du marché'
                }
            ]
        };
        this.recommendationsBadgeCount = this.personalizedRecommendation.suggestionsFormations.length;
    }

    getTopRecommendations(limit: number = 2): any[] {
        if (!this.personalizedRecommendation?.suggestionsFormations) return [];
        return this.personalizedRecommendation.suggestionsFormations.slice(0, limit);
    }

    getTechGaps(): string[] {
        if (!this.personalizedRecommendation?.technologiesRecommandees) return [];
        return this.personalizedRecommendation.technologiesRecommandees.slice(0, 4);
    }

    getNextLevel(): string {
        return this.personalizedRecommendation?.prochainNiveau || 'DÉBUTANT';
    }

    getNextLevelClass(): string {
        const level = this.getNextLevel().toLowerCase();
        switch (level) {
            case 'expert': return 'text-purple-600';
            case 'intermédiaire': return 'text-orange-600';
            default: return 'text-blue-600';
        }
    }

    getCompetenceScore(): number {
        const connues = this.personalizedRecommendation?.technologiesConnues?.length || 0;
        const recommandees = this.personalizedRecommendation?.technologiesRecommandees?.length || 0;
        const total = connues + recommandees;
        if (total === 0) return 50;
        return Math.round((connues / total) * 100);
    }

    suggestFormation(tech: string): void {
        this.dialogService.confirm({
            title: 'Proposer une formation',
            message: `Souhaitez-vous proposer une formation sur "${tech}" à votre responsable RH ?`,
            confirmText: 'Proposer',
            cancelText: 'Annuler',
            type: 'info'
        }).subscribe(confirmed => {
            if (confirmed) {
                this.dialogService.alert({
                    title: 'Proposition envoyée',
                    message: `Votre demande de formation sur "${tech}" a été transmise au service RH.`,
                    type: 'success',
                    confirmText: 'Fermer'
                });
            }
        });
    }

    openRecommendationsPage(): void {
        this.router.navigate(['/employee/recommendations']);
    }

    // ========== MÉTHODES EXISTANTES (à garder) ==========

    trackByFn(index: number, item: any): any {
        return item.id || index;
    }

    checkAuthStatus(): void {
        this.isLoggedIn = !!localStorage.getItem('userId');
        this.userRole = localStorage.getItem('userRole');

        if (!this.userRole && localStorage.getItem('currentUser')) {
            try {
                const currentUser = JSON.parse(localStorage.getItem('currentUser')!);
                if (currentUser.role) {
                    this.userRole = currentUser.role;
                    localStorage.setItem('userRole', this.userRole);
                }
            } catch (e) { }
        }

        if (this.isLoggedIn && !this.userRole) {
            this.userRole = 'EMPLOYE';
            localStorage.setItem('userRole', 'EMPLOYE');
        }
    }

    loadCurrentUser(): void {
        const savedPoste = localStorage.getItem('userPoste');
        const savedName = localStorage.getItem('userName');
        if (savedPoste) { this.userPoste = savedPoste; }
        if (savedName) { this.userName = savedName; }

        this.userService.get().subscribe({
            next: (user) => {
                this.currentUser = user;
                if (user.poste) {
                    this.userPoste = user.poste;
                    localStorage.setItem('userPoste', user.poste);
                }
                const fullName = [user.prenom, user.nom].filter(Boolean).join(' ') || user.name || user.email || '';
                if (fullName) {
                    this.userName = fullName;
                    localStorage.setItem('userName', fullName);
                }
                if (user.id && localStorage.getItem('userId') !== user.id) {
                    localStorage.setItem('userId', user.id);
                }
                this.filterFormationsByPoste();
                if (this.isLoggedIn) {
                    this.checkIfFormateur();
                }
            },
            error: (err) => {
                console.warn('Erreur chargement user:', err);
                this.filterFormationsByPoste();
            }
        });
    }

    getCurrentUserId(): string {
        let userId = localStorage.getItem('userId');
        const currentUserStr = localStorage.getItem('currentUser');
        if (currentUserStr) {
            try {
                const currentUser = JSON.parse(currentUserStr);
                if (currentUser.id) userId = currentUser.id;
            } catch (e) { }
        }
        return userId || '1';
    }

    checkIfFormateur(): void {
        const userId = localStorage.getItem('userId');
        const currentUserStr = localStorage.getItem('currentUser');
        const email = currentUserStr ? JSON.parse(currentUserStr).email : null;

        if (!userId && !email) return;

        this.formateurService.getFormateurs().subscribe({
            next: (formateurs) => {
                const formateur = formateurs.find(f =>
                    f.userId === userId || (email && f.email === email)
                );
                this.isFormateurFlag = !!formateur;
            },
            error: (err) => {
                console.error('Erreur vérification formateur:', err);
                this.isFormateurFlag = false;
            }
        });
    }

    loadUserPoints(): void {
        let userId = this.getCurrentUserId();

        if (!userId) {
            this.userPoints = 0;
            return;
        }

        this.isLoadingPoints = true;

        this.userService.getUserPoints(userId).subscribe({
            next: (response: any) => {
                this.userPoints = response.solde || response || 0;
                this.isLoadingPoints = false;
            },
            error: (err) => {
                console.error('Erreur chargement points:', err);
                this.userPoints = 1000;
                this.isLoadingPoints = false;
            }
        });
    }

    refreshUserPoints(): void {
        let userId = this.getCurrentUserId();
        if (userId) {
            this.userService.getUserPoints(userId).subscribe({
                next: (response: any) => {
                    this.userPoints = response.solde || response || 0;
                },
                error: (err) => console.error('Erreur refresh points:', err)
            });
        }
    }

    loadUserInscriptions(): void {
        let employeId = this.getCurrentUserId();

        if (employeId) {
            this.formationService.getMesInscriptions(employeId).subscribe({
                next: (inscriptions) => {
                    this.userInscriptions = new Set(inscriptions.map(i => i.formationId));
                    this.userFormationsCompleted = new Set(
                        inscriptions.filter(i => i.statut === 'CONFIRME' || i.statut === 'TERMINE')
                            .map(i => i.formationId)
                    );
                    this.filterFormationsByPoste();
                },
                error: (err) => console.error('Erreur inscriptions:', err)
            });
        }
    }

    loadFormations(): void {
        this.loading = true;
        this.formationService.getFormationsDisponibles().subscribe({
            next: (formations) => {
                this.formations = formations;
                this.filterFormationsByPoste();
                this.chargerMesFormationsAnimateur();
                this.loading = false;
            },
            error: (err) => {
                console.error('Erreur chargement:', err);
                this.loading = false;
            }
        });
    }

    chargerMesFormationsAnimateur(): void {
        this.mesFormationsAnimateur = this.formations.filter(formation =>
            this.estFormateurDeLaFormation(formation)
        );
    }

    estFormateurDeLaFormation(formation: Formation): boolean {
        if (!this.isLoggedIn || !this.isFormateur()) return false;
        const formateurConnecte = this.getNomEmploye();
        return formation.formateur === formateurConnecte;
    }

    filterFormationsByPoste(): void {
        const allowedTypes: string[] = this.categoriesParPoste[this.userPoste] ?? this.categoriesParPoste['default'];

        const disponibles = this.formations.filter(f =>
            allowedTypes.includes(f.type) && !this.estDejaInscrit(f.id!)
        );

        const prioritaires = allowedTypes.slice(0, Math.ceil(allowedTypes.length / 2));
        this.recommendedFormations = disponibles.filter(f => prioritaires.includes(f.type));

        const secondaires = allowedTypes.slice(Math.ceil(allowedTypes.length / 2));
        this.parcoursFormations = disponibles.filter(f => secondaires.includes(f.type));

        this.filteredFormations = disponibles;
    }

    getCategoriesPoste(): string[] {
        return this.categoriesParPoste[this.userPoste] ?? this.categoriesParPoste['default'];
    }

    estDejaInscrit(formationId: string): boolean {
        return this.userInscriptions.has(formationId);
    }

    prerequisSatisfait(formation: Formation): boolean {
        if (!formation.prerequisFormationId) return true;
        return this.userFormationsCompleted.has(formation.prerequisFormationId);
    }

    getTitrePrerequisManquant(formation: Formation): string {
        if (!formation.prerequisFormationId) return '';
        return formation.prerequisFormationTitre
            || this.formations.find(f => f.id === formation.prerequisFormationId)?.titre
            || 'Formation prérequise';
    }

    estDateLimiteDepassee(dateLimiteInscription: Date | undefined): boolean {
        if (!dateLimiteInscription) return false;
        return new Date() > new Date(dateLimiteInscription);
    }

    goToMesInscriptions(): void {
        this.router.navigate(['/employee/mes-inscriptions']);
    }

    inscriptionPossible(formation: Formation): boolean {
        if (!this.isLoggedIn || this.userRole !== 'EMPLOYE') return false;
        if (this.estDejaInscrit(formation.id!)) return false;
        if (formation.placesDisponibles <= 0) return false;
        if (this.estDateLimiteDepassee(formation.dateLimiteInscription)) return false;
        if (!this.prerequisSatisfait(formation)) return false;
        if (this.userPoints < this.coutFormation) return false;
        return true;
    }

    getStatutInscription(formation: Formation): string {
        if (!this.isLoggedIn || this.userRole !== 'EMPLOYE') return 'CONNEXION_REQUISE';
        if (this.estDejaInscrit(formation.id!)) return 'DEJA_INSCRIT';
        if (this.userPoints < this.coutFormation) return 'POINTS_INSUFFISANTS';
        if (!this.prerequisSatisfait(formation)) return 'PREREQUIS_MANQUANT';
        if (formation.placesDisponibles <= 0) return 'COMPLET';
        if (this.estDateLimiteDepassee(formation.dateLimiteInscription)) return 'DATE_LIMITE_DEPASSEE';
        return 'DISPONIBLE';
    }

    applyFilters(): void {
        const allowedTypes = this.categoriesParPoste[this.userPoste] ?? this.categoriesParPoste['default'];

        let result = this.formations.filter(f =>
            f.active !== false && allowedTypes.includes(f.type) && !this.estDejaInscrit(f.id!)
        );

        if (this.selectedType) {
            result = result.filter(f => f.type === this.selectedType);
        }

        if (this.searchKeyword && this.searchKeyword.trim()) {
            const keyword = this.searchKeyword.toLowerCase().trim();
            result = result.filter(f =>
                f.titre.toLowerCase().includes(keyword) ||
                (f.description && f.description.toLowerCase().includes(keyword)) ||
                (f.formateur && f.formateur.toLowerCase().includes(keyword))
            );
        }

        this.filteredFormations = result;

        const middleIndex = Math.ceil(allowedTypes.length / 2);
        this.recommendedFormations = result.filter(f => allowedTypes.slice(0, middleIndex).includes(f.type));
        this.parcoursFormations = result.filter(f => allowedTypes.slice(middleIndex).includes(f.type));
    }

    onSearch(): void { this.applyFilters(); }
    onTypeChange(): void { this.applyFilters(); }

    resetFilters(): void {
        this.searchKeyword = '';
        this.selectedType = '';
        this.filterFormationsByPoste();
    }

    copierLien(lien: string): void {
        navigator.clipboard.writeText(lien).then(
            () => this.snackBar.open('Lien copié !', 'Fermer', { duration: 2000 }),
            () => this.snackBar.open('Erreur lors de la copie', 'Fermer', { duration: 2000 })
        );
    }

    async inscrire(formation: Formation): Promise<void> {
        let employeId = this.getCurrentUserId();

        if (!this.inscriptionPossible(formation)) {
            const statut = this.getStatutInscription(formation);
            const messages: { [k: string]: string } = {
                'CONNEXION_REQUISE': 'Veuillez vous connecter en tant qu\'employé pour vous inscrire.',
                'DEJA_INSCRIT': 'Vous êtes déjà inscrit à cette formation.',
                'PREREQUIS_MANQUANT': `Vous devez d'abord compléter la formation "${this.getTitrePrerequisManquant(formation)}" avant de vous inscrire à celle-ci.`,
                'COMPLET': 'Cette formation n\'a plus de places disponibles.',
                'DATE_LIMITE_DEPASSEE': 'La date limite d\'inscription est dépassée.',
                'POINTS_INSUFFISANTS': `Points insuffisants. Vous avez ${this.userPoints} points, besoin de ${this.coutFormation} points.`
            };
            this.dialogService.alert({
                title: 'Inscription impossible',
                message: messages[statut] || 'Action non autorisée.',
                type: 'warning',
                confirmText: 'Fermer'
            });
            return;
        }

        const confirmed = await this.dialogService.confirm({
            title: 'Confirmation d\'inscription',
            message: `Souhaitez-vous vous inscrire à la formation "${formation.titre}" ?\n\nCoût: ${this.coutFormation} points (Solde actuel: ${this.userPoints} points)`,
            confirmText: 'S\'inscrire',
            cancelText: 'Annuler',
            type: 'confirm'
        }).toPromise();

        if (confirmed && employeId) {
            this.formationService.inscrire(formation.id!, employeId).subscribe({
                next: () => {
                    this.dialogService.alert({
                        title: 'Inscription réussie !',
                        message: `Vous êtes inscrit à la formation "${formation.titre}".\n\nPoints restants: ${this.userPoints - this.coutFormation}`,
                        type: 'success',
                        confirmText: 'Fermer'
                    });
                    this.loadUserInscriptions();
                    this.loadFormations();
                    this.refreshUserPoints();
                },
                error: (err) => {
                    console.error('Erreur inscription:', err);
                    this.dialogService.alert({
                        title: 'Échec de l\'inscription',
                        message: err.error?.message || 'Une erreur est survenue lors de l\'inscription.',
                        type: 'error',
                        confirmText: 'Fermer'
                    });
                }
            });
        }
    }

    getTypeColor(type: string): string {
        return this.types.find(t => t.value === type)?.color || '#6b7280';
    }

    getTypeIcon(type: string): string {
        return this.types.find(t => t.value === type)?.icon || '📚';
    }

    getPlaceColor(placesDisponibles: number, nombrePlaces: number): string {
        const taux = (nombrePlaces - placesDisponibles) / nombrePlaces;
        if (taux >= 0.9) return '#ef4444';
        if (taux >= 0.7) return '#f59e0b';
        return '#10b981';
    }

    getNomPoste(): string { return this.userPoste || 'professionnel'; }
    getNomEmploye(): string { return this.userName || 'Employé'; }
    getInitiale(): string { return this.userName ? this.userName.charAt(0).toUpperCase() : 'E'; }
    getPosteIcon(): string { return this.posteIcons[this.userPoste] || this.posteIcons['default']; }

    getCategoriesPourPoste(poste: string): string[] {
        return this.categoriesParPoste[poste] ?? this.categoriesParPoste['default'];
    }

    getTousLesPostes(): string[] {
        return Object.keys(this.categoriesParPoste).filter(p => p !== 'default');
    }

    isFormateur(): boolean {
        return this.isFormateurFlag;
    }

    goToMesFormationsFormateur(): void {
        this.router.navigate(['/employee/mes-formations-formateur']);
    }

    openPayment(points: number, amount: number) {
        const userId = this.getCurrentUserId();
        if (!userId) {
            this.snackBar.open('Veuillez vous connecter', 'Fermer', { duration: 3000 });
            return;
        }

        this.selectedPoints = points;
        this.selectedAmount = amount;
        this.showPaymentModal = true;
    }

    onPaymentSuccess(event: { points: number }) {
        this.showPaymentModal = false;
        this.refreshUserPoints();
        this.snackBar.open(`🎉 ${event.points} points ajoutés à votre compte !`, 'Fermer', { duration: 4000 });
    }

    openBuyPointsDialog() {
        const dialogRef = this.dialog.open(BuyPointsDialogComponent, {
            width: '550px',
            panelClass: 'buy-points-dialog-container',
            disableClose: true
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.openPayment(result.points, result.amount);
            }
        });
    }

    // Ajoutez ces propriétés
    propositionsVote: any[] = [];
    isLoadingVotes: boolean = false;

    // Ajoutez ces méthodes
    loadPropositionsVote(): void {
        this.isLoadingVotes = true;
        this.voteService.getPropositionsOuvertesVote().subscribe({
            next: (data) => {
                this.propositionsVote = data;
                // Vérifier pour chaque proposition si l'utilisateur a voté
                this.propositionsVote.forEach(p => {
                    this.checkIfVoted(p.id);
                    this.loadVoteStats(p.id);
                });
                this.isLoadingVotes = false;
            },
            error: (err) => {
                console.error('Erreur chargement votes:', err);
                this.isLoadingVotes = false;
            }
        });
    }

    checkIfVoted(propositionId: string): void {
        this.voteService.hasEmployeVoted(propositionId).subscribe({
            next: (data) => {
                const proposition = this.propositionsVote.find(p => p.id === propositionId);
                if (proposition) {
                    proposition.aVote = data.aVote;
                }
            },
            error: (err) => console.error(err)
        });
    }

    loadVoteStats(propositionId: string): void {
        this.voteService.getStatsVote(propositionId).subscribe({
            next: (data) => {
                const proposition = this.propositionsVote.find(p => p.id === propositionId);
                if (proposition) {
                    proposition.votesPour = data.votesPour;
                    proposition.votesContre = data.votesContre;
                    proposition.pourcentagePour = data.pourcentagePour;
                    proposition.totalVotes = data.totalVotes;
                }
            },
            error: (err) => console.error(err)
        });
    }

    voterProposition(propositionId: string, vote: string): void {
        this.voteService.voter(propositionId, vote, '').subscribe({
            next: () => {
                this.dialogService.alert({
                    title: 'Vote enregistré',
                    message: 'Merci pour votre participation !',
                    type: 'success',
                    confirmText: 'Fermer'
                });
                this.loadPropositionsVote();
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

    // Appelez loadPropositionsVote() dans ngOnInit()

}