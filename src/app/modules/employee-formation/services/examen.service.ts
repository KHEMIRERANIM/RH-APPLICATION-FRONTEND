import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Examen, Reponse, ResultatExamen } from '../../../shared/models/formation.model';

@Injectable({ providedIn: 'root' })
export class ExamenService {
    private http = inject(HttpClient);
    private apiUrl = environment.apiUrl + '/examens';

    getExamensByFormation(formationId: string): Observable<Examen[]> {
        return this.http.get<Examen[]>(`${this.apiUrl}/formation/${formationId}`);
    }

    getExamenById(examenId: string): Observable<Examen> {
        return this.http.get<Examen>(`${this.apiUrl}/${examenId}`);
    }

    createExamen(examen: Partial<Examen>): Observable<Examen> {
        return this.http.post<Examen>(this.apiUrl, examen);
    }

    updateExamen(examenId: string, examen: Partial<Examen>): Observable<Examen> {
        return this.http.put<Examen>(`${this.apiUrl}/${examenId}`, examen);
    }

    deleteExamen(examenId: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${examenId}`);
    }

    verifierAccesExamen(formationId: string, employeId: string): Observable<any> {
        return this.http.get(`${this.apiUrl}/formation/${formationId}/acces/${employeId}`);
    }

    soumettreExamen(examenId: string, employeId: string, reponses: Reponse[]): Observable<ResultatExamen> {
        return this.http.post<ResultatExamen>(
            `${this.apiUrl}/${examenId}/soumettre?employeId=${employeId}`,
            reponses
        );
    }

    getResultatsByExamen(examenId: string): Observable<ResultatExamen[]> {
        return this.http.get<ResultatExamen[]>(`${this.apiUrl}/${examenId}/resultats`);
    }

    getResultatByEmploye(examenId: string, employeId: string): Observable<ResultatExamen> {
        return this.http.get<ResultatExamen>(`${this.apiUrl}/${examenId}/resultats/employe/${employeId}`);
    }

    getStatistiquesExamen(examenId: string): Observable<any> {
        return this.http.get(`${this.apiUrl}/${examenId}/statistiques`);
    }
      getResultatsByEmploye(employeId: string): Observable<ResultatExamen[]> {
        return this.http.get<ResultatExamen[]>(`${this.apiUrl}/employe/${employeId}/resultats`);
    }


// examen.service.ts
telechargerCertification(formationId: string, employeId: string): Observable<Blob> {
    // ✅ Vérifier que l'URL est correcte
    const url = `${this.apiUrl}/certification/${formationId}/download?employeId=${employeId}`;
    console.log('📥 Téléchargement certification URL:', url);
    return this.http.get(url, {
        responseType: 'blob'
    });
}
   
}