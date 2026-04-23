import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import { PartnershipsService } from '../../../services/partnerships.service';
import { Partenaire } from '../../../models/partnerships.models';
import { MatDialog } from '@angular/material/dialog';
import { SafeUrl, DomSanitizer } from '@angular/platform-browser';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';

@Component({
    selector: 'partenaire-form',
    templateUrl: './partenaire-form.component.html',
    styleUrls: ['./partenaire-form.component.scss']
})
export class PartenaireFormComponent implements OnInit, OnDestroy {

    form: FormGroup;
    isEdit = false;
    partenaireId: string | null = null;
    isLoading = false;
    isSaving = false;

    categories = ['VOYAGE', 'HOTEL', 'FESTIVAL'];
    private _unsub = new Subject<void>();

    constructor(
        private _fb: FormBuilder,
        private _route: ActivatedRoute,
        private _router: Router,
        private _svc: PartnershipsService,
        private _toastr: ToastrService,
        private _dialog: MatDialog
    ) { }

    ngOnInit(): void {
        this.form = this._fb.group({
            nom: ['', [Validators.required, Validators.minLength(2)]],
            type: ['VOYAGE', Validators.required],
            emailContact: ['', [Validators.email]],
            dateConvention: [new Date().toISOString(), Validators.required],
            actif: [true, Validators.required]
        });

        this.partenaireId = this._route.snapshot.paramMap.get('id');
        this.isEdit = !!this.partenaireId;

        if (this.isEdit) {
            this._loadPartenaire();
        }
    }

    ngOnDestroy(): void {
        this._unsub.next();
        this._unsub.complete();
    }

    private _loadPartenaire(): void {
        this.isLoading = true;
        this._svc.getPartenaireById(this.partenaireId!)
            .pipe(takeUntil(this._unsub), finalize(() => this.isLoading = false))
            .subscribe({
                next: (p) => {
                    this.form.patchValue({
                        nom: p.nom,
                        type: p.type,
                        emailContact: p.emailContact || '',
                        dateConvention: p.dateConvention || new Date().toISOString(),
                        actif: p.actif
                    });
                },
                error: () => {
                    this._toastr.error('Erreur de chargement du partenaire');
                    this.annuler();
                }
            });
    }

    // ✅ Fonction utilitaire pour corriger la timezone
    private _corrigerDate(date: any): string {
        const d = new Date(date);
        return new Date(
            d.getFullYear(),
            d.getMonth(),
            d.getDate(),
            12, 0, 0
        ).toISOString();
    }

    sauvegarder(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const action = this.isEdit ? 'modifier ce partenaire' : 'créer ce partenaire';
        const ref = this._dialog.open(ConfirmDialogComponent, {
            panelClass: 'partnerships-confirm-dialog',
            data: {
                title: this.isEdit ? 'Modifier le Partenaire' : 'Nouveau Partenaire',
                message: `Êtes-vous sûr de vouloir ${action} ?`,
                confirmLabel: this.isEdit ? 'Oui, enregistrer' : 'Oui, créer',
                cancelLabel: 'Non, annuler',
                icon: this.isEdit ? 'heroicons_outline:pencil' : 'heroicons_outline:office-building',
                color: this.isEdit ? 'primary' : 'success'
            }
        });

        ref.afterClosed().subscribe(confirmed => {
            if (!confirmed) { return; }
            this._execSauvegarder();
        });
    }

    private _execSauvegarder(): void {
        this.isSaving = true;
        const formValue = this.form.value;

        const payload = {
            ...formValue,
            dateConvention: this._corrigerDate(formValue.dateConvention)
        };

        if (this.isEdit) {
            this._svc.modifierPartenaire(this.partenaireId!, payload)
                .pipe(takeUntil(this._unsub), finalize(() => this.isSaving = false))
                .subscribe({
                    next: () => {
                        this._toastr.success('Partenaire modifié avec succès');
                        this.annuler();
                    },
                    error: err => this._toastr.error(err?.error?.message || 'Erreur lors de la modification')
                });
        } else {
            this._svc.creerPartenaire(payload)
                .pipe(takeUntil(this._unsub), finalize(() => this.isSaving = false))
                .subscribe({
                    next: () => {
                        this._toastr.success('Partenaire créé avec succès');
                        this.annuler();
                    },
                    error: err => this._toastr.error(err?.error?.message || 'Erreur lors de la création')
                });
        }
    }

    annuler(): void {
        this._router.navigate(['/apps/partnerships/admin']);
    }

    get f() { return this.form.controls; }

    getInitiale(): string {
        const nom = this.form.get('nom')?.value;
        if (nom && typeof nom === 'string' && nom.length > 0) {
            return nom.charAt(0).toUpperCase();
        }
        return 'P';
    }
}
