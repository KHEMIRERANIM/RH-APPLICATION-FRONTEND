import { Component, EventEmitter, Output, OnDestroy } from '@angular/core';
import { HumeService, HumeAnalysisResult } from '../../services/hume.service';

@Component({
  selector: 'app-hume-voice',
  templateUrl: './hume-voice.component.html',
  styleUrls: ['./hume-voice.component.scss']
})
export class HumeVoiceComponent implements OnDestroy {
  @Output() analysisComplete = new EventEmitter<HumeAnalysisResult>();
  
  isRecording = false;
  isAnalyzing = false;
  mediaRecorder: MediaRecorder | null = null;
  audioChunks: Blob[] = [];
  currentAnalysis: HumeAnalysisResult | null = null;

  constructor(private humeService: HumeService) {}

  async startRecording(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        await this.analyzeAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      this.mediaRecorder.start();
      this.isRecording = true;
      
      // Arrêt automatique après 10 secondes
      setTimeout(() => this.stopRecording(), 10000);
      
    } catch (error) {
      console.error('Erreur microphone:', error);
    }
  }

  stopRecording(): void {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
      this.isAnalyzing = true;
    }
  }

  private async analyzeAudio(audioBlob: Blob): Promise<void> {
    this.humeService.analyzeAudio(audioBlob).subscribe({
      next: (result) => {
        this.currentAnalysis = result;
        this.isAnalyzing = false;
        this.analysisComplete.emit(result);
        
        // Mapper l'émotion vers une note étoiles
        const suggestedRating = this.mapEmotionToRating(result.emotion);
        if (suggestedRating) {
          console.log(`🎯 Émotion détectée: ${result.emotion}, Note suggérée: ${suggestedRating}/5`);
        }
      },
      error: (err) => {
        console.error('Erreur analyse:', err);
        this.isAnalyzing = false;
      }
    });
  }

  private mapEmotionToRating(emotion: string): number | null {
    const mapping: { [key: string]: number } = {
      'Joy': 5, 'Adoration': 5, 'Love': 5,
      'Calmness': 4, 'Neutral': 3,
      'Sadness': 2, 'Anger': 1, 'Fear': 1, 'Disgust': 1
    };
    return mapping[emotion] || null;
  }

  getEmotionIcon(emotion: string): string {
    const icons: { [key: string]: string } = {
      'Joy': '😊', 'Sadness': '😢', 'Anger': '😠', 'Fear': '😨',
      'Surprise': '😲', 'Disgust': '🤢', 'Neutral': '😐',
      'Adoration': '🥰', 'Calmness': '😌', 'Love': '❤️'
    };
    return icons[emotion] || '🎤';
  }

  getEmotionColor(emotion: string): string {
    const colors: { [key: string]: string } = {
      'Joy': '#10b981', 'Love': '#ec489a', 'Adoration': '#f59e0b',
      'Calmness': '#3b82f6', 'Neutral': '#6b7280',
      'Sadness': '#8b5cf6', 'Anger': '#ef4444', 
      'Fear': '#8b5cf6', 'Disgust': '#10b981', 'Surprise': '#f59e0b'
    };
    return colors[emotion] || '#6b7280';
  }

  ngOnDestroy(): void {
    this.humeService.disconnect();
  }
}