import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PaiementService {
  private apiUrl = '/api/paiement';

  constructor(private http: HttpClient) {}

  createStripePayment(reservationId: string, montant: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/stripe/create`, { reservationId, montant });
  }

  createStripePaymentDirect(paymentData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/stripe/create`, paymentData);
  }

  refundPayment(reservationId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/stripe/refund`, { reservationId });
  }
}
