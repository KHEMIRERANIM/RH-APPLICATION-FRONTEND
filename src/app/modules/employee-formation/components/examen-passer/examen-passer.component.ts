import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, FormArray, FormControl } from '@angular/forms';
import { ExamenService } from '../../services/examen.service';
import { DialogService } from '../../../../core/services/dialog.service';
import { Examen, Reponse } from '../../../../shared/models/formation.model';
import { PointsService } from '../../../../core/services/points.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ExamMonitoringService } from '../../services/exam-monitoring.service'; // ✅ NOUVEAU
import { Subscription } from 'rxjs'; // ✅ NOUVEAU

@Component({
    selector: 'app-examen-passer',
    templateUrl: './examen-passer.component.html',
    styleUrls: ['./examen-passer.component.scss']
})
export class ExamenPasserComponent implements OnInit, OnDestroy {
    examenId: string = '';
    examen: Examen | null = null;
    examenForm: FormGroup;
    isLoading = true;
    isSubmitting = false;
    tempsRestant: number = 0;
    timerInterval: any;
    employeId: string = '';
    examenStatus: any = null;
    questionActuelle: number = 0;
    employeNom: string = '';
employePrenom: string = '';
employeEmail: string = '';
    // ✅ NOUVELLES VARIABLES ANTI-FRAUDE
    warningCount: number = 0;
    remainingAttempts: number = 3;
    isBlocked: boolean = false;
    showWarningBanner: boolean = false;
    warningMessage: string = '';
    private fraudSubscriptions: Subscription[] = [];

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private fb: FormBuilder,
        private examenService: ExamenService,
        private dialogService: DialogService,
        private pointsService: PointsService,
        private snackBar: MatSnackBar,
        private monitoringService: ExamMonitoringService // ✅ AJOUT
    ) {
        this.examenForm = this.fb.group({ reponses: this.fb.array([]) });
    }
ngOnInit(): void {
    // ✅ RÉCUPÉRER LES INFOS COMPLÈTES DE L'UTILISATEUR
    const userData = localStorage.getItem('user');
    if (userData) {
        try {
            const user = JSON.parse(userData);
            this.employeId = user.id || user._id || localStorage.getItem('userId') || '';
            this.employeNom = user.nom || user.lastName || localStorage.getItem('userNom') || 'Employé';
            this.employePrenom = user.prenom || user.firstName || localStorage.getItem('userPrenom') || '';
            this.employeEmail = user.email || user.username || localStorage.getItem('userEmail') || '';
        } catch (e) {
            console.error('Erreur parsing userData', e);
            this.employeId = localStorage.getItem('userId') || '';
            this.employeNom = localStorage.getItem('userNom') || 'Employé';
            this.employePrenom = localStorage.getItem('userPrenom') || '';
            this.employeEmail = localStorage.getItem('userEmail') || '';
        }
    } else {
        this.employeId = localStorage.getItem('userId') || '';
        this.employeNom = localStorage.getItem('userNom') || 'Employé';
        this.employePrenom = localStorage.getItem('userPrenom') || '';
        this.employeEmail = localStorage.getItem('userEmail') || '';
    }

    console.log('👤 Infos employé chargées:', {
        id: this.employeId,
        nom: this.employeNom,
        prenom: this.employePrenom,
        email: this.employeEmail
    });

    // ✅ RÉCUPÉRER L'ID DE L'EXAMEN DEPUIS LES PARAMÈTRES
    this.route.params.subscribe(params => {
        this.examenId = params['examenId'];
        console.log('📌 Examen ID:', this.examenId);
        
        if (!this.examenId) {
            console.error('❌ Aucun examenId trouvé dans les paramètres');
            this.dialogService.alert({
                title: 'Erreur',
                message: 'Identifiant de l\'examen introuvable.',
                type: 'error',
                confirmText: 'Fermer'
            });
            this.router.navigate(['/employee/mes-inscriptions']);
            return;
        }
        
        this.loadExamen();
    });
}

// ✅ AJOUTER CES PROPRIÉTÉS DANS LA CLASSE

    ngOnDestroy(): void {
        if (this.timerInterval) clearInterval(this.timerInterval);
        // ✅ ARRÊTER LA SURVEILLANCE
        this.monitoringService.stopMonitoring();
        this.fraudSubscriptions.forEach(sub => sub.unsubscribe());
    }

    // ✅ INITIALISER LA SURVEILLANCE ANTI-FRAUDE
   // examen-passer.component.ts

