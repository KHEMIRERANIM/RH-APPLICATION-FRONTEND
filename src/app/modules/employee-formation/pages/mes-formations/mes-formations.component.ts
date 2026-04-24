import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { EmployeeFormationService } from '../../services/employee-formation.service';
import { Inscription } from '../../../../shared/models/formation.model';
import { DialogService } from '../../../../core/services/dialog.service';
import { PointsService } from '../../../../core/services/points.service';
import { Router } from '@angular/router';
import { ExamenService } from '../../services/examen.service';
import { MatDialog } from '@angular/material/dialog';
import { FeedbackIaDialogComponent } from '../../components/feedback-ia-dialog/feedback-ia-dialog.component';
import { UserService } from '../../../../core/user/user.service';
import { BuyPointsDialogComponent } from '../../components/Payment/buy-points-dialog.component';

@Component({
    selector: 'app-mes-formations',
    templateUrl: './mes-formations.component.html',
    styleUrls: ['./mes-formations.component.scss']
})
export class MesFormationsComponent implements OnInit {
    inscriptions: Inscription[] = [];
    filteredInscriptions: Inscription[] = [];
    loading = false;
    selectedStatut = '';
    isLoggedIn: boolean = false;
    userRole: string | null = null;
    confirmingId: string | null = null;
    
    qrCodeData: any = null;
    loadingQRCode: boolean = false;
    
    coutFormation: number = 1000;
    examenNotes: { [key: string]: number } = {};
    downloadingCertif: { [key: string]: boolean } = {};
    certificatDejaTelecharge: { [key: string]: boolean } = {};

    statistiquesGlobales = {
        totalFormations: 0,
        formationsTerminees: 0,
        formationsEnCours: 0,
        formationsAVenir: 0,
        tauxReussiteMoyen: 0,
        pointsGagnes: 0,
        certificatsObtenus: 0,
        heuresTotal: 0
    };

    showDashboardStats = true;
    showRecommandations = true;
    showBadges = true;
    showPlanning = false;
    showNotifications = true;
    showPerformance = false;

    badges: any[] = [];
    recommandations: any[] = [];
    planningHebdo: any[] = [];
    performanceParMois: any[] = [];
    notifications: any[] = [];

    tempsRestantExercices: { [key: string]: string } = {};
    timersExercices: { [key: string]: any } = {};
    dateLimiteRendu: { [key: string]: Date } = {};

    statuts = [
        { value: 'CONFIRME', label: 'Confirmées', color: 'green' },
        { value: 'EN_ATTENTE', label: 'En attente', color: 'orange' },
        { value: 'PRESENT', label: 'Présent', color: 'emerald' },
        { value: 'ABSENT', label: 'Absent', color: 'red' },
        { value: 'TERMINE', label: 'Terminées', color: 'blue' },
        { value: 'ANNULE', label: 'Annulées', color: 'red' }
    ];

    userPoints: number = 0;
    isLoadingPoints: boolean = false;
    showBuyPointsModal: boolean = false;

    showAnnulationModal: boolean = false;
    selectedInscription: Inscription | null = null;
    annulationMotif: string = '';
    annulationTypeMotif: string = '';
    cancellingId: string | null = null;
    joursAvantDebut: number = 0;
    pointsARembourser: number = 0;

    motifs = [
        { value: 'CONFLIT_HORAIRE', label: '📅 Conflit d\'horaires', icon: '📅' },
        { value: 'MALADIE', label: '🏥 Raison médicale', icon: '🏥' },
        { value: 'URGENCE', label: '🚨 Urgence personnelle', icon: '🚨' },
        { value: 'FORMATION_NON_ADAPTEE', label: '🎯 Formation non adaptée', icon: '🎯' },
        { value: 'AUTRE', label: '📝 Autre motif', icon: '📝' }
    ];

    showPaymentModal: boolean = false;
    selectedPoints: number = 0;
    selectedAmount: number = 0;

    badgesDebloques: number = 0;
    totalBadges: number = 0;
    totalBonusPoints: number = 0;

    constructor(
        private formationService: EmployeeFormationService,
        private userService: UserService,
        private snackBar: MatSnackBar,
        private dialogService: DialogService,
        private pointsService: PointsService,
        private router: Router,
        private examenService: ExamenService,
        private dialog: MatDialog
    ) {}

    ngOnInit(): void {
        this.checkAuthStatus();
        this.loadMesInscriptions();
        this.chargerDatesLimiteExercices();
        this.loadUserPoints();

        setInterval(() => {
            if (this.inscriptions.length > 0) {
                this.mettreAJourStatutsFormationsTerminees();
                this.demarrerTimersExercices();
            }
        }, 60000);
        
        setInterval(() => {
            if (this.inscriptions.length > 0) {
                this.loadMesInscriptions();
                this.loadUserPoints();
            }
        }, 3600000);
    }

    checkAuthStatus(): void {
        this.isLoggedIn = !!localStorage.getItem('accessToken');
        this.userRole = localStorage.getItem('userRole');
    }

    trackByFn(index: number, item: any): any {
        return item.id || index;
    }

