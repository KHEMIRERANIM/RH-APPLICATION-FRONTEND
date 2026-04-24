import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import { PartnershipsService } from '../../services/partnerships.service';
import { OffreAvantage, Partenaire, CategorieOffreAvantage, CATEGORIE_LABELS } from '../../models/partnerships.models';
import { AuthService } from 'app/core/auth/auth.service';
import { OffreAvantageDetailDialogComponent } from '../offre-avantage-detail-dialog/offre-avantage-detail-dialog.component';

type FilterType = CategorieOffreAvantage | 'TOUS';

@Component({
    selector   : 'partnerships-catalogue',
    templateUrl: './catalogue.component.html',
    styleUrls  : ['./catalogue.component.scss']
})
export class CatalogueComponent implements OnInit, OnDestroy {

    offres: OffreAvantage[] = [];
    partenaires: Partenaire[] = [];
    filteredOffres: OffreAvantage[] = [];
    activeFilter: FilterType = 'TOUS';
    isLoading = true;
    isAdmin = false;
    favoriMap: { [idOffreAvantage: string]: boolean } = {};
    isTogglingFavori: { [idOffreAvantage: string]: boolean } = {};
    urgenceMap: { [idOffreAvantage: string]: number } = {}; // ?? Map de l'IA (Taux de rupture)

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
        this._loadFavoris();
    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    // -- Chargement --------------------------------------------

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

                    // ?? évaluation asynchrone IA de la demande pour chaque offre affichée
                    this.offres.forEach(offre => {
                        if (offre.id) {
                            this._svc.evaluerUrgence(offre.id).subscribe({
                                next: (res) => {
                                    if (res && res.urgence) {
                                        this.urgenceMap[offre.id!] = Math.round(res.probabilite_rupture * 100);
                                    }
                                }
                            });
                        }
                    });
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

    private _loadFavoris(): void {
        this._svc.getMesFavoris()
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe({
                next: (favoris) => {
                    this.favoriMap = {};
                    favoris.forEach(f => {
                        this.favoriMap[f.idOffreAvantage] = true;
                    });
                },
                error: () => console.error('Erreur lors du chargement des favoris')
            });
    }

    // -- Filtres -----------------------------------------------

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

    // -- Actions -----------------------------------------------

    toggleFavori(offre: OffreAvantage, event: Event): void {
        event.stopPropagation(); // Empéche l'ouverture de la boéte de dialogue
        
        if (!offre.id || this.isTogglingFavori[offre.id]) return;
        
        this.isTogglingFavori[offre.id] = true;
        const estFavori = this.favoriMap[offre.id];

        if (estFavori) {
            this._svc.retirerFavori(offre.id).subscribe({
                next: () => {
                    this.favoriMap[offre.id] = false;
                    this._toastr.info('OffreAvantage retirée de vos favoris', 'Favoris');
                    this.isTogglingFavori[offre.id] = false;
                },
                error: () => {
                    this._toastr.error('Erreur lors du retrait du favori', 'Erreur');
                    this.isTogglingFavori[offre.id] = false;
                }
            });
        } else {
            this._svc.ajouterFavori(offre.id).subscribe({
                next: () => {
                    this.favoriMap[offre.id] = true;
                    this._toastr.success('OffreAvantage ajoutée - vos favoris ?', 'Favoris');
                    this.isTogglingFavori[offre.id] = false;
                },
                error: (err) => {
                    this._toastr.error('Erreur ou offre déjé en favoris', 'Erreur');
                    this.isTogglingFavori[offre.id] = false;
                }
            });
        }
    }

    ouvrirReservation(offre: OffreAvantage): void {
        const dialogRef = this._dialog.open(OffreAvantageDetailDialogComponent, {
            width    : '640px',
            maxWidth : '95vw',
            panelClass: 'partnerships-dialog',
            data     : { offre }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result === 'reserved') {
                this._loadData();
                this._toastr.success('Réservation confirmée avec succès !', 'Succés');
            }
        });
    }

    allerMesReservations(): void {
        this._router.navigate(['/apps/partnerships/mes-reservations']);
    }

    allerAdmin(): void {
        this._router.navigate(['/apps/partnerships/admin']);
    }

    // -- Utilitaires UI ----------------------------------------

    getPlacesPercent(offre: OffreAvantage): number {
        if (!offre.nbPlacesTotal || offre.nbPlacesTotal === 0) { return 0; }
        return (offre.nbPlacesDispo / offre.nbPlacesTotal) * 100;
    }

    getPlacesColor(offre: OffreAvantage): string {
        const pct = this.getPlacesPercent(offre);
        if (pct <= 20) { return 'warn'; }
        if (pct <= 50) { return 'accent'; }
        return 'primary';
    }

    getCategorieBadgeClass(cat: CategorieOffreAvantage): string {
        const map: Record<CategorieOffreAvantage, string> = {
            VOYAGE  : 'badge-voyage',
            HOTEL   : 'badge-hotel',
            FESTIVAL: 'badge-festival'
        };
        return map[cat] || '';
    }

    getCategorieIcon(cat: CategorieOffreAvantage): string {
        const map: Record<CategorieOffreAvantage, string> = {
            VOYAGE  : 'heroicons_outline:paper-airplane',
            HOTEL   : 'heroicons_outline:office-building',
            FESTIVAL: 'heroicons_outline:music-note'
        };
        return map[cat] || 'heroicons_outline:tag';
    }

    getEconomie(offre: OffreAvantage): number {
        if (offre.categorie === 'HOTEL' && offre.detailsHotel) {
            return (offre.prixReel || 0) - (offre.detailsHotel.prixAdulte || 0);
        }
        return (offre.prixReel || 0) - (offre.prixConvention || 0);
    }

    getDefaultImage(cat: CategorieOffreAvantage): string {
        // SVG data URI inline par catégorie (fallback si pas d'image)
        const gradients: Record<CategorieOffreAvantage, string> = {
            VOYAGE  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            HOTEL   : 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)',
            FESTIVAL: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)'
        };
        return '';
    }

    getCardGradient(cat: CategorieOffreAvantage): string {
        const map: Record<CategorieOffreAvantage, string> = {
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

