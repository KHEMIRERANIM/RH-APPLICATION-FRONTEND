import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Formation, Inscription } from '../../../shared/models/formation.model';
import { environment } from '../../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class EmployeeFormationService {
    private http = inject(HttpClient);
    private apiUrl = environment.apiUrl + '/formations';

    constructor() { 
        console.log('EmployeeFormationService URL:', this.apiUrl);
    }

    getFormationsDisponibles(): Observable<Formation[]> {
        return this.http.get<Formation[]>(this.apiUrl + '/disponibles');
    }

    getFormationsByType(type: string): Observable<Formation[]> {
        return this.http.get<Formation[]>(this.apiUrl + '/type/' + type);
    }

    searchFormations(keyword: string): Observable<Formation[]> {
        return this.http.get<Formation[]>(this.apiUrl + '/search?keyword=' + encodeURIComponent(keyword));
    }

    getFormationById(id: string): Observable<Formation> {
        return this.http.get<Formation>(this.apiUrl + '/' + id);
    }

    inscrire(formationId: string, employeId: string): Observable<Inscription> {
        console.log('Inscription - formationId:', formationId, 'employeId:', employeId);
        return this.http.post<Inscription>(this.apiUrl + '/' + formationId + '/inscrire/' + employeId, {});
    }

    annulerInscription(inscriptionId: string, motif: string): Observable<void> {
        return this.http.delete<void>(this.apiUrl + '/inscriptions/' + inscriptionId + '?motif=' + encodeURIComponent(motif));
    }

    // Méthode pour confirmer la présence
    confirmerPresence(inscriptionId: string): Observable<void> {
        return this.http.patch<void>(this.apiUrl + '/inscriptions/' + inscriptionId + '/presence', {});
    }

    getFormationQRCode(formationId: string): Observable<any> {
        return this.http.get<any>(this.apiUrl + '/' + formationId + '/qrcode');
    }

getMesInscriptions(employeId: string, forceRefresh: boolean = false): Observable<Inscription[]> {
    // Always bust cache to catch admin date changes
    const url = this.apiUrl + '/inscriptions/employe/' + employeId + '?t=' + Date.now();

    return this.http.get<Inscription[]>(url, {
        headers: {
            'Cache-Control': 'no-cache, no-store',
            'Pragma': 'no-cache'
        }
    }).pipe(
        map((inscriptions: Inscription[]) => inscriptions.map(i => {
            const dateDebut = i.dateDebut ? new Date(i.dateDebut) : undefined;
            const dateFin   = i.dateFin   ? new Date(i.dateFin)   : undefined;

            // Recalculate status client-side using EXACT timestamps (no midnight normalization)
            let statut = i.statut;
            const now = new Date();

            if (statut !== 'ANNULE' && statut !== 'ABSENT') {
                if (dateFin && dateFin < now) {
                    statut = 'TERMINE';
                } else if (dateDebut && dateFin && dateDebut <= now && now <= dateFin) {
                    // Formation currently in progress → PRESENT
                    if (statut === 'CONFIRME' || statut === 'EN_ATTENTE') {
                        statut = 'PRESENT';
                    }
                }
            }

            return { ...i, dateDebut, dateFin, statut } as Inscription;
        }))
    );
}

// Dans employee-formation.service.ts
annulerInscriptionAvecMotif(inscriptionId: string, raison: string, typeMotif: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/inscriptions/${inscriptionId}/annuler`, {
        raison: raison,
        typeMotif: typeMotif
    });
}
}