 private mettreAJourStatutsFormationsTerminees(): void {
    const maintenant = new Date();
    let modificationsEffectuees = false;

    this.inscriptions.forEach(inscription => {
        if (inscription.statut === 'ANNULE') return;

        const dateDebut = inscription.dateDebut ? new Date(inscription.dateDebut) : null;
        const dateFin = inscription.dateFin ? new Date(inscription.dateFin) : null;

        if (!dateDebut || !dateFin) return;

        // ✅ Vérifier la cohérence des dates
        if (dateFin < dateDebut) {
            console.warn(`Dates invalides pour ${inscription.formationTitre}`);
            return;
        }

        const ancienStatut = inscription.statut;

        // ✅ CAS 1: Formation terminée (date fin dépassée)
        if (dateFin < maintenant) {
            if (inscription.statut !== 'TERMINE') {
                inscription.statut = 'TERMINE';
                modificationsEffectuees = true;
                console.log(`✅ Formation ${inscription.formationTitre} : ${ancienStatut} -> TERMINE`);
            }
        } 
        // ✅ CAS 2: Formation en cours (date début passée ET date fin pas encore atteinte)
        else if (dateDebut <= maintenant && maintenant <= dateFin) {
            // Si le statut est EN_ATTENTE et la formation a commencé -> ANNULER
            if (inscription.statut === 'EN_ATTENTE') {
                inscription.statut = 'ANNULE';
                inscription.motifAnnulation = 'Non-confirmation avant le début de la formation';
                modificationsEffectuees = true;
                console.log(`❌ Formation ${inscription.formationTitre} : EN_ATTENTE -> ANNULE (non confirmée à temps)`);
            }
            // Si le statut est CONFIRME et la formation a commencé -> PRESENT
            else if (inscription.statut === 'CONFIRME') {
                inscription.statut = 'PRESENT';
                modificationsEffectuees = true;
                console.log(`✅ Formation ${inscription.formationTitre} : CONFIRME -> PRESENT`);
            }
        }
    });

    if (modificationsEffectuees) {
        this.filteredInscriptions = this.selectedStatut
            ? this.inscriptions.filter(i => i.statut === this.selectedStatut)
            : [...this.inscriptions];
        this.initAdvancedMetrics();
    }
}

isFormationEnCours(inscription: Inscription): boolean {
    // ✅ Vérification stricte : statut CONFIRME ou PRESENT
    if (inscription.statut !== 'CONFIRME' && inscription.statut !== 'PRESENT') {
        return false;
    }
    
    const maintenant = new Date();
    const dateDebut = inscription.dateDebut ? new Date(inscription.dateDebut) : null;
    const dateFin = inscription.dateFin ? new Date(inscription.dateFin) : null;
    
    if (!dateDebut || !dateFin) return false;
    
    return dateDebut <= maintenant && maintenant <= dateFin;
}
// Appelez cette méthode après chargement des inscriptions
nettoyerStatutsInvalides(): void {
    let modifie = false;
    const maintenant = new Date();
    
    this.inscriptions.forEach(inscription => {
        const dateDebut = inscription.dateDebut ? new Date(inscription.dateDebut) : null;
        const dateFin = inscription.dateFin ? new Date(inscription.dateFin) : null;
        
        // ✅ Si EN_ATTENTE et la date de début est dépassée (ou égale)
        if (inscription.statut === 'EN_ATTENTE' && dateDebut && dateDebut <= maintenant) {
            inscription.statut = 'ANNULE';
            inscription.motifAnnulation = 'Délai de confirmation dépassé - Formation non confirmée';
            modifie = true;
            console.log(`❌ Inscription ${inscription.id} annulée automatiquement (délai dépassé)`);
        }
        
        // ✅ Si CONFIRME et la formation a commencé -> PRESENT
        if (inscription.statut === 'CONFIRME' && dateDebut && dateDebut <= maintenant && dateFin && dateFin > maintenant) {
            inscription.statut = 'PRESENT';
            modifie = true;
            console.log(`✅ Inscription ${inscription.id} : CONFIRME -> PRESENT`);
        }
    });
    
    if (modifie) {
        this.filteredInscriptions = this.selectedStatut
            ? this.inscriptions.filter(i => i.statut === this.selectedStatut)
            : [...this.inscriptions];
    }
}
// Ajoutez cette méthode dans MesFormationsComponent
isDateDepassee(dateDebut: Date | string | undefined): boolean {
    if (!dateDebut) return false;
    const maintenant = new Date();
    const dateDebutObj = new Date(dateDebut);
    return dateDebutObj <= maintenant;
}
    loadMesInscriptions(): void {
        const employeId = localStorage.getItem('userId');
        if (!employeId) return;

        this.loading = true;
        this.formationService.getMesInscriptions(employeId, true).subscribe({
            next: (inscriptions) => {
                this.inscriptions = inscriptions || [];
                            this.nettoyerStatutsInvalides();

                this.filteredInscriptions = this.selectedStatut
                    ? this.inscriptions.filter(i => i.statut === this.selectedStatut)
                    : [...this.inscriptions];
                this.loadExamNotes();
                this.chargerCertificatsTelecharges();
                this.initialiserDatesLimiteExercices();
                this.demarrerTimersExercices();
                this.initAdvancedMetrics();
                this.loading = false;
            },
            error: (err) => {
                console.error('Erreur chargement inscriptions:', err);
                this.loading = false;
            }
        });
    }

    loadExamNotes(): void {
        const employeId = localStorage.getItem('userId');
        if (!employeId) return;
        
        const bonusDejaNotifies = JSON.parse(localStorage.getItem('bonusExamensNotifies') || '{}');
        
        this.examenService.getResultatsByEmploye(employeId).subscribe({
            next: (resultats) => {
                resultats.forEach(r => {
                    this.examenService.getExamenById(r.examenId).subscribe({
                        next: (examen) => {
                            const note = r.note;
                            this.examenNotes[examen.formationId] = note;
                            
                            const cleNotif = `${examen.id}_${r.id}`;
                            if (note > 15 && !bonusDejaNotifies[cleNotif]) {
                                this.notifications.unshift({
                                    id: Date.now() + Math.random(),
                                    type: 'success',
                                    titre: '🎁 Félicitations !',
                                    message: `Vous avez obtenu ${note}/20 à l'examen "${examen.titre}". +500 points ont été ajoutés à votre compte !`,
                                    date: new Date(),
                                    lue: false,
                                    icon: '🎉'
                                });
                                
                                bonusDejaNotifies[cleNotif] = true;
                                localStorage.setItem('bonusExamensNotifies', JSON.stringify(bonusDejaNotifies));
                                this.loadUserPoints();
                                this.sauvegarderNotifications();
                            }
                            this.initAdvancedMetrics();
                        },
                        error: (err) => console.error('Erreur chargement examen', err)
                    });
                });
            },
            error: (err) => console.error('Erreur chargement notes', err)
        });
    }

    chargerCertificatsTelecharges(): void {
        this.inscriptions.forEach(inscription => {
            const saved = localStorage.getItem(`certificat_${inscription.formationId}`);
            if (saved === 'true') {
                this.certificatDejaTelecharge[inscription.formationId] = true;
            }
        });
    }

    loadUserPoints(): void {
        let userId = localStorage.getItem('userId');
        const currentUserStr = localStorage.getItem('currentUser');
        
        if (currentUserStr) {
            try {
                const currentUser = JSON.parse(currentUserStr);
                if (currentUser.id && currentUser.id !== userId) {
                    userId = currentUser.id;
                    localStorage.setItem('userId', userId);
                }
            } catch (e) {}
        }
        
        if (!userId) {
            this.userPoints = 0;
            return;
        }

        this.isLoadingPoints = true;
        
        this.userService.getUserPoints(userId).subscribe({
            next: (response: any) => {
                this.userPoints = response.solde || response || 0;
                const currentUserStr2 = localStorage.getItem('currentUser');
                if (currentUserStr2) {
                    try {
                        const currentUser = JSON.parse(currentUserStr2);
                        currentUser.points = this.userPoints;
                        localStorage.setItem('currentUser', JSON.stringify(currentUser));
                    } catch (e) {}
                }
                this.isLoadingPoints = false;
            },
            error: (err) => {
                console.error('Erreur chargement points:', err);
                this.userPoints = 1000;
                this.isLoadingPoints = false;
            }
        });
    }

