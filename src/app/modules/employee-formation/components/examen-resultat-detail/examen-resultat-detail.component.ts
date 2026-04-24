// src/app/modules/employee/components/examen-resultat-detail/examen-resultat-detail.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ExamenService } from '../../services/examen.service';
import { DialogService } from '../../../../core/services/dialog.service';
import { ResultatExamen, Examen, Question, CorrectionDetaillee, Reponse } from '../../../../shared/models/formation.model';

@Component({
    selector: 'app-examen-resultat-detail',
    templateUrl: './examen-resultat-detail.component.html',
    styleUrls: ['./examen-resultat-detail.component.scss']
})
export class ExamenResultatDetailComponent implements OnInit {
    examenId: string = '';
    employeId: string = '';
    resultat: ResultatExamen | null = null;
    examen: Examen | null = null;
    isLoading = true;
    
    // Correction détaillée parsée
    correctionDetaillee: CorrectionDetaillee = {};
    
    // Onglet actif
    activeTab: 'resume' | 'details' | 'global' = 'resume';
    
    // Question sélectionnée pour le détail
    selectedQuestionIndex: number = 0;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private examenService: ExamenService,
        private dialogService: DialogService
    ) {}

    ngOnInit(): void {
        this.employeId = localStorage.getItem('userId') || '';
        this.route.params.subscribe(params => {
            this.examenId = params['examenId'];
            this.loadData();
        });
    }

    loadData(): void {
        this.isLoading = true;
        
        Promise.all([
            this.loadExamen(),
            this.loadResultat()
        ]).finally(() => {
            this.isLoading = false;
        });
    }

    loadExamen(): Promise<void> {
        return new Promise((resolve) => {
            this.examenService.getExamenById(this.examenId).subscribe({
                next: (examen) => {
                    this.examen = examen;
                    resolve();
                },
                error: (err) => {
                    console.error('Erreur chargement examen', err);
                    resolve();
                }
            });
        });
    }

    loadResultat(): Promise<void> {
        return new Promise((resolve) => {
            this.examenService.getResultatByEmploye(this.examenId, this.employeId).subscribe({
                next: (resultat) => {
                    this.resultat = resultat;
                    this.parserCorrectionDetaillee(resultat.correctionDetaillee);
                    resolve();
                },
                error: (err) => {
                    console.error('Erreur chargement résultat', err);
                    this.dialogService.alert({
                        title: 'Erreur',
                        message: 'Impossible de charger vos résultats',
                        type: 'error'
                    });
                    this.router.navigate(['/employee/mes-inscriptions']);
                    resolve();
                }
            });
        });
    }

    parserCorrectionDetaillee(correctionDetailleeJson?: string): void {
        if (!correctionDetailleeJson) return;
        
        try {
            this.correctionDetaillee = JSON.parse(correctionDetailleeJson);
            console.log('✅ Correction détaillée parsée:', this.correctionDetaillee);
        } catch (e) {
            console.error('Erreur parsing correction détaillée', e);
        }
    }

    // ==================== MÉTHODES UTILITAIRES ====================

    getQuestionById(questionId: string): Question | undefined {
        return this.examen?.questions?.find(q => q.id === questionId);
    }

    getReponseForQuestion(questionId: string): Reponse | undefined {
        return this.resultat?.reponses?.find(r => r.questionId === questionId);
    }

    getFeedbackForQuestion(questionId: string): { feedback: string; commentaire: string } | null {
        const detail = this.correctionDetaillee[questionId];
        if (detail) {
            return {
                feedback: detail.feedback || 'Aucun feedback',
                commentaire: detail.commentaireIa || ''
            };
        }
        
        const reponse = this.getReponseForQuestion(questionId);
        if (reponse?.feedback || reponse?.commentaireIa) {
            return {
                feedback: reponse.feedback || '',
                commentaire: reponse.commentaireIa || ''
            };
        }
        
        return null;
    }

    formatReponse(reponse: string): string {
        if (!reponse) return 'Aucune réponse';
        return reponse.replace(/\n/g, '<br>');
    }

    getQuestionTypeIcon(type: string): string {
        const icons: { [key: string]: string } = {
            'QCM': '🔘',
            'TEXTE': '📝',
            'CODE': '💻'
        };
        return icons[type] || '📄';
    }

    // ==================== STATISTIQUES ET AFFICHAGE ====================

    getNoteClass(): string {
        if (!this.resultat) return '';
        const note = this.resultat.note;
        if (note >= 15) return 'note-excellent';
        if (note >= 12) return 'note-bien';
        if (note >= 10) return 'note-passable';
        return 'note-insuffisant';
    }

    getNoteIcon(): string {
        if (!this.resultat) return '📊';
        const note = this.resultat.note;
        if (note >= 15) return '🏆';
        if (note >= 12) return '👍';
        if (note >= 10) return '✅';
        return '📚';
    }

    getNoteMoyenne(): number {
        return this.resultat?.note || 0;
    }

    getTauxReussite(): number {
        if (!this.resultat) return 0;
        return this.resultat.note >= 10 ? 100 : 0;
    }

    getPourcentage(): number {
        if (!this.resultat) return 0;
        return Math.round((this.resultat.note / 20) * 100);
    }

    getStatutText(): string {
        if (!this.resultat) return '';
        return this.resultat.note >= 10 ? 'Réussi' : 'Échoué';
    }

    getStatutClass(): string {
        if (!this.resultat) return '';
        return this.resultat.note >= 10 ? 'statut-reussi' : 'statut-echoue';
    }

    getQuestionsRepondues(): number {
        if (!this.resultat?.reponses) return 0;
        return this.resultat.reponses.filter(r => r.reponse && r.reponse.trim() !== '').length;
    }

    getTotalQuestions(): number {
        return this.examen?.questions?.length || 0;
    }

    getProgression(): number {
        const total = this.getTotalQuestions();
        if (total === 0) return 0;
        return Math.round((this.getQuestionsRepondues() / total) * 100);
    }

    getScoreParQuestion(): { points: number; max: number; pourcentage: number }[] {
        if (!this.examen?.questions || !this.resultat?.reponses) return [];
        
        return this.examen.questions.map(question => {
            const reponse = this.getReponseForQuestion(question.id);
            const points = reponse?.pointsObtenus || 0;
            const max = question.points || 1;
            return {
                points,
                max,
                pourcentage: Math.round((points / max) * 100)
            };
        });
    }

    // ==================== ACTIONS ====================

    telechargerCertification(): void {
        if (!this.resultat?.valide) {
            this.dialogService.alert({
                title: 'Certification non disponible',
                message: 'Vous devez réussir l\'examen pour obtenir la certification.',
                type: 'warning'
            });
            return;
        }
        
        if (!this.examen) return;
        
        this.examenService.telechargerCertification(this.examen.formationId, this.employeId).subscribe({
            next: (blob) => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `certification_${this.examen?.titre || 'examen'}_${new Date().toISOString().split('T')[0]}.pdf`;
                a.click();
                window.URL.revokeObjectURL(url);
                
                this.dialogService.alert({
                    title: 'Téléchargement',
                    message: 'Votre certification a été téléchargée.',
                    type: 'success'
                });
            },
            error: (err) => {
                console.error('Erreur téléchargement certification', err);
                this.dialogService.alert({
                    title: 'Erreur',
                    message: 'Impossible de télécharger la certification.',
                    type: 'error'
                });
            }
        });
    }

    imprimerResultat(): void {
        window.print();
    }

    retour(): void {
        this.router.navigate(['/employee/mes-inscriptions']);
    }
}