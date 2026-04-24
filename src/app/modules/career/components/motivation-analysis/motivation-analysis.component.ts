import { Component, Input, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

export interface AnalysisResult {
  scoreGlobal: number;
  scores: {
    pertinence: number;
    clarte: number;
    motivation: number;
    professionnalisme: number;
    originalite: number;
  };
  pointsForts: string[];
  aAmeliorer: string[];
  suggestions: string[];
  verdict: 'EXCELLENT' | 'BON' | 'MOYEN' | 'INSUFFISANT';
  langue: string;
}

@Component({
  selector: 'app-motivation-analysis',
  templateUrl: './motivation-analysis.component.html',
  styleUrls: ['./motivation-analysis.component.scss']
})
export class MotivationAnalysisComponent implements OnInit {

  @Input() requestId!: string;
  @Input() employeeName: string = '';
  @Input() targetPost: string = '';

  result: AnalysisResult | null = null;
  isLoading = false;
  hasError = false;
  analyzed = false;

  // === PORT CORRIGÉ : ton backend tourne sur 8081 ===
  private apiUrl = 'http://localhost:8081/api/mobility';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.analyze();
  }

  analyze(): void {
    if (!this.requestId) {
      this.hasError = true;
      return;
    }

    this.isLoading = true;
    this.hasError = false;
    this.analyzed = false;

    // Pas de token pour l'analyse (endpoint public)
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    this.http.get<AnalysisResult>(`${this.apiUrl}/${this.requestId}/analyze`, { headers })
      .pipe(
        catchError((error) => {
          console.error('Erreur analyse IA:', error);
          this.hasError = true;
          return of(null);
        })
      )
      .subscribe({
        next: (data) => {
          this.result = data;
          this.isLoading = false;
          this.analyzed = true;
        },
        error: () => {
          this.hasError = true;
          this.isLoading = false;
          this.analyzed = true;
        }
      });
  }

  // ==================== Getters (inchangés) ====================
  get scoreColor(): string {
    if (!this.result) return '#6b7280';
    const s = this.result.scoreGlobal;
    if (s >= 75) return '#16a34a';
    if (s >= 50) return '#d97706';
    return '#dc2626';
  }

  get verdictEmoji(): string {
    switch (this.result?.verdict) {
      case 'EXCELLENT': return '🌟';
      case 'BON':       return '😊';
      case 'MOYEN':     return '😐';
      case 'INSUFFISANT': return '😟';
      default:          return '🤔';
    }
  }

  get verdictLabel(): string {
    switch (this.result?.verdict) {
      case 'EXCELLENT':  return 'EXCELLENT';
      case 'BON':        return 'BON';
      case 'MOYEN':      return 'MITIGÉ';
      case 'INSUFFISANT': return 'INSUFFISANT';
      default:           return '—';
    }
  }

  get verdictStyle(): string {
    switch (this.result?.verdict) {
      case 'EXCELLENT':  return 'background:#dcfce7;color:#166534;font-weight:700;';
      case 'BON':        return 'background:#dbeafe;color:#1d4ed8;font-weight:700;';
      case 'MOYEN':      return 'background:#fef9c3;color:#854d0e;font-weight:700;';
      case 'INSUFFISANT': return 'background:#fee2e2;color:#991b1b;font-weight:700;';
      default:           return 'background:#f3f4f6;color:#6b7280;';
    }
  }

  getScoreEntries(): { label: string; value: number }[] {
    if (!this.result?.scores) return [];
    return [
      { label: 'Pertinence avec le poste', value: this.result.scores.pertinence ?? 0 },
      { label: 'Clarté et structure',      value: this.result.scores.clarte ?? 0 },
      { label: 'Niveau de motivation',     value: this.result.scores.motivation ?? 0 },
      { label: 'Professionnalisme',        value: this.result.scores.professionnalisme ?? 0 },
      { label: 'Originalité',              value: this.result.scores.originalite ?? 0 }
    ];
  }

  getScoreColor(score: number): string {
    if (score >= 7) return '#16a34a';
    if (score >= 5) return '#d97706';
    return '#dc2626';
  }

  getBarWidth(score: number): string {
    return Math.round((score / 10) * 100) + '%';
  }
}