    chargerDatesLimiteExercices(): void {
        const saved = localStorage.getItem('datesLimiteExercices');
        if (saved) {
            try {
                const dates = JSON.parse(saved);
                Object.keys(dates).forEach(key => {
                    this.dateLimiteRendu[key] = new Date(dates[key]);
                });
            } catch (e) {}
        }
    }

    sauvegarderDateLimiteExercice(formationId: string, dateLimite: Date): void {
        this.dateLimiteRendu[formationId] = dateLimite;
        localStorage.setItem('datesLimiteExercices', JSON.stringify(
            Object.keys(this.dateLimiteRendu).reduce((obj, key) => {
                obj[key] = this.dateLimiteRendu[key];
                return obj;
            }, {} as any)
        ));
    }

    calculerTempsRestantExercice(formationId: string): string {
        const dateLimite = this.dateLimiteRendu[formationId];
        if (!dateLimite) return '';
        
        const maintenant = new Date();
        const diffMs = dateLimite.getTime() - maintenant.getTime();
        
        if (diffMs <= 0) return '⏰ Délai expiré';
        
        const heures = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        
        if (heures > 24) {
            const jours = Math.floor(heures / 24);
            return `⏳ ${jours} jour${jours > 1 ? 's' : ''} restant${jours > 1 ? 's' : ''}`;
        }
        
        if (heures === 0 && minutes === 0) return '⏳ Moins d\'une minute restante';
        if (heures === 0) return `⏳ ${minutes} minute${minutes > 1 ? 's' : ''} restante${minutes > 1 ? 's' : ''}`;
        return `⏳ ${heures}h ${minutes}m restants`;
    }

    demarrerTimersExercices(): void {
        Object.keys(this.timersExercices).forEach(key => {
            if (this.timersExercices[key]) clearInterval(this.timersExercices[key]);
        });
        
        this.inscriptions.forEach(inscription => {
            if (inscription.statut === 'PRESENT') {
                this.timersExercices[inscription.formationId] = setInterval(() => {
                    this.tempsRestantExercices[inscription.formationId] = this.calculerTempsRestantExercice(inscription.formationId);
                    this.tempsRestantExercices = { ...this.tempsRestantExercices };
                }, 60000);
                this.tempsRestantExercices[inscription.formationId] = this.calculerTempsRestantExercice(inscription.formationId);
            }
        });
    }

    getTempsRestantExercice(formationId: string): string {
        return this.tempsRestantExercices[formationId] || '';
    }

    getExercicesARendreCount(): number {
        let count = 0;
        this.inscriptions.forEach(inscription => {
            const tempsRestant = this.tempsRestantExercices[inscription.formationId];
            if (inscription.statut === 'PRESENT' && tempsRestant && tempsRestant !== '⏰ Délai expiré') count++;
        });
        return count;
    }

    initAdvancedMetrics(): void {
        this.loadStatistiquesGlobales();
        this.loadBadges();
        this.loadRecommandations();
        this.loadPerformanceParMois();
        this.loadPlanningHebdo();
        this.loadNotifications();
    }

    loadStatistiquesGlobales(): void {
        this.statistiquesGlobales.totalFormations = this.inscriptions.length;
        this.statistiquesGlobales.formationsTerminees = this.inscriptions.filter(i => i.statut === 'TERMINE').length;
        this.statistiquesGlobales.formationsEnCours = this.inscriptions.filter(i => i.statut === 'PRESENT' || i.statut === 'CONFIRME').length;
        this.statistiquesGlobales.formationsAVenir = this.inscriptions.filter(i => i.statut === 'EN_ATTENTE').length;
        
        let pointsTotal = 0;
        pointsTotal += this.statistiquesGlobales.formationsTerminees * 500;
        const bonusNotes = Object.values(this.examenNotes).filter(n => n > 15).length;
        pointsTotal += bonusNotes * 500;
        this.statistiquesGlobales.pointsGagnes = pointsTotal;
        
        const notes = Object.values(this.examenNotes);
        if (notes.length > 0) {
            const somme = notes.reduce((a, b) => a + b, 0);
            const moyenne = somme / notes.length;
            this.statistiquesGlobales.tauxReussiteMoyen = Math.round((moyenne / 20) * 100);
        } else {
            this.statistiquesGlobales.tauxReussiteMoyen = 0;
        }
        
        this.statistiquesGlobales.certificatsObtenus = Object.values(this.examenNotes).filter(n => n >= 10).length;
        
        let heuresTotal = 0;
        this.inscriptions.forEach(i => {
            heuresTotal += this.getDureeFormation(i.dateDebut, i.dateFin);
        });
        this.statistiquesGlobales.heuresTotal = heuresTotal;
    }

