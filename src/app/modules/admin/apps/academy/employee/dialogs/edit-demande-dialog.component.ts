import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { AcademyService } from '../../academy.service';
import { DemandeConge } from '../../academy.types';

@Component({
    selector: 'edit-demande-dialog',
    template: `
        <div class="p-5">
            <h2 class="text-xl font-semibold mb-4 flex items-center gap-2">
                <mat-icon class="text-primary">edit</mat-icon>
                Modifier la demande de congé
            </h2>

            <form [formGroup]="demandeForm" class="flex flex-col gap-4">
                <mat-form-field appearance="outline">
                    <mat-label>Type de congé</mat-label>
                    <mat-select formControlName="type" required>
                        <mat-option value="CONGE_ANNUEL">📅 Congé Annuel</mat-option>
                        <mat-option value="CONGE_MALADIE">🤒 Congé Maladie</mat-option>
                        <mat-option value="CONGE_MATERNITE">👶 Congé Maternité</mat-option>
                        <mat-option value="CONGE_PATERNITE">👨‍🍼 Congé Paternité</mat-option>
                        <mat-option value="CONGE_SANS_SOLDE">💰 Congé Sans Solde</mat-option>
                        <mat-option value="AUTRE">📝 Autre</mat-option>
                    </mat-select>
                </mat-form-field>

                <div class="grid grid-cols-2 gap-4">
                    <mat-form-field appearance="outline">
                        <mat-label>Date de début</mat-label>
                        <input matInput [matDatepicker]="pickerDebut" formControlName="dateDebut" required>
                        <mat-datepicker-toggle matSuffix [for]="pickerDebut"></mat-datepicker-toggle>
                        <mat-datepicker #pickerDebut></mat-datepicker>
                    </mat-form-field>

                    <mat-form-field appearance="outline">
                        <mat-label>Date de fin</mat-label>
                        <input matInput [matDatepicker]="pickerFin" formControlName="dateFin" required>
                        <mat-datepicker-toggle matSuffix [for]="pickerFin"></mat-datepicker-toggle>
                        <mat-datepicker #pickerFin></mat-datepicker>
                    </mat-form-field>
                </div>

                <mat-form-field appearance="outline">
                    <mat-label>Motif</mat-label>
                    <textarea matInput formControlName="motif" rows="3" placeholder="Décrivez la raison de votre congé..."></textarea>
                </mat-form-field>

                <div *ngIf="nombreJours > 0" class="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div class="text-sm text-blue-700 dark:text-blue-300">
                        📊 Nombre de jours : <strong>{{nombreJours}} jour(s)</strong>
                    </div>
                </div>

                <div class="flex justify-end gap-3 mt-2 pt-2 border-t">
                    <button mat-button (click)="dialogRef.close()">Annuler</button>
                    <button mat-flat-button color="primary" [disabled]="demandeForm.invalid" (click)="onSubmit()">
                        Enregistrer
                    </button>
                </div>
            </form>
        </div>
    `
})
export class EditDemandeDialogComponent {
    demandeForm: FormGroup;
    nombreJours: number = 0;

    constructor(
        public dialogRef: MatDialogRef<EditDemandeDialogComponent>,
        private fb: FormBuilder,
        private academyService: AcademyService,
        @Inject(MAT_DIALOG_DATA) public data: { demande: DemandeConge }
    ) {
        const dateDebut = new Date(data.demande.dateDebut);
        const dateFin = new Date(data.demande.dateFin);
        
        this.demandeForm = this.fb.group({
            type: [data.demande.type, Validators.required],
            dateDebut: [dateDebut, Validators.required],
            dateFin: [dateFin, Validators.required],
            motif: [data.demande.motif || '']
        });

        this.demandeForm.valueChanges.subscribe(() => {
            this.calculerJours();
        });
        this.calculerJours();
    }

    calculerJours(): void {
        const debut = this.demandeForm.get('dateDebut')?.value;
        const fin = this.demandeForm.get('dateFin')?.value;
        
        if (debut && fin && fin >= debut) {
            const diffTime = Math.abs(fin - debut);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            this.nombreJours = diffDays;
        } else {
            this.nombreJours = 0;
        }
    }

    onSubmit(): void {
        if (this.demandeForm.valid) {
            const request = {
                employeId: this.data.demande.employeId,
                managerId: this.data.demande.managerId,
                dateDebut: this.demandeForm.value.dateDebut,
                dateFin: this.demandeForm.value.dateFin,
                motif: this.demandeForm.value.motif || 'Demande de congé',
                type: this.demandeForm.value.type
            };
            
            this.academyService.modifierDemande(this.data.demande.id, request).subscribe({
                next: () => this.dialogRef.close(true),
                error: (err) => alert('Erreur: ' + err.message)
            });
        }
    }
}