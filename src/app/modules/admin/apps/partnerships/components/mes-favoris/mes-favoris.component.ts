import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import { PartnershipsService } from '../../services/partnerships.service';
import { Offre, CategorieOffre, Wishlist } from '../../models/partnerships.models';

@Component({
    selector   : 'partnerships-mes-favoris',
    templateUrl: './mes-favoris.component.html',
    styleUrls  : ['./mes-favoris.component.scss']
})
export class MesFavorisComponent implements OnInit, OnDestroy {
    
    favoris: Wishlist[] = [];
    offres: Offre[] = [];
    offresFavorites: Offre[] = [];
    
    isLoading = true;
    isRemoving: { [idOffre: string]: boolean } = {};
    
    private _unsubscribeAll = new Subject<void>();

    constructor(
        private _svc: PartnershipsService,
        private _router: Router,
        private _toastr: ToastrService
    ) {}

    ngOnInit(): void {
        this._loadData();
    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    private _loadData(): void {
        this.isLoading = true;
        
        // Charger les offres d'abord pour avoir les détails (titre, image, etc.)
        this._svc.getOffres()
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe({
                next: (offres) => {
                    this.offres = offres;
                    this._loadFavoris();
                },
                error: () => {
                    this._toastr.error('Erreur lors du chargement des offres');
                    this.isLoading = false;
                }
            });
    }

    private _loadFavoris(): void {
        this._svc.getMesFavoris()
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => this.isLoading = false)
            )
            .subscribe({
                next: (favoris) => {
                    this.favoris = favoris;
                    // Mapper les favoris avec les détails des offres correspondantes
                    this.offresFavorites = this.favoris
                        .map(f => this.offres.find(o => o.id === f.idOffre))
                        .filter(o => o !== undefined) as Offre[];
                },
                error: () => this._toastr.error('Erreur lors du chargement de vos favoris')
            });
    }

    retirerFavori(offre: Offre): void {
        if (!offre.id || this.isRemoving[offre.id]) return;
        
        this.isRemoving[offre.id] = true;
        
        this._svc.retirerFavori(offre.id).subscribe({
            next: () => {
                this.offresFavorites = this.offresFavorites.filter(o => o.id !== offre.id);
                this._toastr.success('Offre retirée des favoris');
                delete this.isRemoving[offre.id!];
            },
            error: () => {
                this._toastr.error('Erreur lors du retrait');
                delete this.isRemoving[offre.id!];
            }
        });
    }

    allerCatalogue(): void {
        this._router.navigate(['/apps/partnerships']);
    }

    allerMesReservations(): void {
        this._router.navigate(['/apps/partnerships/mes-reservations']);
    }

    /* ── Utilitaires d'Affichage ── */
    
    getEconomie(offre: Offre): number {
        if (offre.categorie === 'HOTEL' && offre.detailsHotel) {
            return (offre.prixReel || 0) - (offre.detailsHotel.prixAdulte || 0);
        }
        return (offre.prixReel || 0) - (offre.prixConvention || 0);
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

    getCardGradient(cat: CategorieOffre): string {
        const map: Record<CategorieOffre, string> = {
            VOYAGE  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            HOTEL   : 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)',
            FESTIVAL: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)'
        };
        return map[cat] || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    }
}
