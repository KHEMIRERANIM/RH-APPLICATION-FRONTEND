// voice-recorder.component.ts
import { Component, EventEmitter, Output } from '@angular/core';
import { VoiceAIService, VoiceAnalysisResult } from '../../services/voice-ai.service';

@Component({
  selector: 'app-voice-recorder',
  template: `
    <div class="voice-recorder">
      <div class="mode-selector">
        <button [class.active]="mode === 'text'" (click)="mode = 'text'">📝 Dicter</button>
        <button [class.active]="mode === 'audio'" (click)="mode = 'audio'">🎤 Enregistrer</button>
      </div>
      
      <!-- Mode texte (transcription) -->
      <div *ngIf="mode === 'text'">
        <button *ngIf="!isListening" (click)="startDictation()" class="voice-btn">
          🎙️ Dicter mon avis
        </button>
        <button *ngIf="isListening" (click)="stopDictation()" class="voice-btn-stop">
          ⏹️ Arrêter ({{recordingTime}}s)
        </button>
        
        <div *ngIf="transcript" class="transcript-result">
          <strong>📝 Transcription:</strong>
          <p>"{{transcript}}"</p>
          <div *ngIf="detectedWords.length > 0" class="detected-words">
            <span>Mots détectés:</span>
            <span *ngFor="let word of detectedWords" class="word-badge"
                  [class.positive]="isPositiveWord(word)"
                  [class.negative]="isNegativeWord(word)">
              {{word}}
            </span>
          </div>
        </div>
      </div>
      
      <!-- Mode audio -->
      <div *ngIf="mode === 'audio'">
        <button *ngIf="!isRecording" (click)="startVoiceRecording()" class="voice-btn">
          🎙️ Enregistrer
        </button>
        <button *ngIf="isRecording" (click)="stopVoiceRecording()" class="voice-btn-stop">
          ⏹️ Stop
        </button>
      </div>
      
      <!-- Résultat -->
      <div *ngIf="analysisResult" class="analysis-result" [class]="analysisResult.emotion.toLowerCase()">
        <div class="result-header">
          <span class="icon">{{getEmotionIcon(analysisResult.emotion)}}</span>
          <span class="emotion">{{analysisResult.emotion}}</span>
          <span class="rating">{{analysisResult.suggestedRating}}/5 ⭐</span>
        </div>
        <div class="transcript">{{analysisResult.transcript}}</div>
        <button (click)="applyResult()" class="apply-btn">Appliquer cette note</button>
      </div>
    </div>
  `,
  styles: [`
    .voice-recorder { margin: 15px 0; }
    .mode-selector { display: flex; gap: 10px; margin-bottom: 10px; }
    .mode-selector button { padding: 5px 12px; border-radius: 20px; border: 1px solid #ddd; background: white; cursor: pointer; }
    .mode-selector button.active { background: #6366f1; color: white; border-color: #6366f1; }
    .voice-btn { padding: 10px 20px; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; border: none; border-radius: 25px; cursor: pointer; }
    .voice-btn-stop { padding: 10px 20px; background: #ef4444; color: white; border: none; border-radius: 25px; cursor: pointer; animation: pulse 1s infinite; }
    @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.7; } 100% { opacity: 1; } }
    .transcript-result { margin-top: 10px; padding: 10px; background: #f3f4f6; border-radius: 10px; }
    .detected-words { margin-top: 8px; display: flex; flex-wrap: wrap; gap: 5px; }
    .word-badge { padding: 2px 8px; border-radius: 15px; font-size: 11px; }
    .word-badge.positive { background: #d1fae5; color: #065f46; }
    .word-badge.negative { background: #fee2e2; color: #991b1b; }
    .analysis-result { margin-top: 10px; padding: 12px; border-radius: 12px; }
    .analysis-result.joie { background: #d1fae5; border-left: 4px solid #10b981; }
    .analysis-result.colere { background: #fee2e2; border-left: 4px solid #ef4444; }
    .analysis-result.tristesse { background: #dbeafe; border-left: 4px solid #3b82f6; }
    .analysis-result.neutre { background: #f3f4f6; border-left: 4px solid #6b7280; }
    .result-header { display: flex; align-items: center; gap: 10px; }
    .icon { font-size: 24px; }
    .emotion { font-weight: bold; }
    .rating { margin-left: auto; }
    .transcript { margin-top: 8px; font-style: italic; }
    .apply-btn { margin-top: 8px; padding: 4px 12px; background: #6366f1; color: white; border: none; border-radius: 15px; cursor: pointer; font-size: 12px; }
  `]
})
export class VoiceRecorderComponent {
  @Output() analysisCompleted = new EventEmitter<VoiceAnalysisResult>();
  
  mode: 'text' | 'audio' = 'text';
  isListening = false;
  isRecording = false;
  recordingTime = 0;
  transcript = '';
  detectedWords: string[] = [];
  analysisResult: VoiceAnalysisResult | null = null;
  private timerInterval: any;

  constructor(private voiceService: VoiceAIService) {}

  startDictation(): void {
    this.isListening = true;
    this.transcript = '';
    this.recordingTime = 0;
    
    this.timerInterval = setInterval(() => {
      this.recordingTime++;
      if (this.recordingTime >= 30) this.stopDictation();
    }, 1000);
    
    this.voiceService.startListening().subscribe({
      next: (transcript) => {
        this.transcript = transcript;
        this.analyzeTranscript(transcript);
      },
      error: (err) => {
        console.error('Erreur:', err);
        this.isListening = false;
      },
      complete: () => {
        this.isListening = false;
        if (this.timerInterval) clearInterval(this.timerInterval);
      }
    });
  }

  stopDictation(): void {
    this.voiceService.stopListening();
    this.isListening = false;
    if (this.timerInterval) clearInterval(this.timerInterval);
  }

  startVoiceRecording(): void {
    this.isRecording = true;
    this.recordingTime = 0;
    this.timerInterval = setInterval(() => {
      this.recordingTime++;
    }, 1000);
    // Implémentation de l'enregistrement audio
  }

  stopVoiceRecording(): void {
    this.isRecording = false;
    if (this.timerInterval) clearInterval(this.timerInterval);
  }

  analyzeTranscript(transcript: string): void {
    const result = this.voiceService.analyzeTranscript(transcript);
    this.detectedWords = result.detectedWords;
    this.analysisResult = result;
    this.analysisCompleted.emit(result);
  }

  getEmotionIcon(emotion: string): string {
    const icons: any = {
      'JOIE': '😊', 'EXCELLENT': '😍', 'COLERE': '😠', 
      'TRISTESSE': '😢', 'NEUTRE': '😐'
    };
    return icons[emotion] || '🎤';
  }

  isPositiveWord(word: string): boolean {
    const positive = ['content', 'heureux', 'satisfait', 'excellent', 'super', 'parfait'];
    return positive.includes(word);
  }

  isNegativeWord(word: string): boolean {
    const negative = ['faché', 'fâché', 'colère', 'triste', 'déçu', 'mauvais', 'nul'];
    return negative.includes(word);
  }

  applyResult(): void {
    if (this.analysisResult) {
      this.analysisCompleted.emit(this.analysisResult);
    }
  }
}