import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Bus {
  id?: string;
  marque: string;
  modele: string;
  immatriculation: string;
  capacite: number;
  typeCarburant: string;
  ligne: string;
  heureDepart: string;
  dureeMinutes: number;
  joursDisponibles: string;
  placesRestantes?: number;
  statut?: string;
  dateCreation?: string;
  depart: string;      // Ajouter
  arrivee: string;     // Ajouter
    photoUrl?: string; // ✅ Ajout
  /** Même pack que d'autres bus (activation dynamique). */
  packId?: string;
  /** Occupation par jour spécifique (ex: {"2026-04-06": 15, "2026-04-07": 0}) */
  dailyOccupancy?: { [date: string]: number };
  /** Dates spécifiques du pack (ex: ["2026-04-06", "2026-04-07", ...]) */
  packDates?: string[];
  /** Arrêts intermédiaires */
  arrets?: { name: string, latitude: number, longitude: number }[];
}

export interface BusPackRequest {
  busData: Partial<Bus>;
  activeCount: number;
  inactiveCount: number;
    busCapacities?: number[];  // ← ajouter cette ligne

}

@Injectable({ providedIn: 'root' })
export class BusService {
  private apiUrl = '/api/bus';

  constructor(private http: HttpClient) {}

  getAll(): Observable<Bus[]> {
    return this.http.get<Bus[]>(this.apiUrl);
  }

  getById(id: string): Observable<Bus> {
    return this.http.get<Bus>(`${this.apiUrl}/${id}`);
  }

 create(bus: Partial<Bus>): Observable<Bus> {
  return this.http.post<Bus>(this.apiUrl, bus);
}

update(id: string, bus: Partial<Bus>): Observable<Bus> {
  return this.http.put<Bus>(`${this.apiUrl}/${id}`, bus);
}

  createPack(request: BusPackRequest): Observable<Bus[]> {
    return this.http.post<Bus[]>(`${this.apiUrl}/pack`, request);
  }

  

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  activateForDay(busId: string, date: string): Observable<Bus> {
    return this.http.post<Bus>(`${this.apiUrl}/${busId}/activate-for-day?date=${date}`, {});
  }
}
