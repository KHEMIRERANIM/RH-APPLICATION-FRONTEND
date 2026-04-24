import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class StripeService {
  private apiUrl = 'http://localhost:8081/api/stripe';

  constructor(private http: HttpClient) {}

  createPayment(userId: string, points: number, amount: number): Observable<any> {
    console.log('📤 Envoi requête:', { userId, points, amount });
    return this.http.post(`${this.apiUrl}/create-payment`, {
      userId: userId,
      points: points,
      amount: amount
    });
  }
}