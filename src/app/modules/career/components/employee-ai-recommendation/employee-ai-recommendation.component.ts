import { Component } from '@angular/core';
import {
  MobilityAiService,
  MobilityPredictionRequest,
  MobilityPredictionResponse
} from '../../services/mobility-ai.service';

@Component({
  selector: 'app-employee-ai-recommendation',
  templateUrl: './employee-ai-recommendation.component.html',
  styleUrls: ['./employee-ai-recommendation.component.scss']
})
export class EmployeeAiRecommendationComponent {
  isLoading = false;
  result: MobilityPredictionResponse | null = null;
  errorMessage = '';

  formData: MobilityPredictionRequest = {
    currentJob: 'data analyst',
    experienceYears: 2,
    pythonYears: 2,
    sqlYears: 2,
    javaYears: 0,
    angularYears: 0,
    reactYears: 0,
    cloudYears: 0,
    devopsYears: 0,
    securityYears: 0,
    mlYears: 1,
    testingYears: 0
  };

  currentJobs = [
    'backend developer',
    'cloud engineer',
    'cybersecurity analyst',
    'data analyst',
    'devops engineer',
    'frontend developer',
    'ml engineer',
    'qa engineer'
  ];

  constructor(private mobilityAiService: MobilityAiService) {}

  predictMobility(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.result = null;

    this.mobilityAiService.predict(this.formData).subscribe({
      next: (res) => {
        this.result = res;
        this.isLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = err?.error?.message || err?.error?.detail || 'Erreur lors de la prédiction IA.';
        this.isLoading = false;
      }
    });
  }

  formatSkill(skill: string): string {
    return skill
      .replace('_years', '')
      .replace('_', ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  percent(value: number): number {
    return Math.round(value * 100);
  }

  resetForm(): void {
    this.formData = {
      currentJob: 'data analyst',
      experienceYears: 2,
      pythonYears: 2,
      sqlYears: 2,
      javaYears: 0,
      angularYears: 0,
      reactYears: 0,
      cloudYears: 0,
      devopsYears: 0,
      securityYears: 0,
      mlYears: 1,
      testingYears: 0
    };
    this.result = null;
    this.errorMessage = '';
  }
}