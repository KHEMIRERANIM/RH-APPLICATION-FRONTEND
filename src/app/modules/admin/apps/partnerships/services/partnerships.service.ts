import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
    Partenaire,
    Offre,
    Reservation,
    CategorieOffre,
    CreatePartenaireRequest,
    CreateOffreRequest
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
    reserverOuModifier(idOffre: string, nbPersonnes: number): Observable<Reservation> {
        const params = new HttpParams()
            .set('idOffre', idOffre)
            .set('nbPersonnes', nbPersonnes.toString());
        return this._http.post<Reservation>(`${this.BASE_URL}/reservations`, null, { params });
    }

    /**
     * POST /api/reservations/hotel?idOffre=...&nbAdultes=...
     * Crée ou modifie une réservation hôtelière — ADMIN + EMPLOYÉ
     */
    reserverHotel(idOffre: string, nbAdultes: number, nbEnfants: number, formule: string, checkIn: string, checkOut: string): Observable<Reservation> {
        let params = new HttpParams()
            .set('idOffre', idOffre)
            .set('nbAdultes', nbAdultes.toString())
            .set('nbEnfants', nbEnfants.toString())
            .set('formule', formule)
            .set('checkIn', checkIn)
            .set('checkOut', checkOut);
        return this._http.post<Reservation>(`${this.BASE_URL}/reservations/hotel`, null, { params });
    }

    /** GET /api/reservations/mes-reservations — ADMIN + EMPLOYÉ */
    getMesReservations(): Observable<Reservation[]> {
        return this._http.get<Reservation[]>(`${this.BASE_URL}/reservations/mes-reservations`);
    }

    /** DELETE /api/reservations/mes-reservations/annulees — ADMIN + EMPLOYÉ */
    viderReservationsAnnulees(): Observable<void> {
        return this._http.delete<void>(`${this.BASE_URL}/reservations/mes-reservations/annulees`);
    }

    /** PATCH /api/reservations/{id}/annuler — ADMIN + EMPLOYÉ */
    annulerReservation(id: string): Observable<Reservation> {
        return this._http.patch<Reservation>(`${this.BASE_URL}/reservations/${id}/annuler`, {});
    }

    /** GET /api/reservations — ADMIN seulement */
    getAllReservations(): Observable<Reservation[]> {
        return this._http.get<Reservation[]>(`${this.BASE_URL}/reservations`);
    }

    /** GET /api/reservations/offre/{idOffre} — ADMIN seulement */
    getReservationsByOffre(idOffre: string): Observable<Reservation[]> {
        return this._http.get<Reservation[]>(`${this.BASE_URL}/reservations/offre/${idOffre}`);
    }

    /** GET /api/users — ADMIN seulement */
    getAllUsers(): Observable<any[]> {
        return this._http.get<any[]>(`${this.BASE_URL}/users`);
    }
}
