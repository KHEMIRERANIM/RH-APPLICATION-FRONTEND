import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { SoldeConge } from '../../academy.types';

@Component({
    selector: 'solde-conge-dialog',
    template: `
        <div class="p-6">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-xl font-semibold">Solde de congés</h2>
                <button mat-icon-button (click)="dialogRef.close()">
                    <mat-icon>close</mat-icon>
                </button>
            </div>

            <div class="text-center mb-6">
                <div class="text-5xl font-bold text-primary">{{solde.joursRestants}}</div>
                <div class="text-secondary">Jours restants</div>
            </div>

            <div class="grid grid-cols-3 gap-4">
                <div class="text-center p-3 bg-gray-100 dark:bg-gray-800 rounded">
                    <div class="text-2xl font-semibold">{{solde.joursTotal}}</div>
                    <div class="text-xs text-secondary">Total annuel</div>
                </div>
                <div class="text-center p-3 bg-gray-100 dark:bg-gray-800 rounded">
                    <div class="text-2xl font-semibold text-amber-600">{{solde.joursUtilises}}</div>
                    <div class="text-xs text-secondary">Utilisés</div>
                </div>
                <div class="text-center p-3 bg-gray-100 dark:bg-gray-800 rounded">
                    <div class="text-2xl font-semibold text-blue-600">{{solde.joursEnAttente}}</div>
                    <div class="text-xs text-secondary">En attente</div>
                </div>
            </div>

            <div class="mt-6 text-sm text-secondary text-center">
                Année: {{solde.annee}}
            </div>
        </div>
    `
})
export class SoldeCongeDialogComponent {
    constructor(
        public dialogRef: MatDialogRef<SoldeCongeDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public solde: SoldeConge
    ) {}
}