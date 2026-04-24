import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class PointsService {
    private pointsSubject = new BehaviorSubject<number>(0);
    public points$ = this.pointsSubject.asObservable();  // ← ICI, c'est déjà un Observable
    
    private apiUrl = environment.apiUrl;

    constructor(private http: HttpClient) {}

    loadPoints(employeId: string): void {
        this.http.get<any>(`${this.apiUrl}/formations/points/${employeId}`).subscribe({
            next: (response) => {
                this.pointsSubject.next(response.solde || 0);
            },
            error: (err) => {
                console.error('Erreur chargement points:', err);
                this.pointsSubject.next(1000);
            }
        });
    }

    
    // ✅ Méthode pour récupérer les points d'un utilisateur
    getUserPoints(userId: string): Observable<number> {
        return this.http.get<number>(`${this.apiUrl}/user/${userId}`);
    }
    
    // ✅ Méthode pour récupérer le solde (alias)
    getSoldePoints(userId: string): Observable<number> {
        return this.getUserPoints(userId);
    }
    
    // ✅ Méthode pour rafraîchir les points (met à jour localStorage)
    refreshPoints(userId: string): void {
        this.getUserPoints(userId).subscribe({
            next: (points) => {
                localStorage.setItem('userPoints', points.toString());
                
                // Mettre à jour currentUser si présent
                const currentUserStr = localStorage.getItem('currentUser');
                if (currentUserStr) {
                    try {
                        const currentUser = JSON.parse(currentUserStr);
                        currentUser.points = points;
                        localStorage.setItem('currentUser', JSON.stringify(currentUser));
                    } catch (e) {}
                }
            },
            error: (err) => console.error('Erreur refresh points:', err)
        });
    }
    
}