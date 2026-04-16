import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PaiementService {
  private apiUrl = 'http://localhost:8081/api/paiement';

  constructor(private http: HttpClient) {}

 createStripePayment(reservationId: string, montant: number): Observable<any> {
  return this.http.post(`${this.apiUrl}/stripe/create`, { reservationId, montant });
}

  refundPayment(reservationId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/stripe/refund`, { reservationId });
  }
}