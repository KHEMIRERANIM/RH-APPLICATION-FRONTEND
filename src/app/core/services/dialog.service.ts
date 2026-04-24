import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../components/confirm-dialog/confirm-dialog.component';
import { Observable } from 'rxjs';

export interface DialogOptions {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'success' | 'error' | 'warning' | 'info' | 'confirm';
    showCancel?: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class DialogService {
    constructor(private dialog: MatDialog) {}

    confirm(options: DialogOptions): Observable<boolean> {
        const dialogRef = this.dialog.open(ConfirmDialogComponent, {
            width: '450px',
            maxWidth: '90vw',
            data: { ...options, showCancel: true },
            disableClose: true,
            panelClass: 'modern-dialog'
        });
        return dialogRef.afterClosed();
    }

    alert(options: DialogOptions): Observable<void> {
        const dialogRef = this.dialog.open(ConfirmDialogComponent, {
            width: '400px',
            maxWidth: '90vw',
            data: { ...options, showCancel: false },
            disableClose: true,
            panelClass: 'modern-dialog'
        });
        return dialogRef.afterClosed();
    }
}
