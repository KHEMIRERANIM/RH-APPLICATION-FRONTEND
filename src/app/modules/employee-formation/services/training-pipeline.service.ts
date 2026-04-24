// training-pipeline.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TrainingSample } from './training-data.service';
import { SENTIMENT_LEXICON, VoiceAIService } from './voice-ai.service';

interface WordStats {
  sum: number;
  count: number;
  avg: number;
  correctPredictions: number;
  totalPredictions: number;
}

@Injectable({ providedIn: 'root' })
export class ContinuousTrainingService {
  private apiUrl = 'http://localhost:8081/api/training';
  private isTraining = false;
  
  constructor(
    private http: HttpClient,
    private voiceAI: VoiceAIService
  ) {}
  
  async retrainWithUserFeedback(samples: TrainingSample[]): Promise<any> {
    if (this.isTraining) {
      console.log('⏳ Entraînement déjà en cours...');
      return;
    }
    
    this.isTraining = true;
    console.log(`🎓 Début de l'entraînement avec ${samples.length} échantillons...`);
    
    try {
      // 1. Analyse des erreurs
      const errorAnalysis = this.analyzeErrors(samples);
      console.log('📊 Analyse des erreurs:', errorAnalysis);
      
      // 2. Mise à jour du lexique basée sur les corrections
      this.updateLexiconFromCorrections(samples);
      
      // 3. Envoi pour fine-tuning (si backend disponible)
      const trainingData = samples.map(s => ({
        text: s.text,
        label: this.ratingToLabel(s.correctRating),
        originalScore: s.sentimentScore
      }));
      
      const result = await this.http.post(`${this.apiUrl}/retrain`, {
        samples: trainingData,
        epochs: 3,
        learningRate: 2e-5,
        batchSize: 8,
        validationSplit: 0.2,
        errorAnalysis: errorAnalysis
      }).toPromise();
      
      console.log('✅ Entraînement terminé avec succès');
      
      // 4. Sauvegarde des métriques
      this.saveTrainingMetrics(samples, errorAnalysis);
      
      return result;
    } catch (error) {
      console.error('❌ Erreur pendant l\'entraînement:', error);
      // Fallback: entraînement local uniquement
      this.localTraining(samples);
    } finally {
      this.isTraining = false;
    }
  }
  
