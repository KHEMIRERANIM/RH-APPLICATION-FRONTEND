import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Reclamation {
    id?: string;
    employeId: string;
    busId: string;
    stopName: string;
    neighborhood: string;
    latitude?: number;
    longitude?: number;
    walkingDistance?: number; // en km
    walkingTime?: number;     // en minutes
    date?: string;
    status?: string;
}

@Injectable({
    providedIn: 'root'
})
export class ReclamationService {
    private apiUrl = 'http://10.188.81.174:8081/api/reclamations';

    constructor(private http: HttpClient) { }

    submit(reclamation: Reclamation): Observable<Reclamation> {
        return this.http.post<Reclamation>(this.apiUrl, reclamation);
    }

    getAll(): Observable<Reclamation[]> {
        return this.http.get<Reclamation[]>(this.apiUrl);
    }

    delete(id: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }
}
