import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { PartnershipsService } from '../../services/partnerships.service';
import { Offre, CATEGORIE_ICONS } from '../../models/partnerships.models';

export interface OffreDetailDialogData {
    offre: Offre;
}

@Component({
    selector   : 'offre-detail-dialog',
    templateUrl: './offre-detail-dialog.component.html',
    styleUrls  : ['./offre-detail-dialog.component.scss']
})
export class OffreDetailDialogComponent implements OnInit {

    form: FormGroup;
    offre: Offre;
    isLoading = false;
    prixTotal  = 0;
    nuitsH = 0;

    constructor(
        private _fb      : FormBuilder,
        private _svc     : PartnershipsService,
        private _toastr  : ToastrService,
        private _dialogRef: MatDialogRef<OffreDetailDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: OffreDetailDialogData
    ) {
        this.offre = data.offre;
    }

    get isHotel(): boolean {
        return this.offre.categorie === 'HOTEL' && !!this.offre.detailsHotel;
    }

    ngOnInit(): void {
        if (this.isHotel) {
            this.form = this._fb.group({
                nbAdultes: [1, [Validators.required, Validators.min(1)]],
                nbEnfants: [0, [Validators.required, Validators.min(0)]],
                formule: [null, Validators.required],
                checkIn: [null, Validators.required], // Force la sélection manuelle
                checkOut: [null, Validators.required] // Force la sélection manuelle
            });
            // Sélection par défaut de la 1ère formule
            const formules = this.offre.detailsHotel!.formulesDisponibles;
            if (formules && formules.length > 0) {
                this.form.get('formule')?.setValue(formules[0]);
            }
        } else {
            this.form = this._fb.group({
                nbPersonnes: [0, [ // Initialise à 0 pour avoir 0 DT par défaut au démarrage
                    Validators.required,
                    Validators.min(1),
                    Validators.max(this.offre.nbPlacesDispo)
                ]]
            });
        }

        this._calculateTotal();
        this.form.valueChanges.subscribe(() => this._calculateTotal());
    }

    private _calculateTotal(): void {
        if (this.isHotel) {
            const dh = this.offre.detailsHotel!;
            if (!dh) return;
            const nbAdultes = this.form.get('nbAdultes')?.value || 0;
            const nbEnfants = this.form.get('nbEnfants')?.value || 0;
            const formule = this.form.get('formule')?.value;
            
            let nuits = 0;
            const checkIn = this.form.get('checkIn')?.value;
            const checkOut = this.form.get('checkOut')?.value;
            if (checkIn && checkOut) {
                const diffTime = new Date(checkOut).getTime() - new Date(checkIn).getTime();
                if (diffTime > 0) {
                    nuits = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                }
            }
            this.nuitsH = nuits;

            let surprix = 0;
            if (formule && dh.surprixFormules && dh.surprixFormules[formule as keyof typeof dh.surprixFormules] !== undefined) {
                surprix = dh.surprixFormules[formule as keyof typeof dh.surprixFormules] as number;
            }

            const parNuit = (nbAdultes * (dh.prixAdulte || 0)) + (nbEnfants * (dh.prixEnfant || 0)) + (surprix * (nbAdultes + nbEnfants));
            this.prixTotal = parNuit * nuits;
        } else {
            const nb = this.form.get('nbPersonnes')?.value || 0;
            this.prixTotal = nb * (this.offre.prixConvention || 0);
        }
    }

    incrementer(): void {
        if (!this.form.get('nbPersonnes')) return;
        const ctrl = this.form.get('nbPersonnes');
        const val  = (ctrl?.value || 0) + 1;
        if (val <= this.offre.nbPlacesDispo) {
            ctrl?.setValue(val);
        }
    }

    decrementer(): void {
        if (!this.form.get('nbPersonnes')) return;
        const ctrl = this.form.get('nbPersonnes');
        const val  = (ctrl?.value || 0) - 1;
        if (val >= 1) {
            ctrl?.setValue(val);
        }
    }

    incrementerType(field: string): void {
        const ctrl = this.form.get(field);
        if (!ctrl) return;
        const totalActuel = (this.form.get('nbAdultes')?.value || 0) + (this.form.get('nbEnfants')?.value || 0);
        
        if (totalActuel < this.offre.nbPlacesDispo) {
            ctrl.setValue((ctrl.value || 0) + 1);
        }
    }

    decrementerType(field: string): void {
        const ctrl = this.form.get(field);
        if (!ctrl) return;
        const val  = (ctrl.value || 0) - 1;
        const minVal = field === 'nbAdultes' ? 1 : 0;
        if (val >= minVal) {
            ctrl.setValue(val);
        }
    }

    confirmer(): void {
        if (this.form.invalid) { return; }
        
        if (this.isHotel) {
            const nbA = this.form.get('nbAdultes')?.value || 0;
            const nbE = this.form.get('nbEnfants')?.value || 0;
            if (nbA + nbE > this.offre.nbPlacesDispo) {
                this._toastr.warning('Capacité dépassée.');
                return;
            }
            if (this.nuitsH <= 0) {
                this._toastr.warning('Veuillez sélectionner des dates valides.');
                return;
            }
        }
        
        this.isLoading = true;

        let resObs;
        if (this.isHotel) {
            const dateIn = new Date(this.form.get('checkIn')!.value);
            const dateOut = new Date(this.form.get('checkOut')!.value);
            // adjust tz
            const isoIn = new Date(dateIn.getTime() - (dateIn.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
            const isoOut = new Date(dateOut.getTime() - (dateOut.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

            resObs = this._svc.reserverHotel(
                this.offre.id!, 
                this.form.get('nbAdultes')?.value, 
                this.form.get('nbEnfants')?.value, 
                this.form.get('formule')?.value,
                isoIn,
                isoOut
            );
        } else {
            resObs = this._svc.reserverOuModifier(this.offre.id!, this.form.get('nbPersonnes')?.value);
        }

        resObs.subscribe({
            next : () => {
                this.isLoading = false;
                this._dialogRef.close('reserved');
            },
            error: (err) => {
                this.isLoading = false;
                const msg = err?.error?.message || 'Erreur lors de la réservation';
                this._toastr.error(msg, 'Erreur');
            }
        });
    }

    fermer(): void {
        this._dialogRef.close(null);
    }

    getCategorieIcon(): string {
        return CATEGORIE_ICONS[this.offre.categorie] || 'heroicons_outline:tag';
    }

    getCardGradient(): string {
        const map: Record<string, string> = {
            VOYAGE  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            HOTEL   : 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)',
            FESTIVAL: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)'
        };
        return map[this.offre.categorie] || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    }

    getEconomie(): number {
        if (this.offre.categorie === 'HOTEL' && this.offre.detailsHotel) {
            return (this.offre.prixReel || 0) - (this.offre.detailsHotel.prixAdulte || 0);
        }
        return (this.offre.prixReel || 0) - (this.offre.prixConvention || 0);
    }
}
