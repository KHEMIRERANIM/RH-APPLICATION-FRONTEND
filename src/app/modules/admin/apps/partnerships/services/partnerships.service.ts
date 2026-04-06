import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
    Partenaire,
    Offre,
    AvantageReservation,
    CategorieOffre,
    CreatePartenaireRequest,
    CreateOffreRequest,
    Wishlist,
    StatAvantageKpi,
    StatCategorie,
    StatTopOffre,
    StatMensuelle,
    StatStatut
} from '../models/partnerships.models';

@Injectable({
    providedIn: 'root'
})
export class PartnershipsService {

    private readonly BASE_URL = 'http://localhost:8081/api';

    constructor(private _http: HttpClient) {}

    // ──────────────────────────────────────
    // PARTENAIRES
    // ──────────────────────────────────────

    /** GET /api/partenaires — ADMIN + EMPLOYÉ */
    getPartenaires(): Observable<Partenaire[]> {
        return this._http.get<Partenaire[]>(`${this.BASE_URL}/partenaires`);
    }

    /** GET /api/partenaires/{id} — ADMIN + EMPLOYÉ */
    getPartenaireById(id: string): Observable<Partenaire> {
        return this._http.get<Partenaire>(`${this.BASE_URL}/partenaires/${id}`);
    }

    /** POST /api/partenaires — ADMIN */
    creerPartenaire(partenaire: CreatePartenaireRequest): Observable<Partenaire> {
        return this._http.post<Partenaire>(`${this.BASE_URL}/partenaires`, partenaire);
    }

    /** PUT /api/partenaires/{id} — ADMIN */
    modifierPartenaire(id: string, partenaire: Partial<Partenaire>): Observable<Partenaire> {
        return this._http.put<Partenaire>(`${this.BASE_URL}/partenaires/${id}`, partenaire);
    }

    /** DELETE /api/partenaires/{id} — ADMIN */
    supprimerPartenaire(id: string): Observable<void> {
        return this._http.delete<void>(`${this.BASE_URL}/partenaires/${id}`);
    }

    /** PATCH /api/partenaires/{id}/toggle-actif — ADMIN */
    toggleActifPartenaire(id: string): Observable<Partenaire> {
        return this._http.patch<Partenaire>(`${this.BASE_URL}/partenaires/${id}/toggle-actif`, {});
    }

    // ──────────────────────────────────────
    // OFFRES
    // ──────────────────────────────────────

    /** GET /api/offres?categorie=... — ADMIN + EMPLOYÉ */
    getOffres(categorie?: CategorieOffre): Observable<Offre[]> {
        let params = new HttpParams();
        if (categorie) {
            params = params.set('categorie', categorie);
        }
        return this._http.get<Offre[]>(`${this.BASE_URL}/offres`, { params });
    }

    /** GET /api/offres/{id} — ADMIN + EMPLOYÉ */
    getOffreById(id: string): Observable<Offre> {
        return this._http.get<Offre>(`${this.BASE_URL}/offres/${id}`);
    }

    /** GET /api/offres/partenaire/{idPartenaire} — ADMIN */
    getOffresByPartenaire(idPartenaire: string): Observable<Offre[]> {
        return this._http.get<Offre[]>(`${this.BASE_URL}/offres/partenaire/${idPartenaire}`);
    }

    /** POST /api/offres — ADMIN */
    creerOffre(offre: CreateOffreRequest): Observable<Offre> {
        return this._http.post<Offre>(`${this.BASE_URL}/offres`, offre);
    }

    /** PUT /api/offres/{id} — ADMIN */
    modifierOffre(id: string, offre: Partial<Offre>): Observable<Offre> {
        return this._http.put<Offre>(`${this.BASE_URL}/offres/${id}`, offre);
    }

    /** DELETE /api/offres/{id} — ADMIN */
    supprimerOffre(id: string): Observable<void> {
        return this._http.delete<void>(`${this.BASE_URL}/offres/${id}`);
    }

    /** PATCH /api/offres/{id}/toggle-statut — ADMIN */
    toggleStatutOffre(id: string): Observable<Offre> {
        return this._http.patch<Offre>(`${this.BASE_URL}/offres/${id}/toggle-statut`, {});
    }

    // ──────────────────────────────────────
    // RÉSERVATIONS
    // ──────────────────────────────────────

    /**
     * POST /api/reservations?idOffre=...&nbPersonnes=...
     * Crée ou modifie une réservation existante — ADMIN + EMPLOYÉ
     */
    reserverOuModifier(idOffre: string, nbPersonnes: number): Observable<AvantageReservation> {
        const params = new HttpParams()
            .set('idOffre', idOffre)
            .set('nbPersonnes', nbPersonnes.toString());
        return this._http.post<AvantageReservation>(`${this.BASE_URL}/avantages/reservations`, null, { params });
    }