    loadBadges(): void {
        this.badges = [];
        
        if (Object.keys(this.examenNotes).length > 0) {
            this.badges.push({
                id: 1, nom: 'Premier examen', icon: '🎯',
                description: 'Vous avez passé votre premier examen avec succès',
                couleur: 'blue', dateObtenu: new Date(), progression: 100
            });
        }
        
        if (this.statistiquesGlobales.certificatsObtenus > 0) {
            this.badges.push({
                id: 2, nom: 'Certifié', icon: '📜',
                description: `${this.statistiquesGlobales.certificatsObtenus} certification(s) obtenue(s)`,
                couleur: 'green', dateObtenu: new Date(), progression: Math.min(100, this.statistiquesGlobales.certificatsObtenus * 20)
            });
        }
        
        if (this.statistiquesGlobales.formationsTerminees >= 3) {
            this.badges.push({
                id: 3, nom: 'Apprenant assidu', icon: '🏆',
                description: `${this.statistiquesGlobales.formationsTerminees} formations terminées`,
                couleur: 'gold', dateObtenu: new Date(), progression: 100
            });
        } else if (this.statistiquesGlobales.formationsTerminees > 0) {
            this.badges.push({
                id: 3, nom: 'Apprenant assidu', icon: '🏆',
                description: `Plus que ${3 - this.statistiquesGlobales.formationsTerminees} formation(s) pour débloquer ce badge`,
                couleur: 'gray', progression: (this.statistiquesGlobales.formationsTerminees / 3) * 100
            });
        }
        
        const excellentNotes = Object.values(this.examenNotes).filter(n => n > 15).length;
        if (excellentNotes > 0) {
            this.badges.push({
                id: 4, nom: 'Excellence académique', icon: '⭐',
                description: `${excellentNotes} examen(s) avec note > 15/20 - +500 points bonus chacun !`,
                couleur: 'purple', dateObtenu: new Date(), progression: 100
            });
        }
        
        const formationsPresent = this.inscriptions.filter(i => i.statut === 'PRESENT').length;
        if (formationsPresent >= 2) {
            this.badges.push({
                id: 5, nom: 'Présentiel assidu', icon: '👥',
                description: `${formationsPresent} formation(s) en présentiel suivies`,
                couleur: 'orange', dateObtenu: new Date(), progression: Math.min(100, (formationsPresent / 5) * 100)
            });
        }
        
        if (this.statistiquesGlobales.heuresTotal >= 100) {
            this.badges.push({
                id: 6, nom: '100 heures', icon: '⏱️',
                description: `${this.statistiquesGlobales.heuresTotal} heures de formation accumulées`,
                couleur: 'indigo', dateObtenu: new Date(), progression: 100
            });
        } else if (this.statistiquesGlobales.heuresTotal > 0) {
            this.badges.push({
                id: 6, nom: '100 heures', icon: '⏱️',
                description: `${this.statistiquesGlobales.heuresTotal}/100 heures de formation`,
                couleur: 'gray', progression: (this.statistiquesGlobales.heuresTotal / 100) * 100
            });
        }
        
        const totalBonusPoints = this.statistiquesGlobales.pointsGagnes - (this.statistiquesGlobales.formationsTerminees * 500);
        if (totalBonusPoints >= 500) {
            this.badges.push({
                id: 7, nom: 'Chasseur de bonus', icon: '🎁',
                description: `${totalBonusPoints} points bonus accumulés`,
                couleur: 'yellow', dateObtenu: new Date(), progression: 100
            });
        }
        
        const formationsConsecutives = this.compterFormationsConsecutives();
        if (formationsConsecutives >= 3) {
            this.badges.push({
                id: 8, nom: 'Enchaînement', icon: '🔥',
                description: `${formationsConsecutives} formations suivies d'affilée`,
                couleur: 'red', dateObtenu: new Date(), progression: Math.min(100, (formationsConsecutives / 10) * 100)
            });
        }
        
        if (this.statistiquesGlobales.formationsTerminees >= 2 && this.statistiquesGlobales.formationsEnCours >= 1) {
            this.badges.push({
                id: 9, nom: 'Progression rapide', icon: '📈',
                description: 'Formations terminées et en cours simultanément',
                couleur: 'teal', dateObtenu: new Date(), progression: 100
            });
        }
        
        this.badges.sort((a, b) => {
            if (a.dateObtenu && b.dateObtenu) return b.dateObtenu.getTime() - a.dateObtenu.getTime();
            return a.id - b.id;
        });
        
        this.calculerStatsBadges();
    }

    calculerStatsBadges(): void {
        this.totalBadges = this.badges.length;
        this.badgesDebloques = this.badges.filter(b => b.progression >= 100).length;
        this.totalBonusPoints = this.getTotalBonusPoints();
    }

    getTotalBonusPoints(): number {
        const pointsFormations = this.statistiquesGlobales.formationsTerminees * 500;
        return this.statistiquesGlobales.pointsGagnes - pointsFormations;
    }

