import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Offre, CreateOffreRequest } from '../models/recrutement.models';

@Injectable({ providedIn: 'root' })
export class OffreService {

  private api = `${window.location.protocol}//${window.location.hostname}:8081/api/recrutement/offres`;

  constructor(private http: HttpClient) {}

  getOffresPubliees(filters?: {
    departement?: string;
    typeContrat?: string;
    localisation?: string;
    search?: string;
  }): Observable<Offre[]> {
    let params = new HttpParams();
    if (filters?.departement)  params = params.set('departement', filters.departement);
    if (filters?.typeContrat)  params = params.set('typeContrat', filters.typeContrat);
    if (filters?.localisation) params = params.set('localisation', filters.localisation);
    if (filters?.search)       params = params.set('search', filters.search);
    return this.http.get<Offre[]>(this.api, { params });
  }

  getOffreById(id: string): Observable<Offre> {
    return this.http.get<Offre>(`${this.api}/${id}`);
  }

  getOffresByAdmin(createurId: string): Observable<Offre[]> {
    return this.http.get<Offre[]>(`${this.api}/admin/${createurId}`);
  }

  createOffre(request: CreateOffreRequest, createurId: string): Observable<Offre> {
    return this.http.post<Offre>(`${this.api}?createurId=${createurId}`, request);
  }

  updateOffre(id: string, request: Partial<CreateOffreRequest>): Observable<Offre> {
    return this.http.put<Offre>(`${this.api}/${id}`, request);
  }

  publierOffre(id: string): Observable<void> {
    return this.http.patch<void>(`${this.api}/${id}/publier`, {});
  }

  cloturerOffre(id: string): Observable<void> {
    return this.http.patch<void>(`${this.api}/${id}/cloturer`, {});
  }

  archiverOffre(id: string): Observable<void> {
    return this.http.patch<void>(`${this.api}/${id}/archiver`, {});
  }

  deleteOffre(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }
}