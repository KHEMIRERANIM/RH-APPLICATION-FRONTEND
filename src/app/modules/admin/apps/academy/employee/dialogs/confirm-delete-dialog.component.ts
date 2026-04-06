import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
    selector: 'confirm-delete-dialog',
    template: `
        <div class="p-6">
            <div class="flex items-center gap-3 mb-4">
                <span class="text-red-500 text-2xl">⚠️</span>
                <h2 class="text-xl font-semibold">Confirmation de suppression</h2>
            </div>
            
            <p class="mb-2 text-gray-700">{{ data.message }}</p>
            
            <div *ngIf="data.details" class="mt-3 p-3 bg-gray-100 rounded-lg">
                <p class="text-sm"><strong>📅 Période:</strong> {{ data.details }}</p>
                <p class="text-sm mt-1"><strong>📝 Motif:</strong> {{ data.motif || '-' }}</p>
            </div>
            
            <div class="mt-4 text-sm text-red-600">
                ⚠️ Cette action est irréversible.
            </div>
            
            <div class="flex justify-end gap-3 mt-6">
                <button mat-button (click)="dialogRef.close(false)">
                    <span>❌</span> Annuler
                </button>
                <button mat-flat-button color="warn" (click)="dialogRef.close(true)">
                    <span>🗑️</span> Supprimer définitivement
                </button>
            </div>
        </div>
    `
})
export class ConfirmDeleteDialogComponent {
    constructor(
        public dialogRef: MatDialogRef<ConfirmDeleteDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { message: string; details?: string; motif?: string }
    ) {}
}