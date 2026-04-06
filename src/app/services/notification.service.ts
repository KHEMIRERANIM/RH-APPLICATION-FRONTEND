import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { AcademyService } from '../modules/admin/apps/academy/academy.service';

@Injectable({
    providedIn: 'root'
})
export class NotificationService {
    private notificationsSubject = new Subject<any>();
    private lastDemandeCount: number = 0;
    private interval: any;

    constructor(private academyService: AcademyService) {
        this.startPolling();
        console.log('🔔 NotificationService démarré (mode polling)');
    }

    startPolling(): void {
        this.interval = setInterval(() => {
            console.log('🔍 Vérification des nouvelles demandes...');
            this.academyService.getAllDemandes().subscribe({
                next: (demandes) => {
                    const enAttente = demandes.filter(d => d.statut === 'EN_ATTENTE');
                    if (enAttente.length > this.lastDemandeCount && this.lastDemandeCount !== 0) {
                        const nouvelles = enAttente.length - this.lastDemandeCount;
                        console.log(`📋 ${nouvelles} nouvelle(s) demande(s) détectée(s)`);
                        this.notificationsSubject.next({
                            type: 'NOUVELLE_DEMANDE',
                            message: `📋 ${nouvelles} nouvelle(s) demande(s) de congé`
                        });
                    }
                    this.lastDemandeCount = enAttente.length;
                },
                error: (err) => console.error('Erreur polling:', err)
            });
        }, 10000);
    }

    disconnect(): void {
        if (this.interval) {
            clearInterval(this.interval);
        }
    }

    getNotifications(): Subject<any> {
        return this.notificationsSubject;
    }
}