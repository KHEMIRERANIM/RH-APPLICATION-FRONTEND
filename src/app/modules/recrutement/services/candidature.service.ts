import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Candidature,
  ChangerStatutRequest,
  KanbanData,
} from '../models/recrutement.models';

@Injectable({ providedIn: 'root' })
export class CandidatureService {

  private api = `${window.location.protocol}//${window.location.hostname}:8081/api/recrutement/candidatures`;

  constructor(private http: HttpClient) {}

  postuler(candidatId: string, offreId: string, cv: File, lettre?: File): Observable<Candidature> {
    const formData = new FormData();
    formData.append('candidatId', candidatId);
    formData.append('offreId', offreId);
    formData.append('cv', cv);
    if (lettre) formData.append('lettre', lettre);
    return this.http.post<Candidature>(this.api, formData);
  }

  getCandidatureById(id: string): Observable<Candidature> {
    return this.http.get<Candidature>(`${this.api}/${id}`);
  }

  getCandidaturesParOffre(offreId: string): Observable<Candidature[]> {
    return this.http.get<Candidature[]>(`${this.api}/offre/${offreId}`);
  }

  getMesCandidatures(candidatId: string): Observable<Candidature[]> {
    return this.http.get<Candidature[]>(`${this.api}/candidat/${candidatId}`);
  }

  changerStatut(id: string, request: ChangerStatutRequest): Observable<Candidature> {
    return this.http.patch<Candidature>(`${this.api}/${id}/statut`, request);
  }

  ajouterNotes(id: string, notes: string): Observable<Candidature> {
    return this.http.patch<Candidature>(
      `${this.api}/${id}/notes?notes=${encodeURIComponent(notes)}`, {}
    );
  }

  getKanban(offreId: string): Observable<KanbanData> {
    return this.http.get<KanbanData>(`${this.api}/kanban/${offreId}`);
  }

  getTopCandidats(offreId: string): Observable<Candidature[]> {
    return this.http.get<Candidature[]>(`${this.api}/top/${offreId}`);
  }

  deleteCandidature(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }
}