  private analyzeErrors(samples: TrainingSample[]): any {
    const errors = samples.filter(s => s.isCorrected);
    const errorTypes: Record<string, number> = {};
    const confusedPairs: Record<string, number> = {};
    
    errors.forEach(error => {
      const key = `${error.predictedRating}->${error.correctRating}`;
      errorTypes[key] = (errorTypes[key] || 0) + 1;
      
      // Détection des mots problématiques
      const words = error.text.toLowerCase().split(' ');
      words.forEach(word => {
        if (word.length > 3) {
          const pairKey = `${word}:${error.predictedRating}->${error.correctRating}`;
          confusedPairs[pairKey] = (confusedPairs[pairKey] || 0) + 1;
        }
      });
    });
    
    return {
      totalErrors: errors.length,
      errorRate: (errors.length / samples.length * 100).toFixed(1),
      errorTypes,
      problematicWords: Object.entries(confusedPairs)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([word, count]) => ({ word: word.split(':')[0], count }))
    };
  }
  
  private updateLexiconFromCorrections(samples: TrainingSample[]): void {
    const wordStats = new Map<string, WordStats>();
    
    // Analyser chaque correction
    samples.filter(s => s.isCorrected).forEach(sample => {
      const words = this.tokenize(sample.text);
      const correctScore = this.ratingToScore(sample.correctRating);
      
      words.forEach(word => {
        const stats = wordStats.get(word) || {
          sum: 0,
          count: 0,
          avg: 0,
          correctPredictions: 0,
          totalPredictions: 0
        };
        
        stats.sum += correctScore;
        stats.count++;
        stats.avg = stats.sum / stats.count;
        
        if (Math.abs(correctScore - sample.sentimentScore) < 0.3) {
          stats.correctPredictions++;
        }
        stats.totalPredictions++;
        
        wordStats.set(word, stats);
      });
    });
    
    // Mettre à jour le lexique
    let addedCount = 0;
    let updatedCount = 0;
    
    for (const [word, stats] of wordStats) {
      const accuracy = stats.totalPredictions > 0 ? stats.correctPredictions / stats.totalPredictions : 0;
      
      // Ajouter les mots avec forte corrélation et bonne précision
      if (Math.abs(stats.avg) > 0.4 && stats.count >= 3 && accuracy > 0.6) {
        if (!SENTIMENT_LEXICON[word]) {
          SENTIMENT_LEXICON[word] = Number(stats.avg.toFixed(3));
          addedCount++;
        } else if (Math.abs(SENTIMENT_LEXICON[word] - stats.avg) > 0.2) {
          // Mise à jour progressive
          const oldScore = SENTIMENT_LEXICON[word];
          const newScore = oldScore * 0.7 + stats.avg * 0.3;
          SENTIMENT_LEXICON[word] = Number(newScore.toFixed(3));
          updatedCount++;
        }
      }
    }
    
    console.log(`📚 Lexique mis à jour: +${addedCount} mots, ${updatedCount} modifiés`);
    this.saveLexiconToLocalStorage();
  }
  
  private localTraining(samples: TrainingSample[]): void {
    console.log('🔄 Entraînement local en cours...');
    
    // Analyse simple basée sur les corrections
    const corrections = samples.filter(s => s.isCorrected);
    const patterns: Record<string, number[]> = {};
    
    corrections.forEach(correction => {
      const text = correction.text.toLowerCase();
      const words = text.split(' ');
      
      // Extraire les bigrammes problématiques
      for (let i = 0; i < words.length - 1; i++) {
        const bigram = `${words[i]} ${words[i+1]}`;
        if (!patterns[bigram]) {
          patterns[bigram] = [];
        }
        patterns[bigram].push(this.ratingToScore(correction.correctRating));
      }
    });
    
    // Ajouter les patterns fréquents au lexique
    for (const [phrase, scores] of Object.entries(patterns)) {
      if (scores.length >= 3) {
        const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        if (Math.abs(avgScore) > 0.5 && !SENTIMENT_LEXICON[phrase]) {
          SENTIMENT_LEXICON[phrase] = Number(avgScore.toFixed(3));
          console.log(`📚 Pattern appris: "${phrase}" = ${avgScore.toFixed(2)}`);
        }
      }
    }
    
    this.saveLexiconToLocalStorage();
  }
  
  private ratingToScore(rating: number): number {
    const mapping: Record<number, number> = {
      1: -0.9,  // Très négatif
      2: -0.5,  // Négatif
      3: 0,     // Neutre
      4: 0.5,   // Positif
      5: 0.9    // Très positif
    };
    return mapping[rating] || 0;
  }
  
  private ratingToLabel(rating: number): number {
    return rating - 1; // 0-4
  }
  
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[.,!?;:()"]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2 && !this.isStopWord(word));
  }
  
  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'et', 'ou', 'mais',
      'donc', 'car', 'en', 'dans', 'pour', 'par', 'avec', 'sans', 'sur', 'sous',
      'ce', 'cet', 'cette', 'ces', 'mon', 'ton', 'son', 'notre', 'votre', 'leur'
    ]);
    return stopWords.has(word);
  }
  
  private saveLexiconToLocalStorage(): void {
    localStorage.setItem('sentiment_lexicon', JSON.stringify(SENTIMENT_LEXICON));
  }
  
  private saveTrainingMetrics(samples: TrainingSample[], errorAnalysis: any): void {
    const metrics = {
      timestamp: new Date(),
      samplesUsed: samples.length,
      errorRate: errorAnalysis.errorRate,
      lexiconSize: Object.keys(SENTIMENT_LEXICON).length,
      accuracy: ((samples.length - errorAnalysis.totalErrors) / samples.length * 100).toFixed(1)
    };
    
    const history = this.getTrainingHistory();
    history.push(metrics);
    localStorage.setItem('training_history', JSON.stringify(history.slice(-20)));
    
    console.log('📈 Métriques sauvegardées:', metrics);
  }
  
  private getTrainingHistory(): any[] {
    const stored = localStorage.getItem('training_history');
    return stored ? JSON.parse(stored) : [];
  }
  
  async schedulePeriodicTraining(): Promise<void> {
    const lastTraining = localStorage.getItem('last_training_date');
    const now = new Date();
    
    if (lastTraining) {
      const lastDate = new Date(lastTraining);
      const daysDiff = (now.getTime() - lastDate.getTime()) / (1000 * 3600 * 24);
      
      if (daysDiff >= 7) {
        const stored = localStorage.getItem('training_data');
        if (stored) {
          const samples = JSON.parse(stored) as TrainingSample[];
          if (samples.length >= 20) {
            await this.retrainWithUserFeedback(samples);
            localStorage.setItem('last_training_date', now.toISOString());
          }
        }
      }
    }
  }
  
  getTrainingStatus(): any {
    return {
      isTraining: this.isTraining,
      lexiconSize: this.voiceAI.getLexiconSize(),
      trainingHistory: this.getTrainingHistory(),
      lastTraining: localStorage.getItem('last_training_date')
    };
  }
}