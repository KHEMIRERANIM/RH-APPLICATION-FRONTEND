// services/employe.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface Employe {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    telephone?: string;
    department?: string;
    position?: string;
    photo?: string;
    role?: string;
    status?: string;
}

@Injectable({
    providedIn: 'root'
})
export class EmployeService {
    private http = inject(HttpClient);
    private apiUrl = environment.apiUrl + '/users';

    constructor() {
        console.log('EmployeService URL:', this.apiUrl);
    }

    getEmployes(): Observable<Employe[]> {
        return this.http.get<Employe[]>(this.apiUrl);
    }

    getEmployesByRole(role: string): Observable<Employe[]> {
        return this.http.get<Employe[]>(`${this.apiUrl}/role/${role}`);
    }

    getEmployeById(id: string): Observable<Employe> {
        return this.http.get<Employe>(`${this.apiUrl}/${id}`);
    }

    getEmployesNotFormateurs(): Observable<Employe[]> {
        return this.http.get<Employe[]>(`${this.apiUrl}?excludeRole=FORMATEUR`);
    }
}