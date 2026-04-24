import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
    providedIn: 'root'
})
export class NotificationService {
    constructor(private snackBar: MatSnackBar) {}

    success(message: string, title: string = 'Succès', duration: number = 3000): void {
        this.snackBar.open(title + ': ' + message, 'Fermer', {
            duration: duration,
            horizontalPosition: 'end',
            verticalPosition: 'top',
            panelClass: ['success-snackbar']
        });
    }

    error(message: string, title: string = 'Erreur', duration: number = 5000): void {
        this.snackBar.open(title + ': ' + message, 'Fermer', {
            duration: duration,
            horizontalPosition: 'end',
            verticalPosition: 'top',
            panelClass: ['error-snackbar']
        });
    }

    warning(message: string, title: string = 'Attention', duration: number = 4000): void {
        this.snackBar.open(title + ': ' + message, 'Fermer', {
            duration: duration,
            horizontalPosition: 'end',
            verticalPosition: 'top',
            panelClass: ['warning-snackbar']
        });
    }

    info(message: string, title: string = 'Information', duration: number = 3000): void {
        this.snackBar.open(title + ': ' + message, 'Fermer', {
            duration: duration,
            horizontalPosition: 'end',
            verticalPosition: 'top',
            panelClass: ['info-snackbar']
        });
    }
}
