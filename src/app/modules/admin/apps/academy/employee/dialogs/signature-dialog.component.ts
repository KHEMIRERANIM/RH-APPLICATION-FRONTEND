import { Component, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import SignaturePad from 'signature_pad';

@Component({
    selector: 'signature-dialog',
    template: `
        <div class="p-6">
            <div class="flex items-center gap-2 mb-4">
                <span class="text-2xl">✍️</span>
                <h2 class="text-xl font-semibold">Signature électronique</h2>
            </div>
            
            <p class="text-secondary mb-4">Veuillez signer dans le cadre ci-dessous pour confirmer votre demande</p>
            
            <div class="border-2 border-gray-300 rounded-lg p-2 bg-white">
                <canvas #signatureCanvas width="500" height="200" class="w-full" style="touch-action: none;"></canvas>
            </div>
            
            <div class="flex justify-between items-center mt-4">
                <button mat-button (click)="clearSignature()" class="text-red-500">
                    <span class="mr-1">🗑️</span>
                    Effacer
                </button>
                <div class="flex gap-2">
                    <button mat-button (click)="dialogRef.close()">
                        <span class="mr-1">❌</span>
                        Annuler
                    </button>
                    <button mat-flat-button color="primary" (click)="saveSignature()">
                        <span class="mr-1">✅</span>
                        Confirmer
                    </button>
                </div>
            </div>
            
            <p class="text-xs text-secondary text-center mt-4">
                En signant, vous acceptez les conditions générales d'utilisation
            </p>
        </div>
    `,
    styles: [`
        canvas {
            border: 1px solid #ddd;
            border-radius: 8px;
            background: white;
            cursor: crosshair;
        }
    `]
})
export class SignatureDialogComponent implements AfterViewInit {
    @ViewChild('signatureCanvas') signatureCanvas!: ElementRef<HTMLCanvasElement>;
    private signaturePad!: SignaturePad;

    constructor(public dialogRef: MatDialogRef<SignatureDialogComponent>) {}

    ngAfterViewInit(): void {
        const canvas = this.signatureCanvas.nativeElement;
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        this.signaturePad = new SignaturePad(canvas, {
            penColor: 'rgb(0, 0, 0)',
            backgroundColor: 'rgb(255, 255, 255)'
        });
    }

    clearSignature(): void {
        this.signaturePad.clear();
    }

    saveSignature(): void {
        if (this.signaturePad.isEmpty()) {
            alert('Veuillez signer dans le cadre avant de confirmer');
            return;
        }
        const signatureData = this.signaturePad.toDataURL('image/png');
        this.dialogRef.close(signatureData);
    }
}