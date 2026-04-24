import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MobilityRequest, MobilityStatus } from '../models/mobility.model';

export interface MotivationAnalysis {
  scoreGlobal: number;
  scorePertinence: number;
  scoreClarte: number;
  scoreMotivation: number;
  scoreProfessionnalisme: number;
  scoreOriginalite: number;
  sentiment: string;
  langue: string;
  pointsForts: string[];
  pointsAmeliorer: string[];
  suggestions: string[];
  resume: string;
  recommandation: string;
  recommandationColor: string;
}

@Injectable({ providedIn: 'root' })
export class MobilityService {
  private apiUrl = 'http://localhost:8081/api/mobility';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('accessToken');
    return new HttpHeaders({
      Authorization: `Bearer ${token || ''}`
    });
  }

  // =========================
  // 🔹 ADMIN
  // =========================
  getAll(): Observable<MobilityRequest[]> {
    return this.http.get<MobilityRequest[]>(this.apiUrl, {
      headers: this.getHeaders()
    });
  }

  getByEmployee(employeeId: string): Observable<MobilityRequest[]> {
    return this.http.get<MobilityRequest[]>(
      `${this.apiUrl}/employee/${employeeId}`,
      { headers: this.getHeaders() }
    );
  }

  getByStatus(status: MobilityStatus): Observable<MobilityRequest[]> {
    return this.http.get<MobilityRequest[]>(
      `${this.apiUrl}/status/${status}`,
      { headers: this.getHeaders() }
    );
  }

  review(
    id: string,
    dto: { status: MobilityStatus; reviewedBy: string; reviewComment: string }
  ): Observable<MobilityRequest> {
    return this.http.patch<MobilityRequest>(
      `${this.apiUrl}/${id}/review`,
      dto,
      { headers: this.getHeaders() }
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/${id}`,
      { headers: this.getHeaders() }
    );
  }

  // =========================
  // 🔹 EMPLOYÉ
  // =========================
  getMyRequests(): Observable<MobilityRequest[]> {
    return this.http.get<MobilityRequest[]>(
      `${this.apiUrl}/me`,
      { headers: this.getHeaders() }
    );
  }

  submit(dto: {
    employeeId: string;
    targetCareerId: string;
    motivationLetter: string;
  }): Observable<MobilityRequest> {
    return this.http.post<MobilityRequest>(
      this.apiUrl,
      dto,
      { headers: this.getHeaders() }
    );
  }

  submitWithFile(formData: FormData): Observable<MobilityRequest> {
    return this.http.post<MobilityRequest>(
      `${this.apiUrl}/with-file`,
      formData,
      { headers: this.getHeaders() }
    );
  }

  // =========================
  // 🔹 FICHIERS
  // =========================
  getPreview(id: string): Observable<Blob> {
    return this.http.get(
      `${this.apiUrl}/${id}/preview`,
      { headers: this.getHeaders(), responseType: 'blob' }
    );
  }

  downloadFile(id: string): Observable<Blob> {
    return this.http.get(
      `${this.apiUrl}/${id}/download`,
      { headers: this.getHeaders(), responseType: 'blob' }
    );
  }

  // =========================
  // 🔹 ANALYSE IA MOTIVATION
  // =========================
  analyzeMotivation(id: string): Observable<MotivationAnalysis> {
    return this.http.get<MotivationAnalysis>(
      `${this.apiUrl}/${id}/analyze`,
      { headers: this.getHeaders() }
    );
  }
}