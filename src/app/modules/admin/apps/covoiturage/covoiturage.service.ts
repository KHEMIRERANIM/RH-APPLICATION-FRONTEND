import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Vehicule {
  id?: string;
  employeId?: string;
  marque: string;
  modele: string;
  immatriculation: string;
  nbPlaces: number;
  typeCarburant: 'ESSENCE' | 'DIESEL' | 'ELECTRIQUE' | 'HYBRIDE';
  isDefault?: boolean;
}

export interface Trajet {


  id?: string;
  employeId?: string;
  vehiculeId?: string;
  categorie: 'COVOITURAGE' | 'NAVETTE' | 'INTER_SITES' | 'ADAPTE';
  adresseDepart: string;
  adresseArrivee: string;
  heureDepart: string; // LocalTime format 'HH:mm'
  joursDisponibles: string; // ex: "Lundi, Mardi"
  placesDisponibles: number;
  placesRestantes: number;
  statut: 'ACTIF' | 'COMPLET' | 'ANNULE';
  dateCreation?: string;
  reservations?: ReservationResponse[];
}

export interface ReservationRequest {
  trajetId: string;
  employeId: string;
  statut: 'EN_ATTENTE' | 'CONFIRME' | 'ANNULE';
    distanceKm?: number;

}

export interface ReservationResponse {
  id: string;
  trajetId: string;
  employeId: string;
  statut: 'EN_ATTENTE' | 'CONFIRME' | 'ANNULE';
  dateReservation: string;
  co2AvecCovoit?: number;
  co2EconomiseKg?: number;
  pointsEco?: number;
  dateCalcul?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CovoiturageService {
  private apiUrl = 'http://10.90.222.174:8081/api'; // Same base URL used in UserService

  constructor(private http: HttpClient) { }

  // --- VEHICULES ---

  getVehiculesByEmployeId(employeId: string): Observable<Vehicule[]> {
    return this.http.get<Vehicule[]>(`${this.apiUrl}/vehicules`).pipe(
      map(vehicules => vehicules.filter(v => v.employeId === employeId))
    );
  }

  creerVehicule(vehicule: Vehicule): Observable<Vehicule> {
    return this.http.post<Vehicule>(`${this.apiUrl}/vehicules`, vehicule);
  }

  updateVehicule(id: string, vehicule: Partial<Vehicule>): Observable<Vehicule> {
    return this.http.put<Vehicule>(`${this.apiUrl}/vehicules/${id}`, vehicule);
  }

  deleteVehicule(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/vehicules/${id}`);
  }

  // --- TRAJETS ---

  getTrajetsByEmployeId(employeId: string): Observable<Trajet[]> {
    return this.http.get<Trajet[]>(`${this.apiUrl}/trajets`).pipe(
      map(trajets => trajets.filter(t => t.employeId === employeId))
    );
  }

  creerTrajet(trajet: Trajet): Observable<Trajet> {
    return this.http.post<Trajet>(`${this.apiUrl}/trajets`, trajet);
  }

  deleteTrajet(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/trajets/${id}`);
  }

  private reservationsUrl = 'http://10.90.222.174:8081/api/reservations';
  private empreintesUrl = 'http://10.90.222.174:8081/api/empreintes'; // ← ajouter


  getReservationsByEmploye(employeId: string): Observable<ReservationResponse[]> {
    return this.http.get<ReservationResponse[]>(`${this.reservationsUrl}/employe/${employeId}`);
  }
  
getTotalPointsEco(employeId: string): Observable<number> {
  return this.http.get<number>(`${this.empreintesUrl}/employe/${employeId}/points`); // ← modifier
}

  creerReservation(request: ReservationRequest): Observable<ReservationResponse> {
    return this.http.post<ReservationResponse>(this.reservationsUrl, request);
  }

  annulerReservation(id: string): Observable<void> {
    return this.http.delete<void>(`${this.reservationsUrl}/${id}`);
  }

  getReservationsByTrajet(trajetId: string): Observable<ReservationResponse[]> {
    return this.http.get<ReservationResponse[]>(`${this.reservationsUrl}/trajet/${trajetId}`);
  }

  updateReservationStatus(id: string, request: Partial<ReservationRequest>): Observable<ReservationResponse> {
    return this.http.put<ReservationResponse>(`${this.reservationsUrl}/${id}`, request);
  }

  getAllTrajets(): Observable<Trajet[]> {
    return this.http.get<Trajet[]>(`${this.apiUrl}/trajets`);
  }

  // Ajoutez avec les autres méthodes
getShuttles(): Observable<any[]> {
  return this.http.get<any[]>(`${this.apiUrl}/bus`);
}




getReservationsNavetteByEmploye(employeId: string): Observable<any[]> {
  return this.http.get<any[]>(`${this.apiUrl}/reservations-navette/employe/${employeId}`);
}

reserverNavette(reservation: any): Observable<any> {
  return this.http.post(`${this.apiUrl}/reservations-navette`, reservation);
}

annulerReservationNavette(reservationId: string): Observable<any> {
  return this.http.delete(`${this.apiUrl}/reservations-navette/${reservationId}`);
}

getTotalPointsNavette(employeId: string): Observable<number> {
  return this.http.get<number>(`${this.apiUrl}/reservations-navette/employe/${employeId}/points`);
}


}
