import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Entretien,
  CreateEntretienRequest,
  FeedbackEntretienRequest,
} from '../models/recrutement.models';

@Injectable({ providedIn: 'root' })
export class EntretienService {

  private api = `${window.location.protocol}//${window.location.hostname}:8081/api/recrutement/entretiens`;

  constructor(private http: HttpClient) {}

  planifierEntretien(request: CreateEntretienRequest): Observable<Entretien> {
    return this.http.post<Entretien>(this.api, request);
  }

  getEntretienById(id: string): Observable<Entretien> {
    return this.http.get<Entretien>(`${this.api}/${id}`);
  }

  getEntretiensParCandidature(candidatureId: string): Observable<Entretien[]> {
    return this.http.get<Entretien[]>(`${this.api}/candidature/${candidatureId}`);
  }

  getEntretiensParRecruteur(recruteurId: string): Observable<Entretien[]> {
    return this.http.get<Entretien[]>(`${this.api}/recruteur/${recruteurId}`);
  }

  getEntretiensParCandidat(candidatId: string, confirmedOnly: boolean = true): Observable<Entretien[]> {
    return this.http.get<Entretien[]>(`${this.api}/candidat/${candidatId}?confirmedOnly=${confirmedOnly}`);
  }

  modifierEntretien(id: string, request: CreateEntretienRequest): Observable<Entretien> {
    return this.http.put<Entretien>(`${this.api}/${id}`, request);
  }

  ajouterFeedback(id: string, request: FeedbackEntretienRequest): Observable<Entretien> {
    return this.http.post<Entretien>(`${this.api}/${id}/feedback`, request);
  }

  annulerEntretien(id: string): Observable<void> {
    return this.http.patch<void>(`${this.api}/${id}/annuler`, {});
  }

  marquerRealise(id: string): Observable<void> {
    return this.http.patch<void>(`${this.api}/${id}/realise`, {});
  }

  confirmerPresenceCandidat(id: string): Observable<Entretien> {
    return this.http.patch<Entretien>(`${this.api}/${id}/confirmer`, {});
  }
}
