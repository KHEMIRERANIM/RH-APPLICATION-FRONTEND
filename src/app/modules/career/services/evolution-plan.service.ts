import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { EvolutionPlan, computeScores, Competence } from '../models/evolution-plan.model';
import { EmployeeCertification } from '../models/certification.model';

@Injectable({ providedIn: 'root' })
export class EvolutionPlanService {

  private apiUrl = 'http://localhost:8081/api/evolution_plans';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('accessToken');
    return new HttpHeaders({
      Authorization: `Bearer ${token || ''}`
    });
  }

  // Options sans Content-Type (pour les requêtes JSON normales)
  private opts() {
    return { headers: this.getHeaders() };
  }

  // ========================
  // GET / CREATE / UPDATE
  // ========================
  getMyPlan(): Observable<EvolutionPlan[]> {
    return this.http.get<EvolutionPlan[]>(`${this.apiUrl}/me`, this.opts())
      .pipe(map(plans => plans.map(p => computeScores(p))));
  }

  create(plan: Partial<EvolutionPlan>): Observable<EvolutionPlan> {
    return this.http.post<EvolutionPlan>(this.apiUrl, plan, this.opts())
      .pipe(map(p => computeScores(p)));
  }

  update(id: string, plan: Partial<EvolutionPlan>): Observable<EvolutionPlan> {
    return this.http.put<EvolutionPlan>(`${this.apiUrl}/${id}`, plan, this.opts())
      .pipe(map(p => computeScores(p)));
  }

  saveCompetences(planId: string, competences: Competence[]): Observable<EvolutionPlan> {
    return this.http.put<EvolutionPlan>(
      `${this.apiUrl}/${planId}/competences`,
      competences,
      this.opts()
    ).pipe(map(p => computeScores(p)));
  }

  addCertification(planId: string, certif: Partial<EmployeeCertification>): Observable<EvolutionPlan> {
    return this.http.post<EvolutionPlan>(
      `${this.apiUrl}/${planId}/certifications`, 
      certif, 
      this.opts()
    ).pipe(map(p => computeScores(p)));
  }

  updateCertification(planId: string, certifId: string, certif: Partial<EmployeeCertification>): Observable<EvolutionPlan> {
    return this.http.put<EvolutionPlan>(
      `${this.apiUrl}/${planId}/certifications/${certifId}`, 
      certif, 
      this.opts()
    ).pipe(map(p => computeScores(p)));
  }

  // ========================
  // UPLOAD FICHIER - CORRIGÉ
  // ========================
  uploadCertifFile(planId: string, certifId: string, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);

    // IMPORTANT : On n'envoie PAS les headers normaux pour FormData
    // Le navigateur gère automatiquement le Content-Type multipart/form-data
    return this.http.post(
      `${this.apiUrl}/${planId}/certifications/${certifId}/upload`,
      formData,
      {
        headers: this.getHeaders()   // On garde seulement l'Authorization
        // PAS de reportProgress ni observe pour l'instant (on peut l'ajouter plus tard)
      }
    );
  }

  // Autres méthodes...
  getAll(): Observable<EvolutionPlan[]> {
    return this.http.get<EvolutionPlan[]>(this.apiUrl, this.opts())
      .pipe(map(plans => plans.map(p => computeScores(p))));
  }

  enrichPlan(id: string, payload: any): Observable<EvolutionPlan> {
    return this.http.patch<EvolutionPlan>(
      `${this.apiUrl}/${id}/enrich`, 
      payload, 
      this.opts()
    ).pipe(map(p => computeScores(p)));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, this.opts());
  }
}