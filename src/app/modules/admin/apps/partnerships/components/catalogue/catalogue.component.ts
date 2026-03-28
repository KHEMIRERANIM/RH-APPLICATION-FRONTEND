import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import { PartnershipsService } from '../../services/partnerships.service';
import { Offre, Partenaire, CategorieOffre, CATEGORIE_LABELS } from '../../models/partnerships.models';
import { AuthService } from 'app/core/auth/auth.service';
import { OffreDetailDialogComponent } from '../offre-detail-dialog/offre-detail-dialog.component';

type FilterType = CategorieOffre | 'TOUS';

@Component({
    selector   : 'partnerships-catalogue',
    templateUrl: './catalogue.component.html',
    styleUrls  : ['./catalogue.component.scss']
})
export class CatalogueComponent implements OnInit, OnDestroy {

    offres: Offre[] = [];
    partenaires: Partenaire[] = [];
    filteredOffres: Offre[] = [];
    activeFilter: FilterType = 'TOUS';
    isLoading = true;
    isAdmin = false;

    filters: { key: FilterType; label: string; icon: string }[] = [
        { key: 'TOUS',     label: 'Toutes',    icon: 'heroicons_outline:view-grid'        },
        { key: 'VOYAGE',   label: 'Voyages',   icon: 'heroicons_outline:paper-airplane'   },
        { key: 'HOTEL',    label: 'Hôtels',    icon: 'heroicons_outline:office-building'  },
        { key: 'FESTIVAL', label: 'Festivals', icon: 'heroicons_outline:music-note'       }
    ];

    kpis = { totalOffres: 0, totalPartenaires: 0, placesTotal: 0 };

    private _unsubscribeAll = new Subject<void>();

    constructor(
        private _svc: PartnershipsService,
        private _auth: AuthService,
        private _router: Router,
        private _dialog: MatDialog,
        private _toastr: ToastrService
    ) {}

    ngOnInit(): void {
        this.isAdmin = this._auth.isAdmin();
        this._loadData();
    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    // ── Chargement ────────────────────────────────────────────

    private _loadData(): void {
        this.isLoading = true;

        this._svc.getOffres()
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => this.isLoading = false)
            )
            .subscribe({
                next : (offres) => {
                    this.offres = offres;
                    this._applyFilter();
                    this.kpis.totalOffres = offres.length;
                    this.kpis.placesTotal = offres.reduce((acc, o) => acc + (o.nbPlacesDispo || 0), 0);
                    if (this.isAdmin) { this._loadPartenaires(); }
                },
                error: () => this._toastr.error('Erreur lors du chargement des offres', 'Erreur')
            });
    }

    private _loadPartenaires(): void {
        this._svc.getPartenaires()
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe({
                next : (p) => {
                    this.partenaires = p;
                    this.kpis.totalPartenaires = p.length;
                    // Enrichir les offres avec le nom du partenaire
                    this.offres = this.offres.map(o => ({
                        ...o,
                        nomPartenaire: p.find(p2 => p2.id === o.idPartenaire)?.nom || 'Partenaire inconnu'
                    }));
                    this._applyFilter();
                },
                error: () => {}
            });
    }

    // ── Filtres ───────────────────────────────────────────────

    setFilter(filter: FilterType): void {
        this.activeFilter = filter;
        this._applyFilter();
    }

    private _applyFilter(): void {
        if (this.activeFilter === 'TOUS') {
            this.filteredOffres = [...this.offres];
        } else {
            this.filteredOffres = this.offres.filter(o => o.categorie === this.activeFilter);
        }
    }

    // ── Actions ───────────────────────────────────────────────

    ouvrirReservation(offre: Offre): void {
        const dialogRef = this._dialog.open(OffreDetailDialogComponent, {
            width    : '640px',
            maxWidth : '95vw',
            panelClass: 'partnerships-dialog',
            data     : { offre }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result === 'reserved') {
                this._loadData();
                this._toastr.success('Réservation confirmée avec succès !', 'Succès');
            }
        });
    }

    allerMesReservations(): void {
        this._router.navigate(['/apps/partnerships/mes-reservations']);
    }

    allerAdmin(): void {
        this._router.navigate(['/apps/partnerships/admin']);
    }

    // ── Utilitaires UI ────────────────────────────────────────

    getPlacesPercent(offre: Offre): number {
        if (!offre.nbPlacesTotal || offre.nbPlacesTotal === 0) { return 0; }
        return (offre.nbPlacesDispo / offre.nbPlacesTotal) * 100;
    }

    getPlacesColor(offre: Offre): string {
        const pct = this.getPlacesPercent(offre);
        if (pct <= 20) { return 'warn'; }
        if (pct <= 50) { return 'accent'; }
        return 'primary';
    }

    getCategorieBadgeClass(cat: CategorieOffre): string {
        const map: Record<CategorieOffre, string> = {
            VOYAGE  : 'badge-voyage',
            HOTEL   : 'badge-hotel',
            FESTIVAL: 'badge-festival'
        };
        return map[cat] || '';
    }

    getCategorieIcon(cat: CategorieOffre): string {
        const map: Record<CategorieOffre, string> = {
            VOYAGE  : 'heroicons_outline:paper-airplane',
            HOTEL   : 'heroicons_outline:office-building',
            FESTIVAL: 'heroicons_outline:music-note'
        };
        return map[cat] || 'heroicons_outline:tag';
    }

    getEconomie(offre: Offre): number {
        return offre.prixReel - offre.prixConvention;
    }

    getDefaultImage(cat: CategorieOffre): string {
        // SVG data URI inline par catégorie (fallback si pas d'image)
        const gradients: Record<CategorieOffre, string> = {
            VOYAGE  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            HOTEL   : 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)',
            FESTIVAL: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)'
        };
        return '';
    }

    getCardGradient(cat: CategorieOffre): string {
        const map: Record<CategorieOffre, string> = {
            VOYAGE  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            HOTEL   : 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)',
            FESTIVAL: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)'
        };
        return map[cat] || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    }

    getCountByFilter(filter: FilterType): number {
        if (filter === 'TOUS') {
            return this.offres.length;
        }
        return this.offres.filter(o => o.categorie === filter).length;
    }
}
