import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import { PartnershipsService } from '../../services/partnerships.service';
import { Partenaire, OffreAvantage, AvantageReservation } from '../../models/partnerships.models';

@Component({
    selector: 'admin-dashboard',
    templateUrl: './admin-dashboard.component.html',
    styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit, OnDestroy {

    // ── Partenaires ──────────────────────────────────────
    partenairesDS = new MatTableDataSource<Partenaire>();
    partenairesCols = ['nom', 'type', 'emailContact', 'dateConvention', 'actif', 'actions'];
    loadingP = true;

    // ── Offres ───────────────────────────────────────────
    offresDS = new MatTableDataSource<OffreAvantage>();
    offres: OffreAvantage[] = [];
    partenaires: Partenaire[] = [];
    offresCols = ['titre', 'categorie', 'partenaire', 'prixConvention', 'nbPlacesDispo', 'statut', 'actions'];
    loadingO = true;

    // ── Réservations ─────────────────────────────────────
    reservationsDS = new MatTableDataSource<AvantageReservation>();
    reservationsCols = ['reference', 'user', 'offre', 'nbPersonnes', 'prixTotal', 'statut', 'dateReservation'];
    loadingR = true;
    users: any[] = [];

    // ── Paginators / Sorts ────────────────────────────────
    @ViewChild('paginatorP') set paginatorP(p: MatPaginator) { if (p) { this.partenairesDS.paginator = p; } }
    @ViewChild('paginatorO') set paginatorO(p: MatPaginator) { if (p) { this.offresDS.paginator = p; } }
    @ViewChild('paginatorR') set paginatorR(p: MatPaginator) { if (p) { this.reservationsDS.paginator = p; } }
    @ViewChild('sortP') set sortP(s: MatSort) { if (s) { this.partenairesDS.sort = s; } }
    @ViewChild('sortO') set sortO(s: MatSort) { if (s) { this.offresDS.sort = s; } }

    // ── Suppression en cours ─────────────────────────────
    deletingP: Record<string, boolean> = {};
    deletingO: Record<string, boolean> = {};

    private _unsub = new Subject<void>();

    constructor(
        private _svc: PartnershipsService,
        private _router: Router,
        private _toastr: ToastrService
    ) { }

    ngOnInit(): void {
        this._loadPartenaires();
        this._loadOffres();
        this._loadUsersAndReservations();
    }

    ngOnDestroy(): void {
        this._unsub.next();
        this._unsub.complete();
    }

    // ════════════════════════════════════════════════════
    // PARTENAIRES
    // ════════════════════════════════════════════════════

    private _loadPartenaires(): void {
        this.loadingP = true;
        this._svc.getPartenaires()
            .pipe(takeUntil(this._unsub), finalize(() => this.loadingP = false))
            .subscribe({
                next: (data) => {
                    this.partenaires = data;
                    this.partenairesDS.data = data;
                },
                error: () => this._toastr.error('Erreur chargement partenaires')
            });
    }

    nouveauPartenaire(): void {
        this._router.navigate(['/apps/partnerships/admin/partenaires/nouveau']);
    }

    modifierPartenaire(id: string): void {
        this._router.navigate(['/apps/partnerships/admin/partenaires/modifier', id]);
    }

    supprimerPartenaire(id: string): void {
        if (!confirm('Confirmer la suppression de ce partenaire ?')) { return; }
        this.deletingP[id] = true;
        this._svc.supprimerPartenaire(id)
            .pipe(takeUntil(this._unsub), finalize(() => delete this.deletingP[id]))
            .subscribe({
                next: () => {
                    this._toastr.success('Partenaire supprimé');
                    this._loadPartenaires();
                },
                error: () => this._toastr.error('Erreur lors de la suppression')
            });
    }

    togglePartenaire(partenaire: Partenaire): void {
        this._svc.toggleActifPartenaire(partenaire.id!)
            .pipe(takeUntil(this._unsub))
            .subscribe({
                next: (updated) => {
                    const i = this.partenaires.findIndex(p => p.id === updated.id);
                    if (i !== -1) { this.partenaires[i] = updated; this.partenairesDS.data = [...this.partenaires]; }
                    this._toastr.success(updated.actif ? 'Partenaire activé' : 'Partenaire désactivé');
                },
                error: () => this._toastr.error('Erreur mise à jour statut')
            });
    }

    filtrerPartenaires(event: Event): void {
        const val = (event.target as HTMLInputElement).value;
        this.partenairesDS.filter = val.trim().toLowerCase();
    }

    // ════════════════════════════════════════════════════
    // OFFRES
    // ════════════════════════════════════════════════════

    private _loadOffres(): void {
        this.loadingO = true;
        this._svc.getOffres()
            .pipe(takeUntil(this._unsub), finalize(() => this.loadingO = false))
            .subscribe({
                next: (data) => {
                    this.offres = data;
                    this.offresDS.data = data;
                },
                error: () => this._toastr.error('Erreur chargement offres')
            });
    }

    nouvelleOffre(): void {
        this._router.navigate(['/apps/partnerships/admin/offres/nouvelle']);
    }

    modifierOffre(id: string): void {
        this._router.navigate(['/apps/partnerships/admin/offres/modifier', id]);
    }

    supprimerOffre(id: string): void {
        if (!confirm('Confirmer la suppression de cette offre ?')) { return; }
        this.deletingO[id] = true;
        this._svc.supprimerOffre(id)
            .pipe(takeUntil(this._unsub), finalize(() => delete this.deletingO[id]))
            .subscribe({
                next: () => {
                    this._toastr.success('OffreAvantage supprimée');
                    this._loadOffres();
                },
                error: () => this._toastr.error('Erreur lors de la suppression')
            });
    }

    toggleOffre(offre: OffreAvantage): void {
        this._svc.toggleStatutOffre(offre.id!)
            .pipe(takeUntil(this._unsub))
            .subscribe({
                next: (updated) => {
                    const i = this.offres.findIndex(o => o.id === updated.id);
                    if (i !== -1) { this.offres[i] = updated; this.offresDS.data = [...this.offres]; }
                    this._toastr.success(updated.statut === 'ACTIVE' ? 'OffreAvantage activée' : 'OffreAvantage désactivée');
                },
                error: () => this._toastr.error('Erreur mise à jour statut')
            });
    }

    filtrerOffres(event: Event): void {
        const val = (event.target as HTMLInputElement).value;
        this.offresDS.filter = val.trim().toLowerCase();
    }

    getNomPartenaire(idPartenaire: string): string {
        return this.partenaires.find(p => p.id === idPartenaire)?.nom || '-';
    }

    // ════════════════════════════════════════════════════
    // RÉSERVATIONS
    // ════════════════════════════════════════════════════

    private _loadUsersAndReservations(): void {
        this.loadingR = true;

        // Charger d'abord les utilisateurs pour enrichir plus tard
        this._svc.getAllUsers()
            .pipe(takeUntil(this._unsub))
            .subscribe({
                next: (users) => {
                    this.users = users;
                    this._loadReservations();
                },
                error: () => {
                    this._toastr.error('Erreur chargement utilisateurs');
                    this._loadReservations();
                }
            });
    }

    private _loadReservations(): void {
        this._svc.getAllReservations()
            .pipe(takeUntil(this._unsub), finalize(() => this.loadingR = false))
            .subscribe({
                next: (data) => {
                    // Enrichir avec titre de l'offre et nom de l'utilisateur
                    data.forEach(r => {
                        // Titre de l'offre
                        if (r.idOffreAvantage) {
                            const o = this.offres.find(x => x.id === r.idOffreAvantage);
                            if (o) r.titreOffreAvantage = o.titre;
                        }
                        // Nom de l'utilisateur
                        if (r.idUser) {
                            const u = this.users.find(x => x.id === r.idUser);
                            if (u) {
                                r.nomUser = `${u.prenom || ''} ${u.nom || ''}`.trim() || u.email;
                            } else {
                                r.nomUser = `Utilisateur ${r.idUser.substring(0, 6)}...`;
                            }
                        }
                    });

                    this.reservationsDS.data = data.sort((a, b) =>
                        new Date(b.dateReservation!).getTime() - new Date(a.dateReservation!).getTime()
                    );
                },
                error: () => this._toastr.error('Erreur chargement réservations')
            });
    }

    filtrerReservations(event: Event): void {
        const val = (event.target as HTMLInputElement).value;
        this.reservationsDS.filter = val.trim().toLowerCase();
    }

    retourCatalogue(): void {
        this._router.navigate(['/apps/partnerships']);
    }
}


