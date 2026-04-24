import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EmailService {
  private apiUrl = '/api/notifications/email';

  constructor(private http: HttpClient) { }

  /**
   * Envoie une notification par email à l'administrateur
   */
  sendThresholdNotification(busName: string, date: string, occupancy: number, capacity: number): Observable<any> {
    const emailBody = {
      to: 'ranimkhemire@gmail.com',
      subject: `📢 Alerte Seuil Navette : ${busName}`,
      message: `Bonjour,\n\nLe bus de réserve "${busName}" pour la date du ${date} vient d'atteindre son seuil de remplissage de 50% (${occupancy}/${capacity} places).\n\nVous pouvez maintenant procéder à son activation dans le tableau de bord administrateur.\n\nL'équipe RH.`
    };

    console.log('📧 Envoi de notification email...', emailBody);
    return this.http.post(this.apiUrl, emailBody);
  }
  /**
   * Envoie une notification par email à l'employé pour confirmer son trajet
   */
  sendShuttleActivationEmail(to: string, userName: string, busName: string, date: string): Observable<any> {
    const emailBody = {
      to: to,
      subject: `✅ Confirmation Navette : ${busName} (${date})`,
      message: `Bonjour ${userName},\n\nBonne nouvelle ! La navette "${busName}" que vous aviez réservée pour le ${date} est maintenant activée.\n\nVotre place est confirmée. Vous pouvez consulter les détails de votre trajet dans votre application.\n\nL'équipe RH.`
    };

    console.log(`📧 Envoi de confirmation à ${to}...`, emailBody);
    return this.http.post(this.apiUrl, emailBody);
  }
}