private initFraudMonitoring(): void {
    // ✅ VÉRIFICATION CRITIQUE
    if (!this.examenId || !this.employeId) {
        console.warn('⚠️ IDs manquants, surveillance non démarrée', {
            examenId: this.examenId,
            employeId: this.employeId
        });
        return;
    }
    
    console.log('🚀 Démarrage surveillance avec:', {
        examenId: this.examenId,
        employeId: this.employeId,
        nom: this.employeNom,
        prenom: this.employePrenom
    });

    // ✅ Démarrer la surveillance SANS appeler checkBlockedStatus d'abord
    this.monitoringService.startMonitoring(this.examenId, {
        id: this.employeId,
        nom: this.employeNom || 'Employé',
        prenom: this.employePrenom || '',
        email: this.employeEmail || ''
    });

    // ✅ ÉCOUTER LES ALERTES
    this.fraudSubscriptions.push(
        this.monitoringService.getWarningCount().subscribe(count => {
            this.warningCount = count;
            this.remainingAttempts = 3 - count;
            this.showWarningBanner = true;
            
            if (count === 1) {
                this.warningMessage = `⚠️ ATTENTION ! Vous avez quitté la page examen. Plus que ${this.remainingAttempts} avertissement(s) avant blocage.`;
                this.snackBar.open(this.warningMessage, 'Fermer', { duration: 5000, panelClass: ['warning-snackbar'] });
            } else if (count === 2) {
                this.warningMessage = `⚠️ DERNIER AVERTISSEMENT ! Si vous quittez encore la page, votre examen sera bloqué.`;
                this.snackBar.open(this.warningMessage, 'Fermer', { duration: 5000, panelClass: ['danger-snackbar'] });
            } else {
                this.warningMessage = `⚠️ Avertissement ${count}/3 - Ne quittez pas la page examen !`;
            }
            
            setTimeout(() => {
                this.showWarningBanner = false;
            }, 5000);
        })
    );

    // ✅ ÉCOUTER LE BLOCAGE
    this.fraudSubscriptions.push(
        this.monitoringService.getBlockedStatus().subscribe(blocked => {
            if (blocked && !this.isBlocked) {
                this.isBlocked = true;
                if (this.timerInterval) clearInterval(this.timerInterval);
                
                this.dialogService.alert({
                    title: '🚫 EXAMEN BLOQUÉ',
                    message: 'Votre examen a été bloqué car vous avez quitté la page examen trop de fois. Contactez votre formateur.',
                    type: 'error',
                    confirmText: 'Fermer'
                });
                
                this.router.navigate(['/employee/mes-inscriptions']);
            }
        })
    );

    // ✅ ÉCOUTER LES TENTATIVES RESTANTES
    this.fraudSubscriptions.push(
        this.monitoringService.getRemainingAttempts().subscribe(remaining => {
            this.remainingAttempts = remaining;
        })
    );
}

    get reponsesArray(): FormArray {
        return this.examenForm.get('reponses') as FormArray;
    }

    getReponseControl(index: number): FormControl {
        return this.reponsesArray.at(index).get('reponse') as FormControl;
    }

   // examen-passer.component.ts

