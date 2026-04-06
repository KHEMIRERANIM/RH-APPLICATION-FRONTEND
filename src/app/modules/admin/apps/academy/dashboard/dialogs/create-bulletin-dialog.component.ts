import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { AcademyService } from '../../academy.service';
import { User } from '../../academy.types';

@Component({
    selector: 'create-bulletin-dialog',
    template: `
        <div class="p-4 max-h-[85vh] overflow-y-auto">
            <h2 class="text-lg font-semibold mb-3 flex items-center gap-2">
                <mat-icon class="text-primary">description</mat-icon>
                Nouveau bulletin de salaire
            </h2>

            <div *ngIf="isLoading" class="text-center py-4 text-secondary">
                <mat-icon class="animate-spin">refresh</mat-icon>
                Chargement des employés...
            </div>

            <form [formGroup]="bulletinForm" class="flex flex-col gap-2" *ngIf="!isLoading">
                <mat-form-field appearance="outline" class="w-full">
                    <mat-label>Employé</mat-label>
                    <mat-select formControlName="employeId" required>
                        <mat-option *ngFor="let emp of employes" [value]="emp.id">
                            {{emp.prenom}} {{emp.nom}} - {{emp.email}}
                        </mat-option>
                    </mat-select>
                    <mat-hint *ngIf="employes.length === 0" class="text-red-500">
                        ⚠️ Aucun employé - vérifiez la base de données
                    </mat-hint>
                </mat-form-field>

                <div class="grid grid-cols-2 gap-3">
                    <mat-form-field appearance="outline">
                        <mat-label>Mois</mat-label>
                        <mat-select formControlName="mois" required>
                            <mat-option *ngFor="let m of moisList" [value]="m.value">{{m.label}}</mat-option>
                        </mat-select>
                    </mat-form-field>

                    <mat-form-field appearance="outline">
                        <mat-label>Année</mat-label>
                        <input matInput type="number" formControlName="annee" required>
                    </mat-form-field>
                </div>

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
                    <button mat-flat-button color="primary" [disabled]="bulletinForm.invalid || employes.length === 0" (click)="onSubmit()">
                        Créer
                    </button>
                </div>
            </form>
        </div>
    `
})
export class CreateBulletinDialogComponent implements OnInit {
    bulletinForm: FormGroup;
    employes: User[] = [];
    isLoading = true;
    
    moisList = [
        { value: 1, label: 'Janvier' }, { value: 2, label: 'Février' },
        { value: 3, label: 'Mars' }, { value: 4, label: 'Avril' },
        { value: 5, label: 'Mai' }, { value: 6, label: 'Juin' },
        { value: 7, label: 'Juillet' }, { value: 8, label: 'Août' },
        { value: 9, label: 'Septembre' }, { value: 10, label: 'Octobre' },
        { value: 11, label: 'Novembre' }, { value: 12, label: 'Décembre' }
    ];

    constructor(
        public dialogRef: MatDialogRef<CreateBulletinDialogComponent>,
        private fb: FormBuilder,
        private academyService: AcademyService
    ) {
        this.bulletinForm = this.fb.group({
            employeId: ['', Validators.required],
            mois: ['', Validators.required],
            annee: [new Date().getFullYear(), Validators.required],
            salaireBrut: ['', Validators.required],
            primes: [0],
            heuresSupplementaires: [0],
            autresRetenues: [0]
        });
    }

    ngOnInit(): void {
        this.isLoading = true;
        this.academyService.getAllEmployes().subscribe({
            next: () => {
                this.academyService.employes$.subscribe(employes => {
                    // CORRECTION ICI : comparer avec la string 'EMPLOYE'
                    this.employes = (employes || []).filter(e => e.role === 'EMPLOYE' || e.role === 'MANAGER');
                    console.log('Employés chargés:', this.employes);
                    this.isLoading = false;
                });
            },
            error: (err) => {
                console.error('Erreur:', err);
                this.isLoading = false;
            }
        });
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
            this.academyService.creerBulletin(this.bulletinForm.value).subscribe({
                next: () => this.dialogRef.close(true),
                error: (err) => alert('Erreur: ' + err.message)
            });
        }
    }
}