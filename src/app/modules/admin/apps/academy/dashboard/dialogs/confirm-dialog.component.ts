import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
    selector: 'confirm-dialog',
    template: `
        <div class="p-6">
            <div class="flex items-center gap-3 mb-4">
                <mat-icon class="text-red-500 text-2xl">warning</mat-icon>
                <h2 class="text-xl font-semibold">Confirmation de suppression</h2>
            </div>
            
            <p class="mb-2">{{ data.message }}</p>
            <p class="text-sm text-secondary" *ngIf="data.details">{{ data.details }}</p>
            
            <div class="flex justify-end gap-3 mt-6">
                <button mat-button (click)="dialogRef.close(false)">
                    <mat-icon>close</mat-icon>
                    Annuler
                </button>
                <button mat-flat-button color="warn" (click)="dialogRef.close(true)">
                    <mat-icon>delete</mat-icon>
                    Supprimer
                </button>
            </div>
        </div>
    `
})
export class ConfirmDialogComponent {
    constructor(
        public dialogRef: MatDialogRef<ConfirmDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { message: string; details?: string }
    ) {}
}