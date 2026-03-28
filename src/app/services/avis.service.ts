import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Avis } from 'src/app/models/avis';

@Injectable({
  providedIn: 'root'
})
export class AvisService {
  private apiUrl = 'http://localhost:8081/api/avis';

  constructor(private http: HttpClient) {}

  getAllAvis(): Observable<Avis[]> {
    return this.http.get<Avis[]>(this.apiUrl);
  }

  getAvisById(id: string): Observable<Avis> {
    return this.http.get<Avis>(this.apiUrl + '/' + id);
  }

  getAvisByPlat(platId: string): Observable<Avis[]> {
    return this.http.get<Avis[]>(this.apiUrl + '/plat/' + platId);
  }

  getMoyenneByPlat(platId: string): Observable<number> {
    return this.http.get<number>(this.apiUrl + '/plat/' + platId + '/moyenne');
  }

  createAvis(avis: Partial<Avis>): Observable<Avis> {
    return this.http.post<Avis>(this.apiUrl, avis);
  }

  deleteAvis(id: string): Observable<void> {
    return this.http.delete<void>(this.apiUrl + '/' + id);
  }
}
