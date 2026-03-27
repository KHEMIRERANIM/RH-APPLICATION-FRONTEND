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
}

@Injectable({
  providedIn: 'root'
})
export class CovoiturageService {
  private apiUrl = 'http://localhost:8081/api'; // Same base URL used in UserService

  constructor(private http: HttpClient) {}

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
}
