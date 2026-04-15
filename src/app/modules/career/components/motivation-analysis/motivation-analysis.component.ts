import { Component, Input, OnInit } from '@angular/core';
import { MobilityService, MotivationAnalysis } from '../../services/mobility.service';

@Component({
  selector: 'app-motivation-analysis',
  templateUrl: './motivation-analysis.component.html'
  // standalone: false   ← on ne met rien (comportement par défaut avec modules)
})
export class MotivationAnalysisComponent implements OnInit {

  @Input() requestId!: string;
  @Input() employeeName: string = '';
  @Input() targetPost: string = '';

  analysis: MotivationAnalysis | null = null;
  isLoading = false;
  hasAnalyzed = false;
  error = '';

  constructor(private mobilityService: MobilityService) {}

  ngOnInit(): void {}

  analyze(): void {
    this.isLoading = true;
    this.error = '';
    this.mobilityService.analyzeMotivation(this.requestId).subscribe({
      next: (result) => {
        this.analysis = result;
        this.isLoading = false;
        this.hasAnalyzed = true;
      },
      error: (err) => {
        this.error = 'Erreur lors de l\'analyse';
        this.isLoading = false;
        console.error(err);
      }
    });
  }

  getScoreColor(score: number, max = 10): string {
    const pct = (score / max) * 100;
    if (pct >= 70) return '#16a34a';
    if (pct >= 40) return '#d97706';
    return '#dc2626';
  }

  getSentimentIcon(sentiment: string): string {
    return { POSITIF: '😊', NEUTRE: '😐', NEGATIF: '😟' }[sentiment] ?? '🔍';
  }

  getLangueLabel(langue: string): string {
    return { fr: '🇫🇷 Français', en: '🇬🇧 Anglais', ar: '🇸🇦 Arabe' }[langue] ?? langue;
  }
}