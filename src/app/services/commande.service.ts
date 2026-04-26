import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Commande } from 'src/app/models/commande';

@Injectable({
  providedIn: 'root'
})
export class CommandeService {
  private apiUrl = '/api/commandes';

  constructor(private http: HttpClient) {}

  getAllCommandes(): Observable<Commande[]> {
    return this.http.get<Commande[]>(this.apiUrl);
  }

  getCommandeById(id: string): Observable<Commande> {
    return this.http.get<Commande>(this.apiUrl + '/' + id);
  }

  getCommandesByUser(userId: string): Observable<Commande[]> {
    return this.http.get<Commande[]>(this.apiUrl + '/user/' + userId);
  }

  createCommande(commande: Partial<Commande>): Observable<Commande> {
    return this.http.post<Commande>(this.apiUrl, commande);
  }

  updateStatut(id: string, statut: string): Observable<Commande> {
    return this.http.patch<Commande>(this.apiUrl + '/' + id + '/statut?statut=' + statut, {});
  }

  updateCommande(id: string, commande: Partial<Commande>): Observable<Commande> {
    return this.http.put<Commande>(this.apiUrl + '/' + id, commande);
  }

  payerCommande(id: string, modePaiement: string): Observable<any> {
    return this.http.post<any>(this.apiUrl + '/' + id + '/payer?modePaiement=' + modePaiement, {});
  }

  deleteCommande(id: string): Observable<void> {
    return this.http.delete<void>(this.apiUrl + '/' + id);
  }

  getStatsParJour(): Observable<any> {
    return this.http.get<any>(this.apiUrl + '/stats/jour');
  }

  getStatsPlats(): Observable<any> {
    return this.http.get<any>(this.apiUrl + '/stats/plats');
  }

  exportPdf(): void {
    this.http.get(this.apiUrl + '/export/pdf', { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'commandes_' + new Date().toISOString().split('T')[0] + '.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Erreur export PDF:', err);
      }
    });
  }
}
