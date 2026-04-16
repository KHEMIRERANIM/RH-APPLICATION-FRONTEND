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

  modifierCandidature(id: string, cv?: File, lettre?: File): Observable<Candidature> {
    const formData = new FormData();
    if (cv) formData.append('cv', cv);
    if (lettre) formData.append('lettre', lettre);
    return this.http.put<Candidature>(`${this.api}/${id}`, formData);
  }

  analyzeSpeechPython(text: string): Observable<any> {
    return this.http.post<any>('http://localhost:5000/analyze-speech', { text });
  }

  soumettreTestLangue(id: string, scoreLangue: number): Observable<Candidature> {
    return this.http.post<Candidature>(`${this.api}/${id}/test-langue?scoreLangue=${scoreLangue}`, {});
  }

  telechargerContratPdf(id: string): Observable<Blob> {
    return this.http.get(`${this.api}/${id}/contrat/pdf`, { responseType: 'blob' });
  }

  chatCoach(message: string, fullname: string, offreTitle: string, missingSkills: string[], history: any[] = [], isInterviewMode: boolean = false, extractedSkills: string[] = []): Observable<any> {
    return this.http.post<any>('http://localhost:5000/chat-coach', {
      message, fullname, offreTitle, missingSkills, history, isInterviewMode, extractedSkills
    });
  }

  telechargerCoachTipsPdf(id: string, tips: string): Observable<Blob> {
    return this.http.post(`${this.api}/${id}/coach-tips/pdf`, { tips }, { responseType: 'blob' });
  }
}