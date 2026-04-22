import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RseAction, RseActionRequest } from '../models/rse-action.model';
import { ValidationResponse } from '../models/validation-response.model';
import { RseUserData } from '../models/rse-user-data.model';

@Injectable({
  providedIn: 'root'
})
export class RseService {
  private baseUrl = 'http://localhost:8081/api/rse';

  constructor(private http: HttpClient) {}

  submitAction(data: RseActionRequest): Observable<RseAction> {
    return this.http.post<RseAction>(`${this.baseUrl}/employee/action`, data);
  }

  validateAction(actionId: string): Observable<ValidationResponse> {
    return this.http.put<ValidationResponse>(`${this.baseUrl}/admin/validate/${actionId}`, {});
  }

  getPendingActions(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/admin/pending`);
  }

  getValidatedActions(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/admin/validated`);
  }

  getUserRseData(userId: string): Observable<RseUserData> {
    return this.http.get<RseUserData>(`${this.baseUrl}/employee/user/${userId}`);
  }

  getEmployeeActions(userId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/employee/actions/${userId}`);
  }
}