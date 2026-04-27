import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EvolutionPlan, Competence } from '../models/evolution-plan.model';
import { EmployeeCertification } from '../models/certification.model';

@Injectable({ providedIn: 'root' })
export class EvolutionPlanService {

  private apiUrl = '/api/evolution_plans';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('accessToken');
    return new HttpHeaders({
      Authorization: `Bearer ${token || ''}`
    });
  }

  private opts() {
    return { headers: this.getHeaders() };
  }

  getMyPlan(): Observable<EvolutionPlan[]> {
    return this.http.get<EvolutionPlan[]>(`${this.apiUrl}/me`, this.opts());
  }

  create(plan: Partial<EvolutionPlan>): Observable<EvolutionPlan> {
    return this.http.post<EvolutionPlan>(this.apiUrl, plan, this.opts());
  }

  update(id: string, plan: Partial<EvolutionPlan>): Observable<EvolutionPlan> {
    return this.http.put<EvolutionPlan>(`${this.apiUrl}/${id}`, plan, this.opts());
  }

  saveCompetences(planId: string, competences: Competence[]): Observable<EvolutionPlan> {
    return this.http.put<EvolutionPlan>(
      `${this.apiUrl}/${planId}/competences`,
      competences,
      this.opts()
    );
  }

  addCertification(planId: string, certif: Partial<EmployeeCertification>): Observable<EvolutionPlan> {
    return this.http.post<EvolutionPlan>(
      `${this.apiUrl}/${planId}/certifications`,
      certif,
      this.opts()
    );
  }

  updateCertification(
    planId: string,
    certifId: string,
    certif: Partial<EmployeeCertification>
  ): Observable<EvolutionPlan> {
    return this.http.put<EvolutionPlan>(
      `${this.apiUrl}/${planId}/certifications/${certifId}`,
      certif,
      this.opts()
    );
  }

  uploadCertifFile(planId: string, certifId: string, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post(
      `${this.apiUrl}/${planId}/certifications/${certifId}/upload`,
      formData,
      {
        headers: this.getHeaders()
      }
    );
  }

  downloadFile(fileUrl: string): Observable<Blob> {
    // Si fileUrl commence par /api, on le garde tel quel (relatif au proxy)
    // Sinon, on s'assure qu'il commence par /api si c'est ce qu'attend le backend
    const url = fileUrl.startsWith('http') 
      ? fileUrl 
      : fileUrl.startsWith('/api') 
        ? fileUrl 
        : `/api${fileUrl.startsWith('/') ? '' : '/'}${fileUrl}`;
    
    return this.http.get(url, {
      headers: this.getHeaders(),
      responseType: 'blob'
    });
  }

  getAll(): Observable<EvolutionPlan[]> {
    return this.http.get<EvolutionPlan[]>(this.apiUrl, this.opts());
  }

  enrichPlan(id: string, payload: any): Observable<EvolutionPlan> {
    return this.http.patch<EvolutionPlan>(
      `${this.apiUrl}/${id}/enrich`,
      payload,
      this.opts()
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, this.opts());
  }
}