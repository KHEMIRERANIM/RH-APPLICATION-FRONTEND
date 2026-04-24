import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PredictionService {
  private apiUrl = `${environment.apiUrl}/prediction`;

  constructor(private http: HttpClient) {}

  getWeeklyPrediction(): Observable<any> {
    // Récupérer le token depuis localStorage ou sessionStorage
    const token = localStorage.getItem('token') || 
                  localStorage.getItem('accessToken') || 
                  localStorage.getItem('jwt') ||
                  sessionStorage.getItem('token') || 
                  sessionStorage.getItem('accessToken') ||
                  sessionStorage.getItem('jwt');
    
    // Logs pour déboguer v3
    console.log('--- [v3] PREDICTION SERVICE DEBUG ---');
    console.log('Cible API:', `${this.apiUrl}/week`);
    console.log('Token trouvé:', token ? '✅ OUI' : '❌ NON');
    console.log('Token value:', token);
    console.log('Tous les localStorage keys:', Object.keys(localStorage));
    console.log('Tous les sessionStorage keys:', Object.keys(sessionStorage));
    
    if (!token) {
      console.error('⚠️ Aucun token trouvé dans le stockage!');
    }
    
    // Créer les headers avec le token
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
    
    console.log('Headers envoyés:', headers);
    console.log('=========================================');
    
    return this.http.get(`${this.apiUrl}/week`, { headers });
  }
}
