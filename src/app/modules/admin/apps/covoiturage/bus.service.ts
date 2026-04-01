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

}

@Injectable({ providedIn: 'root' })
export class BusService {
  private apiUrl = 'http://localhost:8081/api/bus';

  constructor(private http: HttpClient) {}

  getAll(): Observable<Bus[]> {
    return this.http.get<Bus[]>(this.apiUrl);
  }

  getById(id: string): Observable<Bus> {
    return this.http.get<Bus>(`${this.apiUrl}/${id}`);
  }

  create(bus: Bus): Observable<Bus> {
    return this.http.post<Bus>(this.apiUrl, bus);
  }

  update(id: string, bus: Bus): Observable<Bus> {
    return this.http.put<Bus>(`${this.apiUrl}/${id}`, bus);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}