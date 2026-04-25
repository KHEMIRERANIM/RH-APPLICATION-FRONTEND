import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { BulletinSalaire } from '../../academy.types';
import { AcademyService } from '../../academy.service'; // Ajout de l'import

@Component({
    selector: 'bulletin-detail-dialog',
    template: `
        <div class="p-6 max-w-2xl">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-xl font-semibold">Bulletin de salaire</h2>
                <button mat-icon-button (click)="dialogRef.close()">
                    <mat-icon>close</mat-icon>
                </button>
            </div>

            <div class="grid grid-cols-2 gap-4 mb-6">
                <div class="p-3 bg-gray-100 dark:bg-gray-800 rounded">
                    <div class="text-sm text-secondary">Employé</div>
                    <div class="font-medium">{{employeNom}}</div>  <!-- Modification ici -->
                </div>
                <div class="p-3 bg-gray-100 dark:bg-gray-800 rounded">
                    <div class="text-sm text-secondary">Période</div>
                    <div class="font-medium">{{getMoisLabel(bulletin.mois)}} {{bulletin.annee}}</div>
                </div>
            </div>

            <table class="w-full mb-6">
                <!-- Le reste du tableau reste identique -->
                <tr class="border-b">
                    <td class="py-2">Salaire Brut</td>
                    <td class="py-2 text-right">{{bulletin.salaireBrut | number:'1.2-2'}} TND</td>
                </tr>
                <tr class="border-b">
                    <td class="py-2">Primes</td>
                    <td class="py-2 text-right">{{bulletin.primes | number:'1.2-2'}} TND</td>
                </tr>
                <tr class="border-b">
                    <td class="py-2">Heures Supplémentaires</td>
                    <td class="py-2 text-right">{{bulletin.heuresSupplementaires | number:'1.2-2'}} TND</td>
                </tr>
                <tr class="border-b">
                    <td class="py-2 text-red-600">CNSS (9.18%)</td>
                    <td class="py-2 text-right text-red-600">-{{bulletin.cotisationsCNSS | number:'1.2-2'}} TND</td>
                </tr>
                <tr class="border-b">
                    <td class="py-2 text-orange-600">IRPP</td>
                    <td class="py-2 text-right text-orange-600">-{{bulletin.irpp | number:'1.2-2'}} TND</td>
                </tr>
                <tr class="border-b">
                    <td class="py-2">Autres Retenues</td>
                    <td class="py-2 text-right">-{{bulletin.autresRetenues | number:'1.2-2'}} TND</td>
                </tr>
                <tr class="border-t-2 border-b-2">
                    <td class="py-3 font-bold">Salaire NET</td>
                    <td class="py-3 text-right font-bold text-green-600 text-xl">
                        {{bulletin.salaireNet | number:'1.2-2'}} TND
                    </td>
                </tr>
            </table>

            <div class="text-xs text-secondary text-center mt-4">
                Généré le {{bulletin.dateGeneration | date:'dd/MM/yyyy HH:mm'}}
            </div>

            <div class="flex justify-end mt-6">
                <button mat-stroked-button (click)="dialogRef.close()">Fermer</button>
            </div>
        </div>
    `
})
export class BulletinDetailDialogComponent {
    moisList = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    employeNom: string = ''; // Nouvelle propriété

    constructor(
        public dialogRef: MatDialogRef<BulletinDetailDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public bulletin: BulletinSalaire,
        private academyService: AcademyService // Injection du service
    ) {
        // Récupération du nom de l'employé
        this.employeNom = this.academyService.getEmployeNom(bulletin.employeId);
    }

    getMoisLabel(mois: number): string {
        return this.moisList[mois - 1] || `${mois}`;
    }
}