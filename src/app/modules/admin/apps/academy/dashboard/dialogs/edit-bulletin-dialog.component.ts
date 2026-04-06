import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { AcademyService } from '../../academy.service';
import { BulletinSalaire } from '../../academy.types';

@Component({
    selector: 'edit-bulletin-dialog',
    template: `
        <div class="p-4 max-h-[85vh] overflow-y-auto">
            <h2 class="text-lg font-semibold mb-3 flex items-center gap-2">
                <mat-icon class="text-primary">edit</mat-icon>
                Modifier le bulletin de salaire
            </h2>

            <div class="mb-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-sm">
                📄 Bulletin du {{getMoisLabel(bulletin.mois)}} {{bulletin.annee}}
            </div>

            <form [formGroup]="bulletinForm" class="flex flex-col gap-2">
                <mat-form-field appearance="outline">
                    <mat-label>Salaire brut (TND)</mat-label>
                    <input matInput type="number" formControlName="salaireBrut" required>
                </mat-form-field>

                <div class="grid grid-cols-2 gap-3">
                    <mat-form-field appearance="outline">
                        <mat-label>Primes (TND)</mat-label>
                        <input matInput type="number" formControlName="primes">
                    </mat-form-field>

                    <mat-form-field appearance="outline">
                        <mat-label>Heures sup (TND)</mat-label>
                        <input matInput type="number" formControlName="heuresSupplementaires">
                    </mat-form-field>
                </div>

                <mat-form-field appearance="outline">
                    <mat-label>Autres retenues (TND)</mat-label>
                    <input matInput type="number" formControlName="autresRetenues">
                </mat-form-field>

                <div class="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-sm">
                    <div class="grid grid-cols-2 gap-1">
                        <div>Salaire brut</div>
                        <div class="text-right">{{getSalaireBrut() | number:'1.2-2'}} TND</div>
                        <div>+ Primes + HS</div>
                        <div class="text-right">+{{getPrimesPlusHS() | number:'1.2-2'}} TND</div>
                        <div class="text-red-600">- CNSS (9.18%)</div>
                        <div class="text-right text-red-600">-{{getCNSS() | number:'1.2-2'}} TND</div>
                        <div class="text-orange-600">- IRPP (15%)</div>
                        <div class="text-right text-orange-600">-{{getIRPP() | number:'1.2-2'}} TND</div>
                        <div class="border-t pt-1 font-bold">= Salaire net</div>
                        <div class="border-t pt-1 text-right font-bold text-green-600">
                            {{getSalaireNet() | number:'1.2-2'}} TND
                        </div>
                    </div>
                </div>

                <div class="flex justify-end gap-2 mt-3 pt-2 border-t">
                    <button mat-button (click)="dialogRef.close()">Annuler</button>
                    <button mat-flat-button color="primary" [disabled]="bulletinForm.invalid" (click)="onSubmit()">
                        Enregistrer
                    </button>
                </div>
            </form>
        </div>
    `
})
export class EditBulletinDialogComponent implements OnInit {
    bulletinForm: FormGroup;
    bulletin: BulletinSalaire;
    
    moisList = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

    constructor(
        public dialogRef: MatDialogRef<EditBulletinDialogComponent>,
        private fb: FormBuilder,
        private academyService: AcademyService,
        @Inject(MAT_DIALOG_DATA) public data: { bulletin: BulletinSalaire }
    ) {
        this.bulletin = data.bulletin;
        this.bulletinForm = this.fb.group({
            salaireBrut: [this.bulletin.salaireBrut, Validators.required],
            primes: [this.bulletin.primes || 0],
            heuresSupplementaires: [this.bulletin.heuresSupplementaires || 0],
            autresRetenues: [this.bulletin.autresRetenues || 0]
        });
    }

    ngOnInit(): void {}

    getMoisLabel(mois: number): string {
        return this.moisList[mois - 1] || `${mois}`;
    }

    getSalaireBrut(): number {
        return Number(this.bulletinForm.get('salaireBrut')?.value) || 0;
    }

    getPrimesPlusHS(): number {
        const primes = Number(this.bulletinForm.get('primes')?.value) || 0;
        const hs = Number(this.bulletinForm.get('heuresSupplementaires')?.value) || 0;
        return primes + hs;
    }

    getCNSS(): number {
        return this.getSalaireBrut() * 0.0918;
    }

    getIRPP(): number {
        const brut = this.getSalaireBrut();
        const primesPlusHS = this.getPrimesPlusHS();
        const cnss = this.getCNSS();
        const baseImposable = brut + primesPlusHS - cnss;
        return baseImposable * 0.15;
    }

    getSalaireNet(): number {
        const brut = this.getSalaireBrut();
        const primesPlusHS = this.getPrimesPlusHS();
        const cnss = this.getCNSS();
        const irpp = this.getIRPP();
        const retenues = Number(this.bulletinForm.get('autresRetenues')?.value) || 0;
        return Math.round((brut + primesPlusHS - cnss - irpp - retenues) * 100) / 100;
    }

    onSubmit(): void {
        if (this.bulletinForm.valid) {
            const request = {
                employeId: this.bulletin.employeId,
                mois: this.bulletin.mois,
                annee: this.bulletin.annee,
                salaireBrut: this.bulletinForm.value.salaireBrut,
                primes: this.bulletinForm.value.primes,
                heuresSupplementaires: this.bulletinForm.value.heuresSupplementaires,
                autresRetenues: this.bulletinForm.value.autresRetenues
            };
            
            this.academyService.modifierBulletin(this.bulletin.id, request).subscribe({
                next: () => this.dialogRef.close(true),
                error: (err) => alert('Erreur: ' + err.message)
            });
        }
    }
}