loadExamen(): void {
    // ✅ Vérifier que examenId existe
    if (!this.examenId) {
        console.error('❌ examenId est vide');
        this.router.navigate(['/employee/mes-inscriptions']);
        return;
    }
    
    this.isLoading = true;
    
    this.examenService.getExamenById(this.examenId).subscribe({
        next: (examen) => {
            this.examen = examen;
            
            // ✅ Vérifier que employeId existe
            if (!this.employeId) {
                console.error('❌ employeId est vide');
                this.dialogService.alert({
                    title: 'Erreur',
                    message: 'Impossible de vous identifier. Veuillez vous reconnecter.',
                    type: 'error',
                    confirmText: 'Fermer'
                });
                this.router.navigate(['/login']);
                return;
            }
            
            this.examenService.verifierAccesExamen(examen.formationId, this.employeId).subscribe({
                next: (status) => {
                    this.examenStatus = status;

                    if (status.dejaPasse) {
                        this.dialogService.alert({
                            title: 'Examen déjà passé',
                            message: `Vous avez déjà passé cet examen avec une note de ${status.note}/20.`,
                            type: 'info',
                            confirmText: 'Fermer'
                        });
                        this.router.navigate(['/employee/mes-inscriptions']);
                        return;
                    }

                    // ✅ NE PAS APPELER checkBlockedStatus ici car startMonitoring n'est pas encore démarré
                    // Les IDs sont déjà définis, on peut démarrer directement
                    
                    this.initReponses();
                    this.startTimer();
                    this.isLoading = false;
                    
                    // ✅ DÉMARRER LA SURVEILLANCE (les IDs sont déjà définis)
                    this.initFraudMonitoring();
                },
                error: (err) => {
                    console.error('Erreur vérification accès', err);
                    this.initReponses();
                    this.startTimer();
                    this.isLoading = false;
                    this.initFraudMonitoring();
                }
            });
        },
        error: (err) => {
            console.error('Erreur chargement examen', err);
            this.dialogService.alert({ 
                title: 'Erreur', 
                message: 'Impossible de charger l\'examen.', 
                type: 'error', 
                confirmText: 'Fermer' 
            });
            this.router.navigate(['/employee/mes-inscriptions']);
            this.isLoading = false;
        }
    });
}

    initReponses(): void {
        if (!this.examen?.questions) return;
        while (this.reponsesArray.length) this.reponsesArray.removeAt(0);
        this.examen.questions.forEach(question => {
            this.reponsesArray.push(this.fb.group({
                questionId: [question.id],
                reponse: ['']
            }));
        });
    }

    startTimer(): void {
        if (!this.examen?.dureeMinutes) return;
        this.tempsRestant = this.examen.dureeMinutes * 60;
        this.timerInterval = setInterval(() => {
            // ✅ Vérifier si bloqué avant de continuer
            if (this.isBlocked) {
                clearInterval(this.timerInterval);
                return;
            }
            
            if (this.tempsRestant <= 0) {
                clearInterval(this.timerInterval);
                this.soumettreAutomatiquement();
            } else {
                this.tempsRestant--;
            }
        }, 1000);
    }

    formatTemps(): string {
        const minutes = Math.floor(this.tempsRestant / 60);
        const secondes = this.tempsRestant % 60;
        return `${minutes}:${secondes.toString().padStart(2, '0')}`;
    }

    isTimerUrgent(): boolean {
        return this.tempsRestant <= 300;
    }

    getQuestionTypeIcon(type: string): string {
        const icons: { [key: string]: string } = { 'QCM': '🔘', 'TEXTE': '📝', 'CODE': '💻' };
        return icons[type] || '📄';
    }

    getProgression(): number {
        if (!this.examen?.questions?.length) return 0;
        const repondues = this.reponsesArray.controls.filter(c => c.get('reponse')?.value?.trim() !== '').length;
        return Math.round((repondues / this.examen.questions.length) * 100);
    }

    allerQuestion(index: number): void {
        // ✅ Vérifier si bloqué
        if (this.isBlocked) return;
        
        if (index >= 0 && index < (this.examen?.questions?.length || 0)) {
            this.questionActuelle = index;
        }
    }

    soumettreAutomatiquement(): void {
        if (this.isBlocked) return; // ✅ Vérifier blocage
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.soumettre();
    }

    soumettreExamen(): void {
        // ✅ Vérifier si bloqué
        if (this.isBlocked) {
            this.dialogService.alert({
                title: 'Examen bloqué',
                message: 'Vous ne pouvez pas soumettre car votre examen est bloqué.',
                type: 'error',
                confirmText: 'Fermer'
            });
            return;
        }
        
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.dialogService.confirm({
            title: 'Soumettre l\'examen',
            message: `Progression: ${this.getProgression()}% — Êtes-vous sûr de vouloir soumettre ?`,
            confirmText: 'Soumettre',
            cancelText: 'Annuler',
            type: 'confirm'
        }).subscribe((confirmed: boolean) => {
            if (confirmed) {
                this.soumettre();
            } else {
                this.startTimer();
            }
        });
    }

    private soumettre(): void {
        // ✅ Vérifier blocage une dernière fois
        if (this.isBlocked) {
            this.dialogService.alert({
                title: 'Examen bloqué',
                message: 'Soumission impossible - Examen bloqué pour fraude.',
                type: 'error',
                confirmText: 'Fermer'
            });
            this.isSubmitting = false;
            return;
        }
        
        this.isSubmitting = true;
        
        // ✅ Arrêter la surveillance avant soumission
        this.monitoringService.stopMonitoring();
        
        const reponses: Reponse[] = [];
        
        console.log('=== DÉBUT SOUMISSION ===');
        
        for (let i = 0; i < this.reponsesArray.length; i++) {
            const control = this.reponsesArray.at(i);
            const questionId = control.get('questionId')?.value;
            let reponse = control.get('reponse')?.value;
            
            console.log(`Question ${i+1}: ID=${questionId}, Valeur brute="${reponse}"`);
            
            if (reponse === undefined || reponse === null) {
                reponse = '';
            }
            
            reponses.push({
                questionId: questionId,
                reponse: String(reponse),
                pointsObtenus: 0
            });
        }
        
        console.log('📤 Réponses soumises:', JSON.stringify(reponses, null, 2));
        
        this.examenService.soumettreExamen(this.examenId, this.employeId, reponses).subscribe({
            next: (resultat) => {
                console.log('📥 Résultat reçu:', resultat);
                
                const pourcentage = Math.round(resultat.note * 5);
                
                if (resultat.note > 15) {
                    this.snackBar.open(
                        `🎉 FÉLICITATIONS ! +500 POINTS BONUS pour votre note exceptionnelle de ${resultat.note}/20 ! 🎉`,
                        'Fermer',
                        { 
                            duration: 8000,
                            panelClass: ['bonus-snackbar'],
                            verticalPosition: 'top',
                            horizontalPosition: 'center'
                        }
                    );
                    
                    this.pointsService.refreshPoints(this.employeId);
                    
                    const messageBonus = resultat.valide
                        ? `🎉 Félicitations ! Note: ${resultat.note}/20 (${pourcentage}%).\n\n🎁 BONUS : +500 points ajoutés à votre compte pour votre excellence !\n\nCertification envoyée par email !`
                        : `Note: ${resultat.note}/20 (${pourcentage}%). Seuil requis: 10/20.`;
                    
                    this.dialogService.alert({
                        title: resultat.note > 15 ? '🏆 EXCEPTIONNEL !' : (resultat.valide ? '🏆 Réussi !' : '📊 Examen terminé'),
                        message: messageBonus,
                        type: resultat.valide ? 'success' : 'info',
                        confirmText: 'Voir mes inscriptions'
                    });
                } else {
                    const message = resultat.valide
                        ? `🎉 Félicitations ! Note: ${resultat.note}/20 (${pourcentage}%). Certification envoyée par email !`
                        : `Note: ${resultat.note}/20 (${pourcentage}%). Seuil requis: 10/20.`;
                    
                    this.dialogService.alert({
                        title: resultat.valide ? '🏆 Réussi !' : '📊 Examen terminé',
                        message,
                        type: resultat.valide ? 'success' : 'info',
                        confirmText: 'Voir mes inscriptions'
                    });
                }
                
                this.router.navigate(['/employee/mes-inscriptions']);
                this.isSubmitting = false;
            },
            error: (err) => {
                console.error('❌ Erreur soumission:', err);
                
                // ✅ GÉRER L'ERREUR DE BLOCAGE
                if (err.error?.message?.includes('bloqué')) {
                    this.dialogService.alert({
                        title: 'Examen bloqué',
                        message: err.error.message,
                        type: 'error',
                        confirmText: 'Fermer'
                    });
                    this.router.navigate(['/employee/mes-inscriptions']);
                } else {
                    this.dialogService.alert({
                        title: 'Erreur',
                        message: err.error?.message || err.message || 'Impossible de soumettre l\'examen.',
                        type: 'error',
                        confirmText: 'Fermer'
                    });
                }
                this.isSubmitting = false;
            }
        });
    }

    annuler(): void {
        if (this.timerInterval) clearInterval(this.timerInterval);
        
        // ✅ Demander confirmation avant de quitter
        this.dialogService.confirm({
            title: 'Quitter l\'examen',
            message: 'Votre progression sera perdue. Continuer ?',
            confirmText: 'Quitter',
            cancelText: 'Rester',
            type: 'warning'
        }).subscribe((confirmed: boolean) => {
            if (confirmed) {
                this.monitoringService.stopMonitoring();
                this.router.navigate(['/employee/mes-inscriptions']);
            } else {
                this.startTimer();
            }
        });
    }
}