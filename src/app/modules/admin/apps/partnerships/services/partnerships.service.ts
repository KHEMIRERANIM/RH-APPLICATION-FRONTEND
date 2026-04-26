import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
    Partenaire,
    OffreAvantage,
    AvantageReservation,
    CategorieOffreAvantage,
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

    private readonly BASE_URL = '/api';

    constructor(private _http: HttpClient) {}

    // --------------------------------------
    // PARTENAIRES
    // --------------------------------------

    /** GET /api/partenaires - ADMIN + EMPLOYÉ */
    getPartenaires(): Observable<Partenaire[]> {
        return this._http.get<Partenaire[]>(`${this.BASE_URL}/partenaires`);
    }

    /** GET /api/partenaires/{id} - ADMIN + EMPLOYÉ */
    getPartenaireById(id: string): Observable<Partenaire> {
        return this._http.get<Partenaire>(`${this.BASE_URL}/partenaires/${id}`);
    }

    /** POST /api/partenaires - ADMIN */
    creerPartenaire(partenaire: CreatePartenaireRequest): Observable<Partenaire> {
        return this._http.post<Partenaire>(`${this.BASE_URL}/partenaires`, partenaire);
    }

    /** PUT /api/partenaires/{id} - ADMIN */
    modifierPartenaire(id: string, partenaire: Partial<Partenaire>): Observable<Partenaire> {
        return this._http.put<Partenaire>(`${this.BASE_URL}/partenaires/${id}`, partenaire);
    }

    /** DELETE /api/partenaires/{id} - ADMIN */
    supprimerPartenaire(id: string): Observable<void> {
        return this._http.delete<void>(`${this.BASE_URL}/partenaires/${id}`);
    }

    /** PATCH /api/partenaires/{id}/toggle-actif - ADMIN */
    toggleActifPartenaire(id: string): Observable<Partenaire> {
        return this._http.patch<Partenaire>(`${this.BASE_URL}/partenaires/${id}/toggle-actif`, {});
    }

    // --------------------------------------
    // OFFRES
    // --------------------------------------

    /** GET /api/offre-avantages?categorie=... - ADMIN + EMPLOYÉ */
    getOffres(categorie?: CategorieOffreAvantage): Observable<OffreAvantage[]> {
        let params = new HttpParams();
        if (categorie) {
            params = params.set('categorie', categorie);
        }
        return this._http.get<OffreAvantage[]>(`${this.BASE_URL}/offres`, { params });
    }

    /** GET /api/offre-avantages/{id} - ADMIN + EMPLOYÉ */
    getOffreById(id: string): Observable<OffreAvantage> {
        return this._http.get<OffreAvantage>(`${this.BASE_URL}/offres/${id}`);
    }

    /** GET /api/offre-avantages/{id}/urgence - ADMIN + EMPLOYÉ */
    evaluerUrgence(id: string): Observable<{ urgence: boolean; probabilite_rupture: number }> {
        return this._http.get<{ urgence: boolean; probabilite_rupture: number }>(`${this.BASE_URL}/offres/${id}/urgence`);
    }

    /** GET /api/offre-avantages/partenaire/{idPartenaire} - ADMIN */
    getOffresByPartenaire(idPartenaire: string): Observable<OffreAvantage[]> {
        return this._http.get<OffreAvantage[]>(`${this.BASE_URL}/offres/partenaire/${idPartenaire}`);
    }

    /** POST /api/offre-avantages - ADMIN */
    creerOffre(offre: CreateOffreRequest): Observable<OffreAvantage> {
        return this._http.post<OffreAvantage>(`${this.BASE_URL}/offres`, offre);
    }

    /** PUT /api/offre-avantages/{id} - ADMIN */
    modifierOffre(id: string, offre: Partial<OffreAvantage>): Observable<OffreAvantage> {
        return this._http.put<OffreAvantage>(`${this.BASE_URL}/offres/${id}`, offre);
    }

    /** DELETE /api/offre-avantages/{id} - ADMIN */
    supprimerOffre(id: string): Observable<void> {
        return this._http.delete<void>(`${this.BASE_URL}/offres/${id}`);
    }

    /** PATCH /api/offre-avantages/{id}/toggle-statut - ADMIN */
    toggleStatutOffre(id: string): Observable<OffreAvantage> {
        return this._http.patch<OffreAvantage>(`${this.BASE_URL}/offres/${id}/toggle-statut`, {});
    }

    // --------------------------------------
    // RÉSERVATIONS
    // --------------------------------------

    /**
     * POST /api/reservations?idOffreAvantage=...&nbPersonnes=...
     * Crée ou modifie une réservation existante - ADMIN + EMPLOYÉ
     */
    reserverOuModifier(idOffreAvantage: string, nbPersonnes: number): Observable<AvantageReservation> {
        let params = new HttpParams()
            .set('idOffreAvantage', idOffreAvantage)
            .set('nbPersonnes', nbPersonnes.toString());
        return this._http.post<AvantageReservation>(`${this.BASE_URL}/avantages/reservations`, null, { params });
    }

    /**
     * POST /api/reservations/hotel?idOffreAvantage=...&nbAdultes=...
     * Crée ou modifie une réservation hôtelière - ADMIN + EMPLOYÉ
     */
    reserverHotel(idOffreAvantage: string, nbAdultes: number, nbEnfants: number, formule: string, checkIn: string, checkOut: string): Observable<AvantageReservation> {
        let params = new HttpParams()
            .set('idOffreAvantage', idOffreAvantage)
            .set('nbAdultes', nbAdultes.toString())
            .set('nbEnfants', nbEnfants.toString())
            .set('formule', formule)
            .set('checkIn', checkIn)
            .set('checkOut', checkOut);
        return this._http.post<AvantageReservation>(`${this.BASE_URL}/avantages/reservations/hotel`, null, { params });
    }

    /** GET /api/reservations/mes-reservations - ADMIN + EMPLOYÉ */
    getMesReservations(): Observable<AvantageReservation[]> {
        return this._http.get<AvantageReservation[]>(`${this.BASE_URL}/avantages/reservations/mes-reservations`);
    }

    /** DELETE /api/reservations/mes-reservations/annulees - ADMIN + EMPLOYÉ */
    viderReservationsAnnulees(): Observable<void> {
        return this._http.delete<void>(`${this.BASE_URL}/avantages/reservations/mes-reservations/annulees`);
    }

    /** PATCH /api/reservations/{id}/annuler - ADMIN + EMPLOYÉ */
    annulerReservation(id: string): Observable<AvantageReservation> {
        return this._http.patch<AvantageReservation>(`${this.BASE_URL}/avantages/reservations/${id}/annuler`, {});
    }

    /** GET /api/reservations - ADMIN seulement */
    getAllReservations(): Observable<AvantageReservation[]> {
        return this._http.get<AvantageReservation[]>(`${this.BASE_URL}/avantages/reservations`);
    }

    /** GET /api/reservations/offre/{idOffreAvantage} - ADMIN seulement */
    getReservationsByOffre(idOffreAvantage: string): Observable<AvantageReservation[]> {
        return this._http.get<AvantageReservation[]>(`${this.BASE_URL}/avantages/reservations/offreAvantage/${idOffreAvantage}`);
    }

    /** GET /api/users - ADMIN seulement */
    getAllUsers(): Observable<any[]> {
        return this._http.get<any[]>(`${this.BASE_URL}/users`);
    }

    // --------------------------------------
    // WISHLIST (FAVORIS)
    // --------------------------------------

    /** POST /api/wishlist?idOffreAvantage=... */
    ajouterFavori(idOffreAvantage: string): Observable<Wishlist> {
        let params = new HttpParams().set('idOffreAvantage', idOffreAvantage);
        return this._http.post<Wishlist>(`${this.BASE_URL}/wishlist`, null, { params });
    }

    /** DELETE /api/wishlist/{idOffreAvantage} */
    retirerFavori(idOffreAvantage: string): Observable<void> {
        return this._http.delete<void>(`${this.BASE_URL}/wishlist/${idOffreAvantage}`);
    }

    /** GET /api/wishlist/mes-favoris */
    getMesFavoris(): Observable<Wishlist[]> {
        return this._http.get<Wishlist[]>(`${this.BASE_URL}/wishlist/mes-favoris`);
    }

    /** GET /api/wishlist/check/{idOffreAvantage} */
    estEnFavori(idOffreAvantage: string): Observable<boolean> {
        return this._http.get<boolean>(`${this.BASE_URL}/wishlist/check/${idOffreAvantage}`);
    }

    // --------------------------------------
    // STATISTIQUES (ADMIN)
    // --------------------------------------

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

