import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import { PartnershipsService } from '../../services/partnerships.service';
import { AvantageReservation } from '../../models/partnerships.models';

@Component({
    selector   : 'mes-reservations',
    templateUrl: './mes-reservations.component.html',
    styleUrls  : ['./mes-reservations.component.scss']
})
export class MesReservationsComponent implements OnInit, OnDestroy {

    reservations: AvantageReservation[] = [];
    isLoading    = true;
    isAnnulating : Record<string, boolean> = {};
    isClearingHistory = false;

    private _unsub = new Subject<void>();

    constructor(
        private _svc   : PartnershipsService,
        private _router : Router,
        private _toastr : ToastrService
    ) {}

    ngOnInit(): void {
        this._load();
    }

    ngOnDestroy(): void {
        this._unsub.next();
        this._unsub.complete();
    }

    private _load(): void {
        this.isLoading = true;
        this._svc.getMesReservations()
            .pipe(takeUntil(this._unsub), finalize(() => this.isLoading = false))
            .subscribe({
                next : (r) => {
                    this.reservations = r.sort((a, b) =>
                        new Date(b.dateReservation!).getTime() - new Date(a.dateReservation!).getTime()
                    );
                    // Enrichir avec les titres des offres
                    this._enrichirOffres();
                },
                error: () => this._toastr.error('Impossible de charger vos réservations', 'Erreur')
            });
    }

    private _enrichirOffres(): void {
        this.reservations.forEach(r => {
            if (r.idOffreAvantage && !r.titreOffreAvantage) {
                this._svc.getOffreById(r.idOffreAvantage)
                    .pipe(takeUntil(this._unsub))
                    .subscribe({
                        next : (o) => { r.titreOffreAvantage = o.titre; },
                        error: ()  => { r.titreOffreAvantage = 'OffreAvantage'; }
                    });
            }
        });
    }

    annuler(reservation: AvantageReservation): void {
        if (!reservation.id) { return; }
        this.isAnnulating[reservation.id] = true;

        this._svc.annulerReservation(reservation.id)
            .pipe(
                takeUntil(this._unsub),
                finalize(() => { if (reservation.id) { this.isAnnulating[reservation.id] = false; } })
            )
            .subscribe({
                next : () => {
                    this._toastr.success('Réservation annulée avec succès', 'Succès');
                    this._load();
                },
                error: (err) => {
                    const msg = err?.error?.message || 'Erreur lors de l\'annulation';
                    this._toastr.error(msg, 'Erreur');
                }
            });
    }

    retourCatalogue(): void {
        this._router.navigate(['/apps/partnerships']);
    }

    viderHistorique(): void {
        this.isClearingHistory = true;
        this._svc.viderReservationsAnnulees()
            .pipe(
                takeUntil(this._unsub),
                finalize(() => this.isClearingHistory = false)
            )
            .subscribe({
                next : () => {
                    this._toastr.success('Historique vidé avec succès', 'Succès');
                    this._load();
                },
                error: (err) => {
                    const msg = err?.error?.message || 'Erreur lors de la suppression';
                    this._toastr.error(msg, 'Erreur');
                }
            });
    }

    get nbConfirmees(): number {
        return this.reservations.filter(r => r.statut === 'CONFIRMEE').length;
    }

    get nbAnnulees(): number {
        return this.reservations.filter(r => r.statut === 'ANNULEE').length;
    }

    get montantTotal(): number {
        return this.reservations
            .filter(r => r.statut === 'CONFIRMEE')
            .reduce((acc, r) => acc + (r.prixTotal || 0), 0);
    }
}


