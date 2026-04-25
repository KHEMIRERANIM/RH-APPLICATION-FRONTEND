import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { AcademyService } from '../../academy.service';

@Component({
    selector: 'new-demande-dialog',
    template: `
        <div class="p-5 max-h-[85vh] overflow-y-auto">
            <h2 class="text-xl font-semibold mb-4 flex items-center gap-2">
                <mat-icon class="text-primary">event_add</mat-icon>
                Nouvelle demande de congé
            </h2>

            <!-- Bannière suggestion IA (si date suggérée) -->
            <div *ngIf="data.dateSuggestion" class="mb-4 p-3 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg text-white text-sm">
                <div class="flex items-center gap-2">
                    <mat-icon>auto_awesome</mat-icon>
                    <span class="font-semibold">IA Recommendation</span>
                </div>
                <p class="mt-1">La date de début a été pré-remplie selon notre recommandation (période calme détectée).</p>
            </div>

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
                    <mat-label>Motif (optionnel)</mat-label>
                    <textarea matInput formControlName="motif" rows="3" placeholder="Décrivez la raison de votre congé..."></textarea>
                </mat-form-field>

                <!-- Upload document -->
                <div class="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                    <input type="file" #fileInput (change)="onFileSelected($event)" accept=".pdf,.jpg,.png,.jpeg" class="hidden">
                    <div *ngIf="!selectedFileName" class="text-secondary">
                        <mat-icon class="icon-size-10">cloud_upload</mat-icon>
                        <p class="mt-2">Glissez ou cliquez pour joindre un justificatif</p>
                        <p class="text-xs mt-1">PDF, JPG, PNG (max 5MB)</p>
                        <button mat-stroked-button color="primary" type="button" (click)="fileInput.click()" class="mt-2">
                            Choisir un fichier
                        </button>
                    </div>
                    <div *ngIf="selectedFileName" class="flex items-center justify-between bg-gray-100 dark:bg-gray-800 p-2 rounded">
                        <div class="flex items-center gap-2">
                            <mat-icon>description</mat-icon>
                            <span class="text-sm">{{selectedFileName}}</span>
                        </div>
                        <button mat-icon-button color="warn" type="button" (click)="removeFile()">
                            <mat-icon>close</mat-icon>
                        </button>
                    </div>
                </div>

                <div *ngIf="nombreJours > 0" class="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div class="text-sm text-blue-700 dark:text-blue-300">
                        📊 Nombre de jours ouvrés : <strong>{{nombreJours}} jour(s)</strong>
                    </div>
                </div>

                <div class="flex justify-end gap-3 mt-2 pt-2 border-t">
                    <button mat-button (click)="dialogRef.close()">Annuler</button>
                    <button mat-flat-button color="primary" [disabled]="demandeForm.invalid" (click)="onSubmit()">
                        Envoyer la demande
                    </button>
                </div>
            </form>
        </div>
    `
})
export class NewDemandeDialogComponent {
    demandeForm: FormGroup;
    nombreJours: number = 0;
    selectedFile: File | null = null;
    selectedFileName: string = '';

    constructor(
        public dialogRef: MatDialogRef<NewDemandeDialogComponent>,
        private fb: FormBuilder,
        private academyService: AcademyService,
        @Inject(MAT_DIALOG_DATA) public data: { employeId: string; managerId: string; dateSuggestion?: string }
    ) {
        this.demandeForm = this.fb.group({
            type: ['CONGE_ANNUEL', Validators.required],
            // ✅ MODIFICATION ICI : Pré-remplit la date de début si une suggestion IA est fournie
            dateDebut: [data.dateSuggestion ? new Date(data.dateSuggestion) : '', Validators.required],
            dateFin: ['', Validators.required],
            motif: ['']
        });

        this.demandeForm.valueChanges.subscribe(() => {
            this.calculerJours();
        });
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

    onFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files.length > 0) {
            const file = input.files[0];
            const maxSize = 5 * 1024 * 1024; // 5MB
            const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
            
            if (file.size > maxSize) {
                alert('Le fichier ne doit pas dépasser 5MB');
                return;
            }
            
            if (!allowedTypes.includes(file.type)) {
                alert('Format non supporté. Utilisez PDF, JPG ou PNG');
                return;
            }
            
            this.selectedFile = file;
            this.selectedFileName = file.name;
        }
    }

    removeFile(): void {
        this.selectedFile = null;
        this.selectedFileName = '';
    }

    onSubmit(): void {
        if (this.demandeForm.valid) {
            const formData = new FormData();
            formData.append('employeId', this.data.employeId);
            formData.append('managerId', this.data.managerId);
            formData.append('dateDebut', this.demandeForm.value.dateDebut);
            formData.append('dateFin', this.demandeForm.value.dateFin);
            formData.append('motif', this.demandeForm.value.motif || 'Demande de congé');
            formData.append('type', this.demandeForm.value.type);
            
            if (this.selectedFile) {
                formData.append('document', this.selectedFile);
            }
            
            this.academyService.soumettreDemandeWithFile(formData).subscribe({
                next: () => this.dialogRef.close(true),
                error: (err) => alert('Erreur: ' + (err.error?.message || err.message))
            });
        }
    }
}