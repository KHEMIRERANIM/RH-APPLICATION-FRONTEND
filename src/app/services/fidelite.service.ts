import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Fidelite } from 'src/app/models/fidelite';

@Injectable({ providedIn: 'root' })
export class FideliteService {
  private apiUrl = '/api/fidelite';

  constructor(private http: HttpClient) {}

  getFidelite(userId: string): Observable<Fidelite> {
    return this.http.get<Fidelite>(`${this.apiUrl}/${userId}`);
  }

  utiliserReduction(userId: string): Observable<Fidelite> {
    return this.http.post<Fidelite>(`${this.apiUrl}/${userId}/utiliser-reduction`, {});
  }
}
