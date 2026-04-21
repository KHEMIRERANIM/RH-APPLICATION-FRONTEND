import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface MobilityPredictionRequest {
  currentJob: string;
  experienceYears: number;
  pythonYears: number;
  sqlYears: number;
  javaYears: number;
  angularYears: number;
  reactYears: number;
  cloudYears: number;
  devopsYears: number;
  securityYears: number;
  mlYears: number;
  testingYears: number;
}

export interface TopJob {
  job: string;
  score: number;
}

export interface SkillGapItem {
  skill: string;
  current: number;
  required: number;
  gap: number;
}

export interface MobilityPredictionResponse {
  recommended_job: string;
  confidence_score: number;
  top_3_jobs: TopJob[];
  skills_gap: SkillGapItem[];
  evolution_plan: string[];
}

@Injectable({
  providedIn: 'root'
})
export class MobilityAiService {
  private apiUrl = 'http://127.0.0.1:8001/predict-mobility';

  constructor(private http: HttpClient) {}

  predict(data: MobilityPredictionRequest): Observable<MobilityPredictionResponse> {
    const payload = {
      current_job: data.currentJob,
      experience_years: data.experienceYears,
      python_years: data.pythonYears,
      sql_years: data.sqlYears,
      java_years: data.javaYears,
      angular_years: data.angularYears,
      react_years: data.reactYears,
      cloud_years: data.cloudYears,
      devops_years: data.devopsYears,
      security_years: data.securityYears,
      ml_years: data.mlYears,
      testing_years: data.testingYears
    };

    return this.http.post<MobilityPredictionResponse>(this.apiUrl, payload);
  }
}