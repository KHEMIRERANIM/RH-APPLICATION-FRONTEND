// ab-testing.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { VoiceAIService, VoiceAnalysisResult, SENTIMENT_LEXICON } from './voice-ai.service';
import { firstValueFrom } from 'rxjs';

export interface ABTestResult {
  transcript: string;
  currentModel: {
    result: VoiceAnalysisResult;
    processingTime: number;
  };
  mlModel: {
    result: VoiceAnalysisResult;
    processingTime: number;
  } | null; // ✅ Permettre null
  winner: 'current' | 'ml';
  timestamp: Date;
}

@Injectable({ providedIn: 'root' })
export class ABTestingService {
  private apiUrl = 'http://localhost:8081/api/ml';
  private testHistory: ABTestResult[] = [];
  private useMLModel = false; // Dynamique selon performance
  
  constructor(
    private http: HttpClient,
    private voiceAI: VoiceAIService
  ) {
    this.loadTestHistory();
  }
  
  async compareModels(transcript: string): Promise<VoiceAnalysisResult> {
    // Version actuelle (lexique)
    const startCurrent = performance.now();
    const currentResult = this.voiceAI.analyzeTranscript(transcript);
    const currentTime = performance.now() - startCurrent;
    
    // Version ML (appel API)
    let mlResult: VoiceAnalysisResult | null = null;
    let mlTime = 0;
    
    try {
      const startML = performance.now();
      mlResult = await firstValueFrom(
        this.http.post<VoiceAnalysisResult>(`${this.apiUrl}/analyze`, { text: transcript })
      );
      mlTime = performance.now() - startML;
    } catch (error) {
      console.error('ML model failed:', error);
      mlResult = null;
    }
    
    // Journaliser pour analyse
    const testResult: ABTestResult = {
      transcript,
      currentModel: {
        result: currentResult,
        processingTime: currentTime
      },
      mlModel: mlResult ? {   // ✅ Vérification explicite
        result: mlResult,
        processingTime: mlTime
      } : null,
      winner: this.determineWinner(currentResult, mlResult),
      timestamp: new Date()
    };
    
    this.testHistory.push(testResult);
    this.saveTestHistory();
    this.updateModelSelectionStrategy();
    
    // Retourner le meilleur selon confiance
    if (mlResult && mlResult.confidence > currentResult.confidence + 0.1) {
      return mlResult;
    }
    
    return currentResult;
  }
  
  private determineWinner(
    current: VoiceAnalysisResult, 
    ml: VoiceAnalysisResult | null
  ): 'current' | 'ml' {
    if (!ml) return 'current';
    
    // Critères de décision
    const confidenceAdvantage = ml.confidence - current.confidence;
    const accuracyAdvantage = Math.abs(ml.sentimentScore - current.sentimentScore);
    
    // Le modèle ML gagne si meilleure confiance ET score plausible
    if (confidenceAdvantage > 0.1 && accuracyAdvantage < 0.5) {
      return 'ml';
    }
    
    return 'current';
  }
  
  private updateModelSelectionStrategy(): void {
    // Analyser les 100 derniers tests
    const recentTests = this.testHistory.slice(-100);
    if (recentTests.length < 50) return;
    
    const mlWins = recentTests.filter(t => t.winner === 'ml').length;
    const mlWinRate = mlWins / recentTests.length;
    
    // Activer ML seulement si win rate > 60%
    this.useMLModel = mlWinRate > 0.6;
    
    console.log(`ML Win Rate: ${(mlWinRate * 100).toFixed(1)}% - ${this.useMLModel ? 'Using ML' : 'Using Lexicon'}`);
  }
  
  async getModelForTranscript(transcript: string): Promise<'current' | 'ml'> {
    if (!this.useMLModel) return 'current';
    
    // Vérifier si le transcript contient des mots hors lexique
    const words = transcript.toLowerCase().split(' ');
    const unknownWords = words.filter(w => !SENTIMENT_LEXICON[w] && w.length > 3);
    
    // Utiliser ML pour les textes avec beaucoup de mots inconnus
    if (unknownWords.length > words.length * 0.3) {
      return 'ml';
    }
    
    return this.useMLModel ? 'ml' : 'current';
  }
  
  getStatistics(): any {
    const total = this.testHistory.length;
    const mlWins = this.testHistory.filter(t => t.winner === 'ml').length;
    const currentWins = total - mlWins;
    
    const avgCurrentTime = this.testHistory.reduce((sum, t) => sum + t.currentModel.processingTime, 0) / total;
    const mlTests = this.testHistory.filter(t => t.mlModel !== null);
    const avgMLTime = mlTests.length > 0 
      ? mlTests.reduce((sum, t) => sum + (t.mlModel?.processingTime || 0), 0) / mlTests.length
      : 0;
    
    return {
      totalTests: total,
      mlWinRate: total > 0 ? (mlWins / total * 100).toFixed(1) : 0,
      currentWinRate: total > 0 ? (currentWins / total * 100).toFixed(1) : 0,
      avgProcessingTime: {
        current: avgCurrentTime.toFixed(2),
        ml: avgMLTime ? avgMLTime.toFixed(2) : 'N/A'
      },
      usingMLModel: this.useMLModel,
      recommendation: this.useMLModel ? 'ML model is performing better' : 'Lexicon model is sufficient'
    };
  }
  
  exportTestResults(): string {
    return JSON.stringify(this.testHistory, null, 2);
  }
  
  private saveTestHistory(): void {
    // Garder seulement les 1000 derniers tests
    if (this.testHistory.length > 1000) {
      this.testHistory = this.testHistory.slice(-1000);
    }
    localStorage.setItem('ab_test_history', JSON.stringify(this.testHistory));
  }
  
  private loadTestHistory(): void {
    const stored = localStorage.getItem('ab_test_history');
    if (stored) {
      this.testHistory = JSON.parse(stored);
    }
  }
  
  async resetABTesting(): Promise<void> {
    this.testHistory = [];
    this.useMLModel = false;
    localStorage.removeItem('ab_test_history');
    localStorage.removeItem('model_selection_strategy');
    console.log('AB Testing reset');
  }
}