import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import { PartnershipsService } from '../../../services/partnerships.service';
import { OffreAvantage, Partenaire } from '../../../models/partnerships.models';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';

@Component({
    selector: 'offre-avantage-form',
    templateUrl: './offre-avantage-form.component.html',
    styleUrls: ['./offre-avantage-form.component.scss']
})
export class OffreAvantageFormComponent implements OnInit, OnDestroy {

    @ViewChild('fileInput') fileInput: ElementRef<HTMLInputElement>;

    form: FormGroup;
    isEdit = false;
    offreId: string | null = null;
    isLoading = false;
    isSaving = false;

    partenaires: Partenaire[] = [];
    categories = ['VOYAGE', 'HOTEL', 'FESTIVAL'];
    imagePreview: string | SafeUrl | null = null;
    imageLoading = false;

    minDate = new Date();

    private _unsub = new Subject<void>();

    constructor(
        private _fb: FormBuilder,
        private _route: ActivatedRoute,
        private _router: Router,
        private _svc: PartnershipsService,
        private _toastr: ToastrService,
        private _sanitizer: DomSanitizer,
        private _dialog: MatDialog
    ) { }

    ngOnInit(): void {
        this._initForm();
        this._loadPartenaires();

        this.offreId = this._route.snapshot.paramMap.get('id');
        this.isEdit = !!this.offreId;

        if (this.isEdit) {
            this._loadOffre();
        }
    }

    ngOnDestroy(): void {
        this._unsub.next();
        this._unsub.complete();
    }

    private _initForm(): void {
        this.form = this._fb.group({
            idPartenaire: ['', Validators.required],
            titre: ['', [Validators.required, Validators.minLength(3)]],
            categorie: ['VOYAGE', Validators.required],
            description: [''],
            prixReel: [0, [Validators.required, Validators.min(0)]],
            prixConvention: [0, [Validators.required, Validators.min(0)]],
            nbPlacesTotal: [1, [Validators.required, Validators.min(1)]],
            localisation: [''],
            dateDebut: [null],
            dateFin: [null],
            imageUrl: [null],
            detailsHotel: this._fb.group({
                prixAdulte: [0, Validators.min(0)],
                prixEnfant: [0, Validators.min(0)],
                ageLimiteEnfant: [12, Validators.min(0)],
                nombreNuits: [1, Validators.min(1)],
                hasPD: [false],
                hasDP: [false],
                hasPC: [false],
                surprixPD: [0, Validators.min(0)],
                surprixDP: [0, Validators.min(0)],
                surprixPC: [0, Validators.min(0)],
                typeChambres: ['']
            })
        });
    }

    private _loadPartenaires(): void {
        this._svc.getPartenaires()
            .pipe(takeUntil(this._unsub))
            .subscribe({
                next: (p) => {
                    // On ne propose que les partenaires actifs pour une nouvelle offre
                    this.partenaires = this.isEdit ? p : p.filter(part => part.actif);
                },
                error: () => this._toastr.error('Erreur chargement des partenaires')
            });
    }

    private _loadOffre(): void {
        this.isLoading = true;
        this._svc.getOffreById(this.offreId!)
            .pipe(takeUntil(this._unsub), finalize(() => this.isLoading = false))
            .subscribe({
                next: (o) => {
                    this.form.patchValue({
                        idPartenaire: o.idPartenaire,
                        titre: o.titre,
                        categorie: o.categorie,
                        description: o.description || '',
                        prixReel: o.prixReel,
                        prixConvention: o.prixConvention,
                        nbPlacesTotal: o.nbPlacesTotal,
                        localisation: o.localisation || '',
                        dateDebut: o.dateDebut || null,
                        dateFin: o.dateFin || null,
                        imageUrl: o.imageUrl || null
                    });

                    if (o.categorie === 'HOTEL' && o.detailsHotel) {
                        const dh = o.detailsHotel;
                        this.form.get('detailsHotel')?.patchValue({
                            prixAdulte: dh.prixAdulte || 0,
                            prixEnfant: dh.prixEnfant || 0,
                            ageLimiteEnfant: dh.ageLimiteEnfant || 12,
                            nombreNuits: dh.nombreNuits || 1,
                            hasPD: dh.formulesDisponibles?.includes('PD') || false,
                            hasDP: dh.formulesDisponibles?.includes('DP') || false,
                            hasPC: dh.formulesDisponibles?.includes('PC') || false,
                            surprixPD: dh.surprixFormules?.['PD'] || 0,
                            surprixDP: dh.surprixFormules?.['DP'] || 0,
                            surprixPC: dh.surprixFormules?.['PC'] || 0,
                            typeChambres: dh.typeChambres || ''
                        });
                    }

                    if (o.imageUrl) {
                        this.imagePreview = this._sanitizer.bypassSecurityTrustUrl(o.imageUrl);
                    }
                },
                error: () => {
                    this._toastr.error('Erreur de chargement de l\'offre');
                    this.annuler();
                }
            });
    }

