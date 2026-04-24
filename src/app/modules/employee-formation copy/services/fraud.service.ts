// services/fraud.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { FraudEvent, FraudResponse, BlockedStatus } from '../../../shared/models/fraudFormation.models';

@Injectable({ providedIn: 'root' })
export class FraudService {
  private apiUrl = 'http://localhost:8081/api/fraud';

  constructor(private http: HttpClient) {}

  getExamFraudReport(examenId: string): Observable<FraudSummary[]> {
    return this.http.get<FraudSummary[]>(`${this.apiUrl}/report/${examenId}`);
  }

  getStudentFraudEvents(examenId: string, employeId: string): Observable<FraudEvent[]> {
    return this.http.get<FraudEvent[]>(`${this.apiUrl}/student/${examenId}/${employeId}`);
  }

  getBlockedStatus(examenId: string, employeId: string): Observable<BlockedStatus> {
    return this.http.get<BlockedStatus>(`${this.apiUrl}/blocked/${examenId}/${employeId}`);
  }

  getDashboardStats(): Observable<any> {
    return this.http.get(`${this.apiUrl}/dashboard/stats`);
  }

  getAllEvents(): Observable<FraudEvent[]> {
    return this.http.get<FraudEvent[]>(`${this.apiUrl}/all`);
  }
}