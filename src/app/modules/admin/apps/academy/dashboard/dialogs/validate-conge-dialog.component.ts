import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { AcademyService } from '../../academy.service';
import { DemandeConge, StatutConge } from '../../academy.types';

@Component({
    selector: 'validate-conge-dialog',
    template: `
        <div class="p-6">
            <h2 class="text-xl font-semibold mb-4">
                {{ data.decision === 'APPROUVE' ? 'Approuver' : 'Refuser' }} la demande de congé
            </h2>
            
            <div class="mb-4 p-3 bg-gray-100 dark:bg-gray-800 rounded">
                <p><strong>Employé:</strong> {{ getEmployeNom(data.demande.employeId) }}</p>
                <p><strong>Période:</strong> {{ data.demande.dateDebut | date }} - {{ data.demande.dateFin | date }}</p>
                <p><strong>Jours:</strong> {{ data.demande.nombreJours }}</p>
                <p><strong>Motif:</strong> {{ data.demande.motif }}</p>
            </div>

            <form [formGroup]="commentForm">
                <mat-form-field class="w-full">
                    <mat-label>
                        {{ data.decision === 'APPROUVE' ? 'Commentaire (optionnel)' : 'Motif du refus' }}
                    </mat-label>
                    <textarea matInput formControlName="commentaireManager" rows="3"></textarea>
                </mat-form-field>
            </form>

            <div class="flex justify-end gap-3 mt-4">
                <button mat-button (click)="dialogRef.close(false)">Annuler</button>
                <button 
                    mat-flat-button 
                    [color]="data.decision === 'APPROUVE' ? 'primary' : 'warn'"
                    [disabled]="isLoading"
                    (click)="onSubmit()">
                    {{ isLoading ? 'Chargement...' : (data.decision === 'APPROUVE' ? 'Approuver' : 'Refuser') }}
                </button>
            </div>
        </div>
    `
})
export class ValidateCongeDialogComponent {
    commentForm: FormGroup;
    isLoading = false;

    constructor(
        public dialogRef: MatDialogRef<ValidateCongeDialogComponent>,
        private fb: FormBuilder,
        private academyService: AcademyService,
        @Inject(MAT_DIALOG_DATA) public data: { demande: DemandeConge, decision: 'APPROUVE' | 'REFUSE' }
    ) {
        this.commentForm = this.fb.group({
            commentaireManager: ['']
        });
    }

    getEmployeNom(employeId: string): string {
        return this.academyService.getEmployeNom(employeId);
    }

    onSubmit(): void {
        this.isLoading = true;
        const validation = {
            statut: this.data.decision as StatutConge,
            commentaireManager: this.commentForm.value.commentaireManager || ''
        };
        this.academyService.validerDemande(this.data.demande.id, validation).subscribe({
            next: () => {
                this.isLoading = false;
                // Fermer le dialogue avec succès
                this.dialogRef.close(true);
            },
            error: (err) => {
                this.isLoading = false;
                console.error('Erreur validation:', err);
                alert('Erreur lors de la validation');
                // Ne pas fermer le dialogue en cas d'erreur
            }
        });
    }
}