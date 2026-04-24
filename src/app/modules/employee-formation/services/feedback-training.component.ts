// feedback-training.component.ts (corrigé)
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // ✅ Importer CommonModule
import { VoiceAIService, VoiceAnalysisResult } from './voice-ai.service';
import { TrainingDataService, TrainingSample } from './training-data.service';
import { ContinuousTrainingService } from './training-pipeline.service';

@Component({
  selector: 'app-feedback-training',
  standalone: false, // ✅ Si vous n'utilisez pas standalone
  templateUrl: './feedback-training.component.html',
  styleUrls: ['./feedback-training.component.scss']
})
export class FeedbackTrainingComponent implements OnInit {
  isRecording = false;
  transcript = '';
  analysisResult: VoiceAnalysisResult | null = null;
  selectedRating: number | null = null;
  trainingStats: any = null;
  trainingStatus: any = null;
  isTraining = false;
  
  constructor(
    private voiceAI: VoiceAIService,
    private trainingData: TrainingDataService,
    private trainingPipeline: ContinuousTrainingService
  ) {}
  
  ngOnInit() {
    this.updateStats();
    this.updateStatus();
    this.voiceAI.enableTrainingMode();
  }
  
  startRecording() {
    this.isRecording = true;
    this.voiceAI.startListening().subscribe({
      next: (transcript: string) => {
        this.transcript = transcript;
        this.analyzeTranscript();
        this.isRecording = false;
      },
      error: (error: any) => {
        console.error('Erreur reconnaissance:', error);
        this.isRecording = false;
      }
    });
  }
  
  stopRecording() {
    this.voiceAI.stopListening();
    this.isRecording = false;
  }
  
  analyzeTranscript() {
    if (this.transcript && this.transcript.trim()) {
      this.analysisResult = this.voiceAI.analyzeTranscript(this.transcript);
      console.log('Analyse:', this.analysisResult);
    }
  }
  
  submitCorrection(rating: number) {
    this.selectedRating = rating;
    
    if (this.analysisResult) {
      this.trainingData.saveForTraining(
        this.analysisResult,
        this.transcript,
        rating
      );
      
      const isCorrect = rating === this.analysisResult.suggestedRating;
      if (isCorrect) {
        console.log('✅ Bonne prédiction!');
      } else {
        console.log(`⚠️ Correction enregistrée: ${this.analysisResult.suggestedRating}⭐ → ${rating}⭐`);
      }
      
      this.updateStats();
      
      alert(`Merci! Note ${rating}/5 enregistrée. ${isCorrect ? 'Notre IA a bien deviné !' : 'Cette correction nous aide à nous améliorer !'}`);
      
      setTimeout(() => {
        this.transcript = '';
        this.analysisResult = null;
        this.selectedRating = null;
      }, 2000);
    }
  }
  
  async triggerTraining() {
    const samples = this.trainingData.getCorrectionsOnly();
    if (samples.length < 5) {
      alert(`Il faut au moins 5 corrections pour un entraînement. Actuellement: ${samples.length}`);
      return;
    }
    
    this.isTraining = true;
    await this.trainingPipeline.retrainWithUserFeedback(samples);
    this.isTraining = false;
    
    this.updateStats();
    this.updateStatus();
    alert('Entraînement terminé! Le modèle a été amélioré.');
  }
  
  updateStats() {
    this.trainingStats = this.trainingData.getStatistics();
  }
  
  updateStatus() {
    this.trainingStatus = this.trainingPipeline.getTrainingStatus();
  }
  
  exportData() {
    const json = this.trainingData.exportAsJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `training_data_${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}