// src/app/modules/employee/services/hume.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface HumeAnalysisResult {
  emotion: string;
  score: number;
  transcription: string;
  allEmotions: { [key: string]: number };
  sentimentScore: number;
  confidence: number;
}

@Injectable({ providedIn: 'root' })
export class HumeService {
  private apiUrl = environment.apiUrl + '/hume';
  private ws: WebSocket | null = null;

  constructor(private http: HttpClient) {}

  /**
   * Analyse audio via backend (recommandé)
   */
  analyzeAudio(audioBlob: Blob): Observable<HumeAnalysisResult> {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    
    return this.http.post<HumeAnalysisResult>(`${this.apiUrl}/analyze`, formData);
  }

  /**
   * Connexion WebSocket temps réel
   */
  connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.http.get<{ token: string; wsUrl: string }>(`${this.apiUrl}/token`)
        .subscribe({
          next: (data) => {
            this.ws = new WebSocket(`${data.wsUrl}?api_key=${data.token}`);
            
            this.ws.onopen = () => {
              console.log('✅ WebSocket Hume connecté');
              resolve();
            };
            
            this.ws.onerror = (error) => {
              console.error('❌ Erreur WebSocket:', error);
              reject(error);
            };
          },
          error: reject
        });
    });
  }

  /**
   * Envoi audio en temps réel
   */
  sendAudioChunk(audioBlob: Blob): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket non connecté');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      this.ws?.send(JSON.stringify({
        type: 'audio_input',
        data: base64
      }));
    };
    reader.readAsDataURL(audioBlob);
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}