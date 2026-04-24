// src/app/modules/employee/components/feedback-ia-dialog/feedback-ia-dialog.component.ts
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ResultatExamen, Examen, Question, CorrectionDetaillee } from '../../../../shared/models/formation.model';  // ← CHANGER ICI

@Component({
    selector: 'app-feedback-ia-dialog',
    templateUrl: './feedback-ia-dialog.component.html',
    styleUrls: ['./feedback-ia-dialog.component.scss']
})
export class FeedbackIaDialogComponent {
    correctionDetaillee: CorrectionDetaillee = {};
    examen: Examen | null = null;

    constructor(
        public dialogRef: MatDialogRef<FeedbackIaDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { resultat: ResultatExamen; examen: Examen }
    ) {
        this.examen = data.examen;
        this.parserCorrectionDetaillee(data.resultat.correctionDetaillee);
    }

    parserCorrectionDetaillee(correctionDetailleeJson?: string): void {
        if (!correctionDetailleeJson) return;
        try {
            this.correctionDetaillee = JSON.parse(correctionDetailleeJson);
        } catch (e) {
            console.error('Erreur parsing correction détaillée', e);
        }
    }

    getQuestionById(questionId: string): Question | undefined {
        return this.examen?.questions?.find(q => q.id === questionId);
    }

    getReponseForQuestion(questionId: string): string {
        const reponse = this.data.resultat.reponses?.find(r => r.questionId === questionId);
        return reponse?.reponse || 'Aucune réponse';
    }

    getPointsForQuestion(questionId: string): number {
        const reponse = this.data.resultat.reponses?.find(r => r.questionId === questionId);
        return reponse?.pointsObtenus || 0;
    }

    getMaxPointsForQuestion(questionId: string): number {
        const question = this.getQuestionById(questionId);
        return question?.points || 1;
    }

    getFeedbackForQuestion(questionId: string): { feedback: string; commentaire: string } | null {
        const detail = this.correctionDetaillee[questionId];
        if (detail) {
            return {
                feedback: detail.feedback || 'Aucun feedback',
                commentaire: detail.commentaireIa || ''
            };
        }
        
        const reponse = this.data.resultat.reponses?.find(r => r.questionId === questionId);
        if (reponse?.feedback || reponse?.commentaireIa) {
            return {
                feedback: reponse.feedback || '',
                commentaire: reponse.commentaireIa || ''
            };
        }
        
        return null;
    }

    getQuestionTypeIcon(type: string): string {
        const icons: { [key: string]: string } = { 'QCM': '🔘', 'TEXTE': '📝', 'CODE': '💻' };
        return icons[type] || '📄';
    }

    close(): void {
        this.dialogRef.close();
    }
}