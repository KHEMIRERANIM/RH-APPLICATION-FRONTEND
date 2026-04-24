// training-data.service.ts (corrigé)
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { VoiceAnalysisResult } from './voice-ai.service';
import { firstValueFrom } from 'rxjs';

export interface TrainingSample {
  id: string;
  text: string;
  sentimentScore: number;
  emotion: string;
  predictedRating: number;
  correctRating: number;
  timestamp: Date;
  userFeedback: number;
  confidence: number;
  isCorrected: boolean;
  correctedByUser: string;
}

@Injectable({ providedIn: 'root' })
export class TrainingDataService {
  private trainingData: TrainingSample[] = [];
  private apiUrl = 'http://localhost:8081/api/training';
  
  constructor(private http: HttpClient) {
    this.loadFromLocalStorage();
  }
  
  saveForTraining(
    result: VoiceAnalysisResult, 
    transcript: string, 
    userCorrectedRating: number
  ): TrainingSample {
    const isCorrected = userCorrectedRating !== result.suggestedRating;
    
    const sample: TrainingSample = {
      id: this.generateId(),
      text: transcript,
      sentimentScore: result.sentimentScore,
      emotion: result.emotion,
      predictedRating: result.suggestedRating,
      correctRating: userCorrectedRating,
      timestamp: new Date(),
      userFeedback: userCorrectedRating,
      confidence: result.confidence,
      isCorrected: isCorrected,
      correctedByUser: 'employee'
    };
    
    this.trainingData.push(sample);
    this.saveToLocalStorage();
    
    if (isCorrected) {
      console.log(`⚠️ Correction: Prédit ${result.suggestedRating}⭐, Utilisateur: ${userCorrectedRating}⭐`);
      console.log(`   Texte: "${transcript}"`);
    }
    
    const corrections = this.trainingData.filter(s => s.isCorrected).length;
    if (corrections > 0 && corrections % 5 === 0) {
      this.sendToTrainingPipeline();
    }
    
    return sample;
  }
  
  // ✅ CORRECTION: Changer le type de retour de Promise<void> à Promise<any>
  async sendToTrainingPipeline(): Promise<any> {
    const corrections = this.trainingData.filter(s => s.isCorrected);
    if (corrections.length === 0) return null;
    
    console.log(`🚀 Envoi de ${corrections.length} corrections pour entraînement...`);
    
    try {
      const result = await firstValueFrom(
        this.http.post(`${this.apiUrl}/samples`, {
          samples: corrections,
          timestamp: new Date(),
          totalSamples: this.trainingData.length
        })
      );
      
      console.log('✅ Données envoyées avec succès');
      return result;
    } catch (error) {
      console.error('❌ Erreur envoi données:', error);
      return null;
    }
  }
  
  getAllTrainingData(): TrainingSample[] {
    return [...this.trainingData];
  }
  
  getCorrectionsOnly(): TrainingSample[] {
    return this.trainingData.filter(s => s.isCorrected);
  }
  
  getStatistics(): any {
    const total = this.trainingData.length;
    const corrections = this.getCorrectionsOnly();
    const accuracy = total > 0 ? ((total - corrections.length) / total * 100).toFixed(1) : 100;
    
    const errorDistribution: Record<string, number> = {};
    corrections.forEach(c => {
      const error = `${c.predictedRating}→${c.correctRating}`;
      errorDistribution[error] = (errorDistribution[error] || 0) + 1;
    });
    
    return {
      totalSamples: total,
      correctionsCount: corrections.length,
      accuracy: `${accuracy}%`,
      needsTraining: corrections.length >= 10,
      errorDistribution,
      averageConfidence: total > 0 ? (this.trainingData.reduce((sum, s) => sum + s.confidence, 0) / total).toFixed(2) : 0,
      recommendation: corrections.length >= 10 ? 'Lancer un entraînement' : 'Collecter plus de données'
    };
  }
  
  exportAsJSON(): string {
    return JSON.stringify(this.trainingData, null, 2);
  }
  
  exportAsCSV(): string {
    const headers = ['text', 'sentimentScore', 'predictedRating', 'correctRating', 'timestamp', 'confidence', 'isCorrected'];
    const rows = this.trainingData.map(sample => [
      `"${sample.text.replace(/"/g, '""')}"`,
      sample.sentimentScore,
      sample.predictedRating,
      sample.correctRating,
      sample.timestamp.toISOString(),
      sample.confidence,
      sample.isCorrected
    ]);
    
    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }
  
  clearData(): void {
    this.trainingData = [];
    localStorage.removeItem('training_data');
    console.log('🗑️ Données d\'entraînement effacées');
  }
  
  private saveToLocalStorage(): void {
    localStorage.setItem('training_data', JSON.stringify(this.trainingData));
  }
  
  private loadFromLocalStorage(): void {
    const stored = localStorage.getItem('training_data');
    if (stored) {
      const parsed = JSON.parse(stored);
      this.trainingData = parsed.map((item: any) => ({
        ...item,
        timestamp: new Date(item.timestamp)
      }));
      console.log(`📊 Chargé ${this.trainingData.length} échantillons d'entraînement`);
    }
  }
  
  private generateId(): string {
    return Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9);
  }
}