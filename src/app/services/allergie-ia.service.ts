import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AnalyseAllergene {
  allergenes: string[];
  ingredients_detectes: string[];
  tags_suggeres: string[];
  est_vegetarien: boolean;
  est_sans_gluten: boolean;
  est_sans_lactose: boolean;
  niveau_risque: 'faible' | 'moyen' | 'eleve';
}

export interface ResultatVerification {
  platId: string;
  nom: string;
  sur: boolean;
  conflits: string[];
  allergenes_presents: string[];
  tags_suggeres: string[];
  niveau_risque: string;
}

@Injectable({ providedIn: 'root' })
export class AllergieIaService {
  private iaUrl = 'http://localhost:5000/api/ia';

  constructor(private http: HttpClient) {}

  analyserIngredients(ingredients: string): Observable<AnalyseAllergene> {
    return this.http.post<AnalyseAllergene>(
      this.iaUrl + '/analyser-ingredients',
      { ingredients }
    );
  }

  verifierAllergies(allergies: string[], plats: any[]): Observable<ResultatVerification[]> {
    return this.http.post<ResultatVerification[]>(
      this.iaUrl + '/verifier-allergie',
      { allergies, plats }
    );
  }

  analyserAvis(commentaire: string, note: number): Observable<any> {
    return this.http.post<any>(
      this.iaUrl + '/analyser-avis',
      { commentaire, note }
    );
  }

  analyserNutrition(ingredients: string, nom: string): Observable<any> {
    return this.http.post<any>(
      this.iaUrl + '/analyser-nutrition',
      { ingredients, nom }
    );
  }
}


