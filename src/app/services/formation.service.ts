import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Formation, FormationStats, FormationSearchParams, Inscription } from '../shared/models/formation.model';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class FormationService {
    private apiUrl = environment.apiUrl + '/formations';

    constructor(private http: HttpClient) { 
        console.log('FormationService API URL:', this.apiUrl);
    }
  // formation.service.ts
getKPIs(): Observable<any> {
    
    return this.http.get(`http://localhost:8081/api/kpis/dashboard`);
}

    getAllFormations(): Observable<Formation[]> {
        return this.http.get<Formation[]>(this.apiUrl);
    }

    getFormationsDisponibles(): Observable<Formation[]> {
        return this.http.get<Formation[]>(this.apiUrl + '/disponibles');
    }

    getFormationById(id: string): Observable<Formation> {
        return this.http.get<Formation>(this.apiUrl + '/' + id);
    }

    createFormation(formation: Formation): Observable<Formation> {
        return this.http.post<Formation>(this.apiUrl, formation);
    }

    updateFormation(id: string, formation: Formation): Observable<Formation> {
        return this.http.put<Formation>(this.apiUrl + '/' + id, formation);
    }

    deleteFormation(id: string): Observable<void> {
        return this.http.delete<void>(this.apiUrl + '/' + id);
    }

    toggleActive(id: string): Observable<Formation> {
        return this.http.patch<Formation>(this.apiUrl + '/' + id + '/toggle-active', {});
    }

    getFormationsByType(type: string): Observable<Formation[]> {
        return this.http.get<Formation[]>(this.apiUrl + '/type/' + type);
    }

    searchFormations(keyword: string): Observable<Formation[]> {
        return this.http.get<Formation[]>(this.apiUrl + '/search?keyword=' + keyword);
    }

    getFormationStats(): Observable<FormationStats> {
        return this.getAllFormations().pipe(
            map(formations => {
                const parType: { [key: string]: number } = {};
                let placesTotales = 0;
                let placesDisponibles = 0;
                
                formations.forEach(f => {
                    parType[f.type] = (parType[f.type] || 0) + 1;
                    placesTotales += f.nombrePlaces;
                    placesDisponibles += f.placesDisponibles;
                });

                const placesOccupees = placesTotales - placesDisponibles;
                const tauxRemplissage = placesTotales > 0 ? (placesOccupees / placesTotales) * 100 : 0;

                return {
                    total: formations.length,
                    actives: formations.filter(f => f.active).length,
                    inactives: formations.filter(f => !f.active).length,
                    parType,
                    placesTotales,
                    placesDisponibles,
                    placesOccupees,
                    tauxRemplissage: Math.round(tauxRemplissage * 100) / 100
                };
            })
        );
    }

    inscrireEmploye(formationId: string, employeId: string): Observable<any> {
        return this.http.post(this.apiUrl + '/' + formationId + '/inscrire/' + employeId, {});
    }

    getInscriptionsByEmploye(employeId: string): Observable<Inscription[]> {
        return this.http.get<Inscription[]>(this.apiUrl + '/employe/' + employeId + '/inscriptions');
    }

    annulerInscription(inscriptionId: string, motif: string): Observable<void> {
        return this.http.delete<void>(this.apiUrl + '/inscriptions/' + inscriptionId + '?motif=' + motif);
    }
    getFormationQRCode(formationId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${formationId}/qrcode`);
}
// Dans formation.service.ts
getFormationsTerminees(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/terminees`);
}
// formation.service.ts
private rapportUrl = 'http://localhost:8081/api/rapport-ia';

genererRapportGerant(): Observable<any> {
    console.log('Appel API:', `${this.rapportUrl}/generer`);
    return this.http.get(`${this.rapportUrl}/generer`);
}
}