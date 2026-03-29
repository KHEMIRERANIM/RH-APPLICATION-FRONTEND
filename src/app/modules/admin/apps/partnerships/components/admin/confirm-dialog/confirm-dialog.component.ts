import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface ConfirmDialogData {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    icon?: string;
    color?: 'primary' | 'warn' | 'success';
}

@Component({
    selector: 'partnerships-confirm-dialog',
    template: `
    <div class="confirm-dialog-wrapper">
        <div class="confirm-icon-ring" [ngClass]="'ring-' + (data.color || 'primary')">
            <mat-icon [svgIcon]="data.icon || 'heroicons_outline:question-mark-circle'"></mat-icon>
        </div>
        <h2 class="confirm-title">{{ data.title }}</h2>
        <p class="confirm-message">{{ data.message }}</p>
        <div class="confirm-actions">
            <button mat-stroked-button class="btn-no" (click)="cancel()">
                <mat-icon svgIcon="heroicons_outline:x"></mat-icon>
                {{ data.cancelLabel || 'Non, annuler' }}
            </button>
            <button mat-flat-button class="btn-yes" [ngClass]="'btn-yes-' + (data.color || 'primary')" (click)="confirm()">
                <mat-icon svgIcon="heroicons_outline:check"></mat-icon>
                {{ data.confirmLabel || 'Oui, confirmer' }}
            </button>
        </div>
    </div>
    `,
    styles: [`
        .confirm-dialog-wrapper {
            padding: 2rem 1.75rem 1.5rem;
            text-align: center;
            min-width: 340px;
            max-width: 420px;
        }

        .confirm-icon-ring {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 68px;
            height: 68px;
            border-radius: 50%;
            margin-bottom: 1.25rem;

            mat-icon {
                width: 32px;
                height: 32px;
                font-size: 32px;
            }
            &.ring-primary {
                background: rgba(99, 102, 241, 0.12);
                color: #6366f1;
            }
            &.ring-success {
                background: rgba(16, 185, 129, 0.12);
                color: #10b981;
            }
            &.ring-warn {
                background: rgba(239, 68, 68, 0.12);
                color: #ef4444;
            }
        }

        .confirm-title {
            font-size: 1.15rem;
            font-weight: 700;
            color: #0f172a;
            margin: 0 0 0.6rem;
        }

        .confirm-message {
            font-size: 0.875rem;
            color: #64748b;
            line-height: 1.6;
            margin: 0 0 1.75rem;
        }

        .confirm-actions {
            display: flex;
            gap: 0.75rem;
            justify-content: center;

            button {
                min-width: 130px;
                height: 42px;
                border-radius: 10px !important;
                font-weight: 600 !important;
                font-size: 0.875rem !important;
                display: flex !important;
                align-items: center !important;
                gap: 0.4rem !important;
            }

            .btn-no {
                color: #64748b;
                border-color: #e2e8f0 !important;
                &:hover { background: #f8fafc; }
            }

            .btn-yes {
                color: white !important;
            }
            .btn-yes-primary { background: #6366f1 !important; }
            .btn-yes-primary:hover { background: #4f46e5 !important; box-shadow: 0 4px 12px rgba(99,102,241,0.35) !important; }
            .btn-yes-success { background: #10b981 !important; }
            .btn-yes-success:hover { background: #059669 !important; box-shadow: 0 4px 12px rgba(16,185,129,0.35) !important; }
            .btn-yes-warn { background: #ef4444 !important; }
            .btn-yes-warn:hover { background: #dc2626 !important; }
        }
    `]
})
export class ConfirmDialogComponent {
    constructor(
        public dialogRef: MatDialogRef<ConfirmDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData
    ) {}

    confirm(): void { this.dialogRef.close(true); }
    cancel(): void  { this.dialogRef.close(false); }
}
