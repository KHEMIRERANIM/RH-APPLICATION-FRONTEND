import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Career } from '../models/career.model';

@Injectable({ providedIn: 'root' })
export class CareerService {
  private apiUrl = 'http://localhost:8081/api/careers';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('accessToken');
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  getAll(): Observable<Career[]> {
    return this.http.get<Career[]>(this.apiUrl, { headers: this.getHeaders() });
  }

  getById(id: string): Observable<Career> {
    return this.http.get<Career>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  create(career: Career): Observable<Career> {
    return this.http.post<Career>(this.apiUrl, career, { headers: this.getHeaders() });
  }

  update(id: string, career: Career): Observable<Career> {
    return this.http.put<Career>(`${this.apiUrl}/${id}`, career, { headers: this.getHeaders() });
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }
  getEmployeesByCareer(careerId: string): Observable<any[]> {
  return this.http.get<any[]>(
    `${this.apiUrl}/${careerId}/employees`,
    { headers: this.getHeaders() }
  );
}
}