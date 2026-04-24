// services/recommendation.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';

export interface TechnologyRecommendation {
  technologie: string;
  score: number;
  source: string;
  priorite: 'HAUTE' | 'MOYENNE' | 'BASSE';
  suggestionsFormations: string[];
}

export interface PersonalizedRecommendation {
  employeId: string;
  technologiesConnues: string[];
  technologiesRecommandees: string[];
  prochainNiveau: string;
  suggestionsFormations: {
    formationId: string | null;
    titre: string;
    description: string;
    score: number;
    raison: string;
  }[];
}

@Injectable({ providedIn: 'root' })
export class RecommendationService {
  private apiUrl = `${environment.apiUrl}/formations`;

  constructor(private http: HttpClient) {}

  getTechnologyRecommendations(): Observable<TechnologyRecommendation[]> {
    return this.http.get<TechnologyRecommendation[]>(`${this.apiUrl}/recommendations/technologies`);
  }

  getPersonalizedRecommendations(employeId: string): Observable<PersonalizedRecommendation> {
    return this.http.get<PersonalizedRecommendation>(`${this.apiUrl}/recommendations/employe/${employeId}`);
  }

  getTrendingTechnologies(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/trending`);
  }

  indexFormations(): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/recommendations/index`, {});
  }
}