    private compterFormationsConsecutives(): number {
        const datesFormations = this.inscriptions
            .filter(i => i.statut === 'TERMINE' || i.statut === 'PRESENT')
            .map(i => new Date(i.dateDebut || i.dateInscription))
            .filter(d => !isNaN(d.getTime()))
            .sort((a, b) => a.getTime() - b.getTime());
        
        if (datesFormations.length === 0) return 0;
        
        let maxConsecutives = 1;
        let currentConsecutives = 1;
        
        for (let i = 1; i < datesFormations.length; i++) {
            const diffDays = Math.ceil((datesFormations[i].getTime() - datesFormations[i-1].getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays <= 30) {
                currentConsecutives++;
                maxConsecutives = Math.max(maxConsecutives, currentConsecutives);
            } else {
                currentConsecutives = 1;
            }
        }
        return maxConsecutives;
    }

    getInitialesEmploye(): string {
        const nom = localStorage.getItem('userName') || 'E';
        if (nom.includes(' ')) return nom.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
        return nom.substring(0, 2).toUpperCase();
    }

    getBadgeColor(couleur: string): string {
        const colors: { [key: string]: string } = {
            'blue': 'bg-blue-50 text-blue-700 border-blue-200',
            'green': 'bg-green-50 text-green-700 border-green-200',
            'gold': 'bg-yellow-50 text-yellow-700 border-yellow-200',
            'purple': 'bg-purple-50 text-purple-700 border-purple-200',
            'orange': 'bg-orange-50 text-orange-700 border-orange-200',
            'indigo': 'bg-indigo-50 text-indigo-700 border-indigo-200',
            'yellow': 'bg-amber-50 text-amber-700 border-amber-200',
            'red': 'bg-red-50 text-red-700 border-red-200',
            'teal': 'bg-teal-50 text-teal-700 border-teal-200',
            'gray': 'bg-gray-50 text-gray-500 border-gray-200'
        };
        return colors[couleur] || 'bg-gray-50 text-gray-700 border-gray-200';
    }

    loadRecommandations(): void {
        this.recommandations = [];
        
        const typesFormations = this.inscriptions.map(i => i.type);
        const typeCount: { [key: string]: number } = {};
        typesFormations.forEach(t => { if (t) typeCount[t] = (typeCount[t] || 0) + 1; });
        const typePrefere = Object.entries(typeCount).sort((a, b) => b[1] - a[1])[0]?.[0];
        
        if (typePrefere) {
            this.recommandations.push({
                id: 1, titre: `Continuer dans ${this.getTypeLabel(typePrefere)}`,
                description: `Vous avez montré un intérêt particulier pour ce domaine`, icon: '🎯'
            });
        }
        
        const examensEchoues = Object.entries(this.examenNotes).filter(([_, note]) => note < 10);
        if (examensEchoues.length > 0) {
            this.recommandations.push({
                id: 2, titre: 'Reprendre les examens',
                description: `${examensEchoues.length} examen(s) peuvent être retentés`, icon: '📚'
            });
        }
        
        const formationsTerminees = this.inscriptions.filter(i => i.statut === 'TERMINE');
        const formationsSansCertif = formationsTerminees.filter(f => !this.isCertificationAvailable(f.formationId));
        if (formationsSansCertif.length > 0) {
            this.recommandations.push({
                id: 3, titre: 'Obtenez vos certifications',
                description: `${formationsSansCertif.length} formation(s) sans certification`, icon: '📜'
            });
        }
        
        const formationsEnCours = this.inscriptions.filter(i => i.statut === 'PRESENT');
        if (formationsEnCours.length > 0) {
            this.recommandations.push({
                id: 4, titre: 'Progression en cours',
                description: `Terminez vos ${formationsEnCours.length} formation(s) en cours`, icon: '📈'
            });
        }
    }

    getTypeLabel(type: string): string {
        const types: { [key: string]: string } = {
            'TECHNIQUE': 'les formations techniques',
            'MANAGERIAL': 'le management',
            'RSE': 'la RSE',
            'SOFT_SKILLS': 'les soft skills',
            'SECURITE': 'la sécurité',
            'OBLIGATOIRE': 'les formations obligatoires'
        };
        return types[type] || 'les formations';
    }

    loadPlanningHebdo(): void {
        const jours = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
        this.planningHebdo = jours.map((jour, index) => {
            const formationsJour = this.inscriptions.filter(i => {
                if (!i.dateDebut) return false;
                const dateDebut = new Date(i.dateDebut);
                return dateDebut.getDay() === (index === 6 ? 0 : index + 1);
            });
            return { jour: jour.substring(0, 3), total: formationsJour.length, noms: formationsJour.slice(0, 2).map(f => f.formationTitre) };
        });
    }

    loadPerformanceParMois(): void {
        const mois = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
        this.performanceParMois = mois.map((mois, index) => {
            const formationsMois = this.inscriptions.filter(i => {
                if (!i.dateInscription) return false;
                return new Date(i.dateInscription).getMonth() === index;
            }).length;
            return { mois, formations: formationsMois, notes: Math.floor(Math.random() * 40) + 60 };
        });
    }

    loadNotifications(): void {
        this.notifications = [];
        const maintenant = new Date();
        
        const formationsAVenir = this.inscriptions.filter(i => {
            if (!i.dateDebut) return false;
            if (i.statut !== 'CONFIRME') return false;
            const dateDebut = new Date(i.dateDebut);
            const diffMs = dateDebut.getTime() - maintenant.getTime();
            const diffHeures = diffMs / (1000 * 60 * 60);
            return diffHeures > 0 && diffHeures <= 72;
        });
        
        formationsAVenir.forEach(f => {
            const dateDebut = new Date(f.dateDebut!);
            const diffMs = dateDebut.getTime() - maintenant.getTime();
            const diffHeures = Math.floor(diffMs / (1000 * 60 * 60));
            
            let message = '';
            if (diffHeures < 1) {
                const diffMinutes = Math.floor(diffMs / (1000 * 60));
                if (diffMinutes <= 0) message = `🎓 La formation "${f.formationTitre}" commence maintenant !`;
                else message = `🎓 La formation "${f.formationTitre}" commence dans ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
            } else if (diffHeures < 24) {
                message = `🎓 La formation "${f.formationTitre}" commence dans ${diffHeures} heure${diffHeures > 1 ? 's' : ''} (${dateDebut.toLocaleTimeString()})`;
            } else {
                const jours = Math.floor(diffHeures / 24);
                const heuresRestantes = diffHeures % 24;
                if (heuresRestantes === 0) message = `🎓 La formation "${f.formationTitre}" commence dans ${jours} jour${jours > 1 ? 's' : ''}`;
                else message = `🎓 La formation "${f.formationTitre}" commence dans ${jours} jour${jours > 1 ? 's' : ''} et ${heuresRestantes} heure${heuresRestantes > 1 ? 's' : ''}`;
            }
            
            this.notifications.push({ id: Date.now() + Math.random(), type: 'info', message, date: new Date(), lue: false });
        });
        
        const formationsEnCoursAujourdhui = this.inscriptions.filter(i => {
            if (!i.dateDebut) return false;
            if (i.statut !== 'CONFIRME' && i.statut !== 'PRESENT') return false;
            const dateDebut = new Date(i.dateDebut);
            const aujourdhui = new Date();
            aujourdhui.setHours(0, 0, 0, 0);
            dateDebut.setHours(0, 0, 0, 0);
            return dateDebut.getTime() === aujourdhui.getTime();
        });
        
        formationsEnCoursAujourdhui.forEach(f => {
            const dateDebut = new Date(f.dateDebut!);
            this.notifications.push({
                id: Date.now() + Math.random(), type: 'warning',
                message: `🔔 La formation "${f.formationTitre}" commence aujourd'hui à ${dateDebut.toLocaleTimeString()} ! Ne manquez pas le début.`,
                date: new Date(), lue: false
            });
        });
        
        const examensNonPasses = this.inscriptions.filter(i => i.statut === 'PRESENT' && !this.examenNotes[i.formationId]);
        if (examensNonPasses.length > 0) {
            this.notifications.push({
                id: Date.now() + Math.random(), type: 'warning',
                message: `📋 Vous avez ${examensNonPasses.length} examen(s) à passer pour : ${examensNonPasses.map(e => e.formationTitre).join(', ')}`,
                date: new Date(), lue: false
            });
        }
        
        this.inscriptions.forEach(inscription => {
            if (inscription.statut === 'PRESENT') {
                const tempsRestant = this.getTempsRestantExercice(inscription.formationId);
                if (tempsRestant && tempsRestant !== '⏰ Délai expiré') {
                    const isUrgent = tempsRestant.includes('minute') && parseInt(tempsRestant) < 5;
                    this.notifications.push({
                        id: Date.now() + Math.random(), type: isUrgent ? 'danger' : 'warning',
                        message: `📝 ${inscription.formationTitre} - Exercice à rendre - ${tempsRestant}`,
                        date: new Date(), lue: false, formationId: inscription.formationId
                    });
                }
            }
        });
        
        if (this.inscriptions.length > 0 && this.notifications.length === 0) {
            this.notifications.push({
                id: Date.now() + Math.random(), type: 'info',
                message: `📚 Vous avez ${this.inscriptions.length} formation(s) inscrite(s). Consultez votre planning !`,
                date: new Date(), lue: false
            });
        }
        
        this.notifications.sort((a, b) => b.date.getTime() - a.date.getTime());
        if (this.notifications.length > 10) this.notifications = this.notifications.slice(0, 10);
    }

    marquerToutesLues(): void {
        this.notifications.forEach(notif => notif.lue = true);
        localStorage.setItem('notifications', JSON.stringify(this.notifications));
    }

    supprimerToutesNotifications(): void {
        this.notifications = [];
        localStorage.removeItem('notifications');
    }

    sauvegarderNotifications(): void {
        localStorage.setItem('notifications', JSON.stringify(this.notifications));
    }

    chargerNotifications(): void {
        const saved = localStorage.getItem('notifications');
        if (saved) {
            try { this.notifications = JSON.parse(saved); } catch(e) {}
        }
    }

    toggleDashboardStats(): void { this.showDashboardStats = !this.showDashboardStats; }
    toggleRecommandations(): void { this.showRecommandations = !this.showRecommandations; }
    toggleBadges(): void { this.showBadges = !this.showBadges; }
    toggleNotifications(): void { this.showNotifications = !this.showNotifications; }
    togglePlanning(): void { this.showPlanning = !this.showPlanning; }
    togglePerformance(): void { this.showPerformance = !this.showPerformance; }

    marquerNotificationLue(notification: any): void { notification.lue = true; }
    supprimerNotification(index: number): void { this.notifications.splice(index, 1); }

