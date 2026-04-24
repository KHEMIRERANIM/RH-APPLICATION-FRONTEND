// src/app/services/kpis.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { KPIsDTO } from '../../../shared/models/kpisFormation.model';

@Injectable({ providedIn: 'root' })
export class KPIsService {
  private apiUrl = 'http://localhost:8081/api/kpis';

  constructor(private http: HttpClient) {}

  getDashboardKPIs(): Observable<KPIsDTO> {
    return this.http.get<KPIsDTO>(`${this.apiUrl}/dashboard`);
  }
}