    /**
     * POST /api/reservations/hotel?idOffre=...&nbAdultes=...
     * Crée ou modifie une réservation hôtelière — ADMIN + EMPLOYÉ
     */
    reserverHotel(idOffre: string, nbAdultes: number, nbEnfants: number, formule: string, checkIn: string, checkOut: string): Observable<AvantageReservation> {
        let params = new HttpParams()
            .set('idOffre', idOffre)
            .set('nbAdultes', nbAdultes.toString())
            .set('nbEnfants', nbEnfants.toString())
            .set('formule', formule)
            .set('checkIn', checkIn)
            .set('checkOut', checkOut);
        return this._http.post<AvantageReservation>(`${this.BASE_URL}/avantages/reservations/hotel`, null, { params });
    }

    /** GET /api/reservations/mes-reservations — ADMIN + EMPLOYÉ */
    getMesReservations(): Observable<AvantageReservation[]> {
        return this._http.get<AvantageReservation[]>(`${this.BASE_URL}/avantages/reservations/mes-reservations`);
    }

    /** DELETE /api/reservations/mes-reservations/annulees — ADMIN + EMPLOYÉ */
    viderReservationsAnnulees(): Observable<void> {
        return this._http.delete<void>(`${this.BASE_URL}/avantages/reservations/mes-reservations/annulees`);
    }

    /** PATCH /api/reservations/{id}/annuler — ADMIN + EMPLOYÉ */
    annulerReservation(id: string): Observable<AvantageReservation> {
        return this._http.patch<AvantageReservation>(`${this.BASE_URL}/avantages/reservations/${id}/annuler`, {});
    }

    /** GET /api/reservations — ADMIN seulement */
    getAllReservations(): Observable<AvantageReservation[]> {
        return this._http.get<AvantageReservation[]>(`${this.BASE_URL}/avantages/reservations`);
    }

    /** GET /api/reservations/offre/{idOffre} — ADMIN seulement */
    getReservationsByOffre(idOffre: string): Observable<AvantageReservation[]> {
        return this._http.get<AvantageReservation[]>(`${this.BASE_URL}/avantages/reservations/offre/${idOffre}`);
    }

    /** GET /api/users — ADMIN seulement */
    getAllUsers(): Observable<any[]> {
        return this._http.get<any[]>(`${this.BASE_URL}/users`);
    }

    // ──────────────────────────────────────
    // WISHLIST (FAVORIS)
    // ──────────────────────────────────────

    /** POST /api/wishlist?idOffre=... */
    ajouterFavori(idOffre: string): Observable<Wishlist> {
        let params = new HttpParams().set('idOffre', idOffre);
        return this._http.post<Wishlist>(`${this.BASE_URL}/wishlist`, null, { params });
    }

    /** DELETE /api/wishlist/{idOffre} */
    retirerFavori(idOffre: string): Observable<void> {
        return this._http.delete<void>(`${this.BASE_URL}/wishlist/${idOffre}`);
    }

    /** GET /api/wishlist/mes-favoris */
    getMesFavoris(): Observable<Wishlist[]> {
        return this._http.get<Wishlist[]>(`${this.BASE_URL}/wishlist/mes-favoris`);
    }

    /** GET /api/wishlist/check/{idOffre} */
    estEnFavori(idOffre: string): Observable<boolean> {
        return this._http.get<boolean>(`${this.BASE_URL}/wishlist/check/${idOffre}`);
    }

    // ──────────────────────────────────────
    // STATISTIQUES (ADMIN)
    // ──────────────────────────────────────

    getKpisAvantages(): Observable<StatAvantageKpi> {
        return this._http.get<StatAvantageKpi>(`${this.BASE_URL}/avantages/stats/kpis`);
    }

    getStatParCategorie(): Observable<StatCategorie[]> {
        return this._http.get<StatCategorie[]>(`${this.BASE_URL}/avantages/stats/par-categorie`);
    }

    getTopOffres(): Observable<StatTopOffre[]> {
        return this._http.get<StatTopOffre[]>(`${this.BASE_URL}/avantages/stats/top-offres`);
    }

    getStatParMois(annee?: number): Observable<StatMensuelle[]> {
        let params = new HttpParams();
        if (annee) params = params.set('annee', annee.toString());
        return this._http.get<StatMensuelle[]>(`${this.BASE_URL}/avantages/stats/par-mois`, { params });
    }

    getStatStatuts(): Observable<StatStatut[]> {
        return this._http.get<StatStatut[]>(`${this.BASE_URL}/avantages/stats/statuts`);
    }
}