    // ── Upload Image (Base64) ───────────────────────────────

    triggerFileInput(): void {
        this.fileInput.nativeElement.click();
    }

    onFileSelected(event: Event): void {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) { return; }

        if (!file.type.startsWith('image/')) {
            this._toastr.warning('Veuillez sélectionner une image valide (JPG, PNG).');
            return;
        }

        // Limite à 5 MB (sécurité)
        if (file.size > 5 * 1024 * 1024) {
            this._toastr.warning('L\'image est trop volumineuse. Taille max : 5Mo.');
            return;
        }

        this.imageLoading = true;
        const reader = new FileReader();

        reader.onload = () => {
            const base64String = reader.result as string;
            this.imagePreview = this._sanitizer.bypassSecurityTrustUrl(base64String);
            this.form.get('imageUrl')?.setValue(base64String);
            this.imageLoading = false;
        };

        reader.onerror = () => {
            this._toastr.error('Erreur lors de la lecture du fichier');
            this.imageLoading = false;
        };

        reader.readAsDataURL(file);
    }

    supprimerImage(): void {
        this.imagePreview = null;
        this.form.get('imageUrl')?.setValue(null);
        if (this.fileInput) { this.fileInput.nativeElement.value = ''; }
    }

    // ── Sauvegarde ──────────────────────────────────────────

    sauvegarder(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const action = this.isEdit ? 'modifier cette offre' : 'créer cette offre';
        const ref = this._dialog.open(ConfirmDialogComponent, {
            panelClass: 'partnerships-confirm-dialog',
            data: {
                title: this.isEdit ? "Modifier l'OffreAvantage" : 'Nouvelle OffreAvantage',
                message: `Êtes-vous sûr de vouloir ${action} ?`,
                confirmLabel: this.isEdit ? 'Oui, enregistrer' : 'Oui, créer',
                cancelLabel: 'Non, annuler',
                icon: this.isEdit ? 'heroicons_outline:pencil' : 'heroicons_outline:tag',
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
        const payload = { ...this.form.value };

        // Si date conversion nécessaire (géré par Material Datepicker)
        if (payload.dateDebut) { payload.dateDebut = typeof payload.dateDebut === 'string' ? payload.dateDebut : payload.dateDebut.toISOString(); }
        if (payload.dateFin) { payload.dateFin = typeof payload.dateFin === 'string' ? payload.dateFin : payload.dateFin.toISOString(); }

        // Assemblage des details hôteliers
        if (payload.categorie === 'HOTEL') {
            const dh = payload.detailsHotel;
            const formulesDisponibles: string[] = [];
            const surprixFormules: Record<string, number> = {};

            if (dh.hasPD) { formulesDisponibles.push('PD'); surprixFormules['PD'] = dh.surprixPD; }
            if (dh.hasDP) { formulesDisponibles.push('DP'); surprixFormules['DP'] = dh.surprixDP; }
            if (dh.hasPC) { formulesDisponibles.push('PC'); surprixFormules['PC'] = dh.surprixPC; }

            payload.detailsHotel = {
                prixAdulte: dh.prixAdulte,
                prixEnfant: dh.prixEnfant,
                ageLimiteEnfant: dh.ageLimiteEnfant,
                nombreNuits: dh.nombreNuits,
                typeChambres: dh.typeChambres,
                formulesDisponibles,
                surprixFormules
            };
        } else {
            payload.detailsHotel = null;
        }

        if (this.isEdit) {
            this._svc.modifierOffre(this.offreId!, payload)
                .pipe(takeUntil(this._unsub), finalize(() => this.isSaving = false))
                .subscribe({
                    next: () => {
                        this._toastr.success(`L'offre "${payload.titre}" a été modifiée avec succès`);
                        this.annuler();
                    },
                    error: err => this._toastr.error(err?.error?.message || 'Erreur modification')
                });
        } else {
            this._svc.creerOffre(payload)
                .pipe(takeUntil(this._unsub), finalize(() => this.isSaving = false))
                .subscribe({
                    next: () => {
                        this._toastr.success(`L'offre "${payload.titre}" a été créée avec succès`);
                        this.annuler();
                    },
                    error: err => this._toastr.error(err?.error?.message || 'Erreur création')
                });
        }
    }

    annuler(): void {
        this._router.navigate(['/apps/partnerships/admin']);
    }

    get f() { return this.form.controls; }
}
