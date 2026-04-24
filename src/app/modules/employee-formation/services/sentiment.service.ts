import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface LexicalAnalysis {
    positifCount: number;
    negatifCount: number;
    totalSentimentWords: number;
    netScore: number;
    motsPositifs: string[];
    motsNegatifs: string[];
}

export interface CategoryScore {
    category: string;
    mentions: number;
    sentimentScore: number;
}

export interface SentimentResult {
    avisId: string;
    sentimentScore: number;
    sentiment: 'TRES_POSITIF' | 'POSITIF' | 'NEUTRE' | 'NEGATIF' | 'TRES_NEGATIF';
    confiance: number;
    lexicalAnalysis: LexicalAnalysis;
    categoryScores: { [key: string]: CategoryScore };
    intensite: number;
    anomaly: boolean;
    recommendations: string[];
    keywords: string[];
    noteUtilisateur: number;
    ecartNoteScore: number;
}

export interface GlobalSentimentAnalysis {
    totalAvis: number;
    scoreMoyen: number;
    sentimentGlobal: string;
    sentimentDistribution: { [key: string]: number };
    tendances: { [key: string]: number };
    suggestions: string[];
    avisAnalysees: SentimentResult[];
}

@Injectable({
    providedIn: 'root'
})
export class SentimentService {
    private apiUrl = environment.apiUrl + '/sentiment';

    constructor(private http: HttpClient) { }

    analyserAvis(avisId: string): Observable<SentimentResult> {
        return this.http.get<SentimentResult>(`${this.apiUrl}/avis/${avisId}`);
    }

    analyserFormation(formationId: string): Observable<GlobalSentimentAnalysis> {
        return this.http.get<GlobalSentimentAnalysis>(`${this.apiUrl}/formation/${formationId}`);
    }

    getTendances(): Observable<any> {
        return this.http.get(`${this.apiUrl}/tendances`);
    }

    detecterAnomalies(): Observable<SentimentResult[]> {
        return this.http.get<SentimentResult[]>(`${this.apiUrl}/anomalies`);
    }

    getSentimentLabel(sentiment: string): string {
        const labels: { [key: string]: string } = {
            'TRES_POSITIF': 'Très positif',
            'POSITIF': 'Positif',
            'NEUTRE': 'Neutre',
            'NEGATIF': 'Négatif',
            'TRES_NEGATIF': 'Très négatif'
        };
        return labels[sentiment] || sentiment;
    }

    getSentimentColor(sentiment: string): string {
        const colors: { [key: string]: string } = {
            'TRES_POSITIF': '#10b981',
            'POSITIF': '#34d399',
            'NEUTRE': '#6b7280',
            'NEGATIF': '#f59e0b',
            'TRES_NEGATIF': '#ef4444'
        };
        return colors[sentiment] || '#6b7280';
    }

    getSentimentIcon(sentiment: string): string {
        const icons: { [key: string]: string } = {
            'TRES_POSITIF': '😍',
            'POSITIF': '😊',
            'NEUTRE': '😐',
            'NEGATIF': '😟',
            'TRES_NEGATIF': '😡'
        };
        return icons[sentiment] || '😐';
    }

    getScoreClass(score: number): string {
        if (score >= 0.6) return 'bg-green-500';
        if (score >= 0.2) return 'bg-green-300';
        if (score > -0.2) return 'bg-gray-400';
        if (score > -0.6) return 'bg-orange-400';
        return 'bg-red-500';
    }
}