// data-collection.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { VoiceAnalysisResult } from './voice-ai.service';

export interface TrainingSample {
  id?: string;
  text: string;
  sentimentScore: number;
  emotion: string;
  rating: number;
  timestamp: Date;
  userFeedback?: number;
  confidence?: number;
  sessionId?: string;
}

@Injectable({ providedIn: 'root' })
export class TrainingDataService {
  private trainingData: TrainingSample[] = [];
  private batchSize = 10;
  private apiUrl = 'http://localhost:8081/api/training';
  
  constructor(private http: HttpClient) {
    this.loadFromLocalStorage();
  }
  
  saveForTraining(
    result: VoiceAnalysisResult, 
    transcript: string, 
    userCorrectedRating?: number
  ): void {
    const sample: TrainingSample = {
      text: transcript,
      sentimentScore: result.sentimentScore,
      emotion: result.emotion,
      rating: userCorrectedRating || result.suggestedRating,
      timestamp: new Date(),
      userFeedback: userCorrectedRating,
      confidence: result.confidence,
      sessionId: this.generateSessionId()
    };
    
    this.trainingData.push(sample);
    this.saveToLocalStorage();
    
    // Envoyer au backend pour réentraînement
    if (this.trainingData.length % this.batchSize === 0) {
      this.sendToTrainingPipeline();
    }
  }
  
  async sendToTrainingPipeline(): Promise<void> {
    const samplesToSend = this.trainingData.slice(-this.batchSize);
    
    try {
      await this.http.post(`${this.apiUrl}/samples`, {
        samples: samplesToSend,
        timestamp: new Date()
      }).toPromise();
      
      console.log(`Sent ${samplesToSend.length} samples for training`);
    } catch (error) {
      console.error('Failed to send training samples:', error);
    }
  }
  
  getAllTrainingData(): TrainingSample[] {
    return [...this.trainingData];
  }
  
  exportAsJSON(): string {
    return JSON.stringify(this.trainingData, null, 2);
  }
  
  exportAsCSV(): string {
    const headers = ['text', 'sentimentScore', 'emotion', 'rating', 'timestamp', 'confidence'];
    const rows = this.trainingData.map(sample => [
      `"${sample.text.replace(/"/g, '""')}"`,
      sample.sentimentScore,
      sample.emotion,
      sample.rating,
      sample.timestamp.toISOString(),
      sample.confidence || ''
    ]);
    
    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }
  
  clearData(): void {
    this.trainingData = [];
    localStorage.removeItem('training_data');
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
    }
  }
  
  private generateSessionId(): string {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
  
  getStatistics(): any {
    const total = this.trainingData.length;
    const avgScore = this.trainingData.reduce((sum, s) => sum + s.sentimentScore, 0) / total;
    const emotionDistribution: Record<string, number> = {};
    
    this.trainingData.forEach(sample => {
      emotionDistribution[sample.emotion] = (emotionDistribution[sample.emotion] || 0) + 1;
    });
    
    return {
      totalSamples: total,
      averageSentimentScore: avgScore,
      emotionDistribution,
      needsMoreData: total < 100,
      recommendedRetraining: total >= 50
    };
  }
}