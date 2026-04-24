import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { GlobalSentimentAnalysis, SentimentResult, SentimentService } from '../../services/sentiment.service';

@Component({
    selector: 'app-sentiment-analysis',
    templateUrl: './sentiment-analysis.component.html',
    styleUrls: ['./sentiment-analysis.component.scss']
})
export class SentimentAnalysisComponent implements OnInit, OnDestroy {
    @Input() formationId!: string;
    @Input() formationTitre: string = '';

    analysis: GlobalSentimentAnalysis | null = null;
    isLoading = false;
    selectedAvis: SentimentResult | null = null;
    activeTab: 'overview' | 'details' | 'anomalies' = 'overview';
    anomalies: SentimentResult[] = [];
    private destroy$ = new Subject<void>();

    constructor(public sentimentService: SentimentService) { }

    ngOnInit(): void {
        this.loadAnalysis();
        this.loadAnomalies();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    loadAnalysis(): void {
        this.isLoading = true;
        this.sentimentService.analyserFormation(this.formationId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (analysis) => {
                    this.analysis = analysis;
                    this.isLoading = false;
                },
                error: (err) => {
                    console.error('Erreur analyse sentiment', err);
                    this.isLoading = false;
                }
            });
    }

    loadAnomalies(): void {
        this.sentimentService.detecterAnomalies()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (anomalies) => {
                    this.anomalies = anomalies;
                },
                error: (err) => {
                    console.error('Erreur chargement anomalies', err);
                }
            });
    }

    getSentimentBarWidth(sentiment: string): string {
        if (!this.analysis) return '0%';
        const count = this.analysis.sentimentDistribution[sentiment] || 0;
        const percentage = (count / this.analysis.totalAvis) * 100;
        return `${percentage}%`;
    }

    selectAvis(avis: SentimentResult): void {
        this.selectedAvis = avis;
    }

    closeModal(): void {
        this.selectedAvis = null;
    }

    refresh(): void {
        this.loadAnalysis();
        this.loadAnomalies();
    }

    setActiveTab(tab: 'overview' | 'details' | 'anomalies'): void {
        this.activeTab = tab;
    }

    getSentimentGradient(score: number): string {
        if (score >= 0) {
            return `linear-gradient(90deg, #10b981 ${score * 100}%, #e5e7eb ${score * 100}%)`;
        } else {
            return `linear-gradient(90deg, #e5e7eb ${(1 + score) * 100}%, #ef4444 ${(1 + score) * 100}%)`;
        }
    }
}