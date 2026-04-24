import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CareerPlan } from '../models/career-plan';

@Injectable({ providedIn: 'root' })
export class CareerPlanService {

  private apiUrl = 'http://localhost:8081/api/evolution_plans';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('accessToken');
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  // âœ… EmployÃ© â€” ses propres plans
  getMyPlans(): Observable<CareerPlan[]> {
    return this.http.get<CareerPlan[]>(
      `${this.apiUrl}/me`,
      { headers: this.getHeaders() }
    );
  }

  // âœ… RH â€” tous les plans
  getAll(): Observable<CareerPlan[]> {
    return this.http.get<CareerPlan[]>(
      this.apiUrl,
      { headers: this.getHeaders() }
    );
  }

  getByEmployee(employeeId: string): Observable<CareerPlan[]> {
    return this.http.get<CareerPlan[]>(
      `${this.apiUrl}/employee/${employeeId}`,
      { headers: this.getHeaders() }
    );
  }

  create(dto: any): Observable<CareerPlan> {
    return this.http.post<CareerPlan>(
      this.apiUrl, dto,
      { headers: this.getHeaders() }
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/${id}`,
      { headers: this.getHeaders() }
    );
  }
}