    filterByStatut(statut: string): void {
        this.selectedStatut = statut;
        this.filteredInscriptions = statut ? this.inscriptions.filter(i => i.statut === statut) : [...this.inscriptions];
    }

    getStatutCount(statutValue: string): number { return this.inscriptions.filter(i => i.statut === statutValue).length; }

    getDureeFormation(dateDebut: Date | undefined, dateFin: Date | undefined): number {
        if (!dateDebut || !dateFin) return 0;
        const diffMs = new Date(dateFin).getTime() - new Date(dateDebut).getTime();
        return Math.ceil(diffMs / (1000 * 60 * 60));
    }

    getJoursRestantsPourConfirmation(dateInscription: Date | undefined, dateDebut: Date | undefined): number {
        if (!dateInscription || !dateDebut) return 0;
        const aujourdhui = new Date();
        const dateInscriptionObj = new Date(dateInscription);
        const dateDebutObj = new Date(dateDebut);
        const dateLimiteConfirmation = new Date(dateInscriptionObj);
        dateLimiteConfirmation.setDate(dateLimiteConfirmation.getDate() + 7);
        const dateLimite = dateLimiteConfirmation < dateDebutObj ? dateLimiteConfirmation : dateDebutObj;
        const diffDays = Math.ceil((dateLimite.getTime() - aujourdhui.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : 0;
    }

    getJoursAvantDebut(dateDebut: Date | undefined): number {
        if (!dateDebut) return 0;
        const aujourdhui = new Date();
        const dateDebutObj = new Date(dateDebut);
        aujourdhui.setHours(0, 0, 0, 0);
        dateDebutObj.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((dateDebutObj.getTime() - aujourdhui.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : 0;
    }

    isFormationTerminee(dateFin: Date | undefined): boolean {
        if (!dateFin) return false;
        return new Date() > new Date(dateFin);
    }

    isConfirmationPossible(inscription: Inscription): boolean {
        if (inscription.statut !== 'EN_ATTENTE') return false;
        return this.getJoursRestantsPourConfirmation(inscription.dateInscription, inscription.dateDebut) > 0;
    }

    getStatutMessage(inscription: Inscription): string {
        const maintenant = new Date();
        const dateDebut = inscription.dateDebut ? new Date(inscription.dateDebut) : null;
        const dateFin = inscription.dateFin ? new Date(inscription.dateFin) : null;
        
        if (inscription.statut === 'CONFIRME') {
            if (dateDebut) {
                const diffMs = dateDebut.getTime() - maintenant.getTime();
                const diffMinutes = Math.floor(diffMs / (1000 * 60));
                const diffHeures = Math.floor(diffMs / (1000 * 60 * 60));
                
                if (diffMs <= 0) return `Confirmée - Commence maintenant !`;
                else if (diffMinutes < 60) {
                    if (diffMinutes <= 5) return `Confirmée - Commence dans ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ! Préparez-vous !`;
                    return `Confirmée - Commence dans ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
                } else if (diffHeures < 24) {
                    const heuresRestantes = diffHeures;
                    const minutesRestantes = diffMinutes % 60;
                    if (minutesRestantes > 0) return `Confirmée - Commence dans ${heuresRestantes}h${minutesRestantes}`;
                    return `Confirmée - Commence dans ${heuresRestantes} heure${heuresRestantes > 1 ? 's' : ''}`;
                } else {
                    const joursRestants = Math.floor(diffHeures / 24);
                    if (joursRestants === 1) return `Confirmée - Commence demain à ${dateDebut.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}`;
                    return `Confirmée - Commence dans ${joursRestants} jours`;
                }
            }
            return 'Confirmée';
        } else if (inscription.statut === 'PRESENT') {
            if (dateFin) {
                const diffMs = dateFin.getTime() - maintenant.getTime();
                const diffMinutes = Math.floor(diffMs / (1000 * 60));
                const diffHeures = Math.floor(diffMs / (1000 * 60 * 60));
                
                if (diffMinutes <= 0) return `Se termine maintenant !`;
                else if (diffMinutes < 60) return `En cours - Termine dans ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
                else if (diffHeures < 24) return `En cours - Termine dans ${diffHeures} heure${diffHeures > 1 ? 's' : ''}`;
            }
            return 'En cours - Formation en cours';
        } else if (inscription.statut === 'EN_ATTENTE') {
            const joursRestants = this.getJoursRestantsPourConfirmation(inscription.dateInscription, inscription.dateDebut);
            if (joursRestants > 0) return `En attente - ${joursRestants} jour${joursRestants > 1 ? 's' : ''} pour confirmer`;
            else return 'En attente - Délai dépassé';
        } else if (inscription.statut === 'TERMINE') return 'Formation terminée';
        else if (inscription.statut === 'ANNULE') return 'Inscription annulée';
        return this.getStatutLabel(inscription.statut);
    }

    voirDocuments(formationId: string): void {
        this.router.navigate(['/employee/formations', formationId, 'ressources'], { queryParams: { tab: 'documents' } });
    }

    voirExamens(formationId: string): void {
        this.router.navigate(['/employee/formations', formationId, 'ressources'], { queryParams: { tab: 'examens' } });
    }

    async confirmerPresence(inscription: Inscription): Promise<void> {
        if (this.userPoints < this.coutFormation) {
            const result = await this.dialogService.confirm({
                title: '💰 Points insuffisants',
                message: `Vous avez ${this.userPoints} points, besoin de ${this.coutFormation} points pour confirmer votre présence à "${inscription.formationTitre}".\n\nQue souhaitez-vous faire ?`,
                confirmText: 'Acheter des points',
                cancelText: 'Annuler l\'inscription',
                type: 'warning'
            }).toPromise();
            
            if (result) {
                this.router.navigate(['/employee/formations-disponibles']);
                setTimeout(() => {
                    this.dialogService.alert({
                        title: '💰 Acheter des points',
                        message: 'Cliquez sur le bouton "Acheter des points" en haut de la page des formations disponibles.',
                        type: 'info', confirmText: 'OK'
                    });
                }, 500);
            } else {
                this.openAnnulationModal(inscription);
            }
            return;
        }
        
        if (!this.isConfirmationPossible(inscription)) {
            this.dialogService.alert({
                title: 'Délai dépassé',
                message: 'Le délai de confirmation est dépassé. Vous ne pouvez plus confirmer votre présence.',
                type: 'warning', confirmText: 'Fermer'
            });
            return;
        }

        const confirmed = await this.dialogService.confirm({
            title: 'Confirmation de présence',
            message: `Souhaitez-vous confirmer votre présence à la formation "${inscription.formationTitre}" ?\n\nUn email de confirmation avec QR Code vous sera envoyé.\n\n⚠️ ${this.coutFormation} points seront déduits de votre solde (Solde actuel: ${this.userPoints} points).`,
            confirmText: 'Confirmer', cancelText: 'Annuler', type: 'confirm'
        }).toPromise();

        if (confirmed) {
            this.confirmingId = inscription.id;
            this.formationService.confirmerPresence(inscription.id).subscribe({
                next: () => {
                    this.dialogService.alert({
                        title: 'Présence confirmée',
                        message: `Votre présence à "${inscription.formationTitre}" a été confirmée avec succès.\n\nUn email de confirmation vous a été envoyé.\n\n💰 ${this.coutFormation} points ont été déduits.`,
                        type: 'success', confirmText: 'Fermer'
                    });
                    this.loadMesInscriptions();
                    this.loadUserPoints();
                    this.confirmingId = null;
                },
                error: (err) => {
                    console.error('Erreur confirmation:', err);
                    const errorMessage = err.error?.message || 'Une erreur est survenue lors de la confirmation.';
                    if (errorMessage.includes('points')) {
                        this.loadUserPoints();
                        this.dialogService.alert({ title: 'Points insuffisants', message: errorMessage, type: 'error', confirmText: 'Fermer' });
                    } else {
                        this.dialogService.alert({ title: 'Échec de la confirmation', message: errorMessage, type: 'error', confirmText: 'Fermer' });
                    }
                    this.confirmingId = null;
                }
            });
        }
    }

    async afficherQRCode(inscription: Inscription) {
        this.loadingQRCode = true;
        try {
            let token = localStorage.getItem('accessToken');
            if (!token) token = localStorage.getItem('token');
            if (!token) {
                const currentUser = localStorage.getItem('currentUser');
                if (currentUser) {
                    try { const user = JSON.parse(currentUser); token = user.token || user.accessToken; } catch (e) {}
                }
            }
            if (!token) throw new Error('Vous devez être connecté. Veuillez vous reconnecter.');
            
            const data = await this.formationService.getFormationQRCode(inscription.formationId).toPromise();
            this.qrCodeData = { ...data, formationId: inscription.formationId, titre: inscription.formationTitre, dateValidite: new Date() };
        } catch (error) {
            console.error('Erreur chargement QR Code:', error);
            this.dialogService.alert({
                title: 'Erreur', message: error instanceof Error ? error.message : 'Impossible de charger le QR Code. Veuillez vous reconnecter.',
                type: 'error', confirmText: 'Fermer'
            });
        } finally {
            this.loadingQRCode = false;
        }
    }

    fermerQRCode(): void { this.qrCodeData = null; }

    telechargerQRCode(): void {
        if (this.qrCodeData?.qrCode) {
            try {
                const link = document.createElement('a');
                const fileName = `qrcode-${(this.qrCodeData.titre || 'formation').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`;
                link.download = fileName;
                link.href = `data:image/png;base64,${this.qrCodeData.qrCode}`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                this.dialogService.alert({ title: 'Téléchargement', message: 'QR Code téléchargé avec succès.', type: 'success', confirmText: 'Fermer' });
            } catch (error) {
                console.error('Erreur téléchargement:', error);
                this.dialogService.alert({ title: 'Erreur', message: 'Impossible de télécharger le QR Code.', type: 'error', confirmText: 'Fermer' });
            }
        } else {
            this.dialogService.alert({ title: 'Erreur', message: 'Aucun QR Code à télécharger.', type: 'warning', confirmText: 'Fermer' });
        }
    }

    getStatutColor(statut: string): string { const s = this.statuts.find(s => s.value === statut); return s?.color || 'gray'; }
    getStatutLabel(statut: string): string { const s = this.statuts.find(s => s.value === statut); return s?.label || statut; }

    telechargerCertification(formationId: string): void {
        const note = this.examenNotes[formationId];
        if (!note || note < 10) {
            this.dialogService.alert({ title: 'Certification non disponible', message: 'Vous devez obtenir au moins 10/20 pour obtenir votre certification.', type: 'warning', confirmText: 'Fermer' });
            return;
        }
        if (this.certificatDejaTelecharge[formationId]) {
            this.dialogService.alert({ title: 'Certificat déjà téléchargé', message: 'Vous avez déjà téléchargé ce certificat.', type: 'info', confirmText: 'Fermer' });
            return;
        }
        const employeId = localStorage.getItem('userId');
        if (!employeId) { this.dialogService.alert({ title: 'Erreur', message: 'Utilisateur non identifié', type: 'error', confirmText: 'Fermer' }); return; }
        
        this.downloadingCertif[formationId] = true;
        this.examenService.telechargerCertification(formationId, employeId).subscribe({
            next: (blob: Blob) => {
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `certification_${formationId}.pdf`;
                link.click();
                window.URL.revokeObjectURL(url);
                this.certificatDejaTelecharge[formationId] = true;
                localStorage.setItem(`certificat_${formationId}`, 'true');
                this.downloadingCertif[formationId] = false;
                this.dialogService.alert({ title: 'Succès', message: 'Téléchargement de la certification démarré', type: 'success' });
            },
            error: (err) => {
                console.error('Erreur téléchargement certification:', err);
                this.downloadingCertif[formationId] = false;
                this.dialogService.alert({ title: 'Erreur', message: err.error?.message || 'Impossible de télécharger la certification', type: 'error', confirmText: 'Fermer' });
            }
        });
    }

    isCertificationAvailable(formationId: string): boolean {
        const note = this.examenNotes[formationId];
        return note !== undefined && note >= 10;
    }

    isPlanningEmpty(): boolean { return this.planningHebdo.length === 0 || this.planningHebdo.every(j => j.total === 0); }

    getNotificationsNonLuesCount(): number { return this.notifications.filter(n => !n.lue).length; }

    initialiserDatesLimiteExercices(): void {
        this.inscriptions.forEach(inscription => {
            if (inscription.statut === 'PRESENT' && !this.dateLimiteRendu[inscription.formationId]) {
                const dateLimite = new Date();
                dateLimite.setHours(dateLimite.getHours() + 24);
                this.sauvegarderDateLimiteExercice(inscription.formationId, dateLimite);
            }
        });
    }

    async voirFeedbackIA(formationId: string): Promise<void> {
        const employeId = localStorage.getItem('userId');
        if (!employeId) { this.dialogService.alert({ title: 'Erreur', message: 'Utilisateur non identifié', type: 'error' }); return; }
        this.examenService.getResultatsByEmploye(employeId).subscribe({
            next: (resultats) => {
                const promises = resultats.map(resultat => this.examenService.getExamenById(resultat.examenId).toPromise());
                Promise.all(promises).then((examens) => {
                    for (let i = 0; i < resultats.length; i++) {
                        const examen = examens[i];
                        const resultat = resultats[i];
                        if (examen && examen.formationId === formationId) {
                            this.dialog.open(FeedbackIaDialogComponent, { data: { resultat, examen }, width: '90%', maxWidth: '900px', panelClass: 'feedback-ia-dialog-panel' });
                            return;
                        }
                    }
                    this.dialogService.alert({ title: 'Information', message: 'Aucun résultat d\'examen trouvé pour cette formation.', type: 'info' });
                });
            },
            error: (err) => { console.error('Erreur chargement résultats', err); this.dialogService.alert({ title: 'Erreur', message: 'Impossible de charger les résultats', type: 'error' }); }
        });
    }

    openAnnulationModal(inscription: Inscription): void {
        this.selectedInscription = inscription;
        this.annulationMotif = '';
        this.annulationTypeMotif = '';
        this.showAnnulationModal = true;
        if (inscription.dateDebut) {
            const aujourdhui = new Date();
            const dateDebut = new Date(inscription.dateDebut);
            const diffTime = dateDebut.getTime() - aujourdhui.getTime();
            this.joursAvantDebut = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            this.calculerRemboursement();
        }
    }

    closeAnnulationModal(): void {
        this.showAnnulationModal = false;
        this.selectedInscription = null;
        this.annulationMotif = '';
        this.annulationTypeMotif = '';
        this.cancellingId = null;
    }

    selectMotif(motifValue: string): void {
        this.annulationTypeMotif = motifValue;
        if (motifValue !== 'AUTRE') {
            const motif = this.motifs.find(m => m.value === motifValue);
            this.annulationMotif = motif?.label || '';
        } else {
            this.annulationMotif = '';
        }
    }

    calculerRemboursement(): void {
        if (this.joursAvantDebut >= 7) this.pointsARembourser = 1000;
        else if (this.joursAvantDebut >= 3) this.pointsARembourser = 500;
        else this.pointsARembourser = 0;
    }

    getMessageRemboursement(): string {
        if (this.joursAvantDebut >= 7) return `✅ Remboursement intégral : ${this.pointsARembourser} points seront recrédités.`;
        else if (this.joursAvantDebut >= 3) return `⚠️ Remboursement partiel : ${this.pointsARembourser} points seront recrédités (50%).`;
        else return `❌ Aucun remboursement : Délai trop court (moins de 3 jours).`;
    }

    getRemboursementIcon(): string {
        if (this.joursAvantDebut >= 7) return '✅';
        if (this.joursAvantDebut >= 3) return '⚠️';
        return '❌';
    }

    annulerAvecMotif(): void {
        if (!this.annulationMotif || this.annulationMotif.trim() === '') {
            this.dialogService.alert({ title: 'Motif requis', message: 'Veuillez indiquer le motif de l\'annulation.', type: 'warning', confirmText: 'OK' });
            return;
        }
        if (!this.annulationTypeMotif) {
            this.dialogService.alert({ title: 'Type de motif requis', message: 'Veuillez sélectionner un type de motif.', type: 'warning', confirmText: 'OK' });
            return;
        }
        this.cancellingId = this.selectedInscription?.id || null;
        this.formationService.annulerInscriptionAvecMotif(this.selectedInscription!.id, this.annulationMotif, this.annulationTypeMotif).subscribe({
            next: (response: any) => {
                let message = `Votre inscription à "${this.selectedInscription?.formationTitre}" a été annulée avec succès.\n\n`;
                if (response.pointsRembourses > 0) message += `💰 ${response.pointsRembourses} points ont été recrédités sur votre compte.`;
                else message += `ℹ️ Aucun point n'a été remboursé (délai d'annulation dépassé).`;
                this.dialogService.alert({ title: 'Annulation confirmée', message: message, type: 'success', confirmText: 'Fermer' });
                this.loadMesInscriptions();
                this.chargerCertificatsTelecharges();
                this.closeAnnulationModal();
                this.cancellingId = null;
                const userId = localStorage.getItem('userId');
                if (userId) this.pointsService.refreshPoints(userId);
            },
            error: (err) => {
                console.error('Erreur annulation:', err);
                this.dialogService.alert({ title: 'Échec de l\'annulation', message: err.error?.message || 'Une erreur est survenue lors de l\'annulation.', type: 'error', confirmText: 'Fermer' });
                this.cancellingId = null;
            }
        });
    }

    isAnnulationPossible(inscription: Inscription): boolean {
        if (inscription.statut === 'ANNULE' || inscription.statut === 'TERMINE') return false;
        if (inscription.dateDebut && new Date() >= new Date(inscription.dateDebut)) return false;
        if (inscription.statut === 'CONFIRME') {
            if (inscription.dateDebut) {
                const diffDays = Math.ceil((new Date(inscription.dateDebut).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                return diffDays >= 3;
            }
            return false;
        }
        if (inscription.statut === 'EN_ATTENTE') return true;
        if (inscription.statut === 'PRESENT') return false;
        return false;
    }

    openPayment(points: number, amount: number) {
        const userId = localStorage.getItem('userId');
        if (!userId) { this.snackBar.open('Veuillez vous connecter', 'Fermer', { duration: 3000 }); return; }
        this.selectedPoints = points;
        this.selectedAmount = amount;
        this.showPaymentModal = true;
    }

    onPaymentSuccess(event: { points: number }) {
        this.showPaymentModal = false;
        this.loadUserPoints();
        this.snackBar.open(`🎉 ${event.points} points ajoutés à votre compte !`, 'Fermer', { duration: 4000 });
    }

    openBuyPointsDialog() {
        const dialogRef = this.dialog.open(BuyPointsDialogComponent, { width: '550px', panelClass: 'buy-points-dialog-container', disableClose: true });
        dialogRef.afterClosed().subscribe(result => { if (result) this.openPayment(result.points, result.amount); });
    }
     // Dans MesFormationsComponent

/**
 * Vérifie si l'employé a accès aux ressources pédagogiques
 * ✅ UNIQUEMENT si presenceConfirmee === true
 */
peutAccederAuxRessources(inscription: Inscription): boolean {
    // Seulement si la présence a été confirmée (et donc points déduits)
    return inscription.presenceConfirmee === true;
}

/**
 * Vérifie si les examens sont accessibles
 * Conditions : présence confirmée ET formation en cours
 */
peutFaireExamens(inscription: Inscription): boolean {
    return inscription.presenceConfirmee === true 
           && inscription.statut === 'CONFIRME'; // CONFIRME = formation en cours
}

/**
 * Vérifie si les documents sont accessibles
 * Conditions : présence confirmée ET formation non terminée
 */
peutVoirDocuments(inscription: Inscription): boolean {
    return inscription.presenceConfirmee === true 
           && inscription.statut !== 'TERMINE'
           && inscription.statut !== 'ANNULE';
}
    getCurrentUserId(): string { return localStorage.getItem('userId') || ''; }
}