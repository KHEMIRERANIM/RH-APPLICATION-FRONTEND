// src/app/modules/employee/services/voice-sentiment.service.ts
import { Injectable, NgZone } from '@angular/core';
import { Subject, Observable } from 'rxjs';

export interface VoiceAnalysis {
    transcript: string;
    confidence: number;
    sentimentScore: number;  // -1 à +1
    sentiment: 'TRES_POSITIF' | 'POSITIF' | 'NEUTRE' | 'NEGATIF' | 'TRES_NEGATIF';
    intensity: number;       // 0-2
    pitch: number;           // hauteur de voix
    volume: number;          // volume moyen
    speakingRate: number;    // vitesse de parole
}

@Injectable({
    providedIn: 'root'
})
export class VoiceSentimentService {
    private recognition: any;
    private mediaRecorder: MediaRecorder | null = null;
    private audioChunks: Blob[] = [];
    private isRecording = false;
    private transcriptSubject = new Subject<string>();
    private analysisSubject = new Subject<VoiceAnalysis>();

    constructor(private ngZone: NgZone) {
        this.initSpeechRecognition();
    }

    private initSpeechRecognition(): void {
        const SpeechRecognition = (window as any).SpeechRecognition || 
                                  (window as any).webkitSpeechRecognition;
        
        if (SpeechRecognition) {
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            this.recognition.lang = 'fr-FR'; // Français
            this.recognition.maxAlternatives = 1;
        } else {
            console.warn('Web Speech API non supportée');
        }
    }

    // Méthode 1: Utiliser Web Speech API (reconnaissance vocale + analyse basique)
    startListening(): Observable<string> {
        return new Observable((observer) => {
            if (!this.recognition) {
                observer.error('Reconnaissance vocale non supportée');
                return;
            }

            this.recognition.start();
            this.recognition.onresult = (event: any) => {
                const transcript = Array.from(event.results)
                    .map((result: any) => result[0].transcript)
                    .join('');
                
                this.ngZone.run(() => {
                    observer.next(transcript);
                    this.transcriptSubject.next(transcript);
                });
            };

            this.recognition.onerror = (event: any) => {
                this.ngZone.run(() => {
                    observer.error(event.error);
                });
            };

            this.recognition.onend = () => {
                this.ngZone.run(() => {
                    observer.complete();
                });
            };
        });
    }

    stopListening(): void {
        if (this.recognition) {
            this.recognition.stop();
        }
    }

    // Méthode 2: Enregistrement audio + analyse avancée (ton, émotion)
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
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
                await this.analyzeAudio(audioBlob);
                
                // Arrêter tous les tracks du stream
                stream.getTracks().forEach(track => track.stop());
            };

            this.mediaRecorder.start();
            this.isRecording = true;
        } catch (error) {
            console.error('Erreur d\'accès au microphone:', error);
        }
    }

    stopRecording(): void {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
        }
    }

    private async analyzeAudio(audioBlob: Blob): Promise<void> {
        // Créer un contexte audio pour analyser le signal
        const audioContext = new AudioContext();
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        // Analyser le signal audio
        const channelData = audioBuffer.getChannelData(0);
        
        // Calculer le volume moyen (RMS)
        let rms = 0;
        for (let i = 0; i < channelData.length; i++) {
            rms += channelData[i] * channelData[i];
        }
        rms = Math.sqrt(rms / channelData.length);
        const volume = Math.min(1, rms * 5); // Normaliser entre 0 et 1
        
        // Analyser le pitch (hauteur de voix)
        const pitch = this.estimatePitch(channelData, audioBuffer.sampleRate);
        
        // Analyser la vitesse de parole
        const speakingRate = this.estimateSpeakingRate(audioBuffer);
        
        // Déterminer le sentiment basé sur les caractéristiques vocales
        const analysis = this.analyzeVoiceFeatures(volume, pitch, speakingRate);
        
        this.analysisSubject.next(analysis);
    }

    private estimatePitch(channelData: Float32Array, sampleRate: number): number {
        // Méthode simplifiée d'estimation du pitch
        // En production, utilisez une librairie comme pitchy ou ml5.js
        
        let maxCorrelation = 0;
        let pitch = 0;
        
        for (let lag = 20; lag < 200; lag++) {
            let correlation = 0;
            for (let i = 0; i < channelData.length - lag; i++) {
                correlation += channelData[i] * channelData[i + lag];
            }
            correlation /= (channelData.length - lag);
            
            if (correlation > maxCorrelation) {
                maxCorrelation = correlation;
                pitch = sampleRate / lag;
            }
        }
        
        return Math.min(500, Math.max(50, pitch));
    }

    private estimateSpeakingRate(audioBuffer: AudioBuffer): number {
        // Détection des syllabes via les pics d'énergie
        const channelData = audioBuffer.getChannelData(0);
        const sampleRate = audioBuffer.sampleRate;
        const duration = audioBuffer.duration;
        
        let peaks = 0;
        let lastPeak = 0;
        const threshold = 0.1;
        
        for (let i = 0; i < channelData.length; i++) {
            if (Math.abs(channelData[i]) > threshold && (i - lastPeak) > sampleRate * 0.1) {
                peaks++;
                lastPeak = i;
            }
        }
        
        // Mots par minute (estimation)
        const wordsPerMinute = (peaks / duration) * 60;
        return Math.min(200, Math.max(50, wordsPerMinute));
    }

    private analyzeVoiceFeatures(volume: number, pitch: number, speakingRate: number): VoiceAnalysis {
        let sentimentScore = 0;
        let sentiment: any = 'NEUTRE';
        let intensity = 1.0;
        
        // Analyse du volume (fort = émotion intense)
        if (volume > 0.3) {
            intensity *= 1.3;
            if (volume > 0.5) sentimentScore -= 0.3; // Volume élevé souvent négatif
        }
        
        // Analyse du pitch (aigu = stress/excitation, grave = calme/triste)
        if (pitch > 300) {
            sentimentScore -= 0.2; // Pitch aigu = stress
            intensity *= 1.2;
        } else if (pitch < 150) {
            sentimentScore -= 0.1; // Pitch grave = tristesse
        }
        
        // Analyse de la vitesse (rapide = excité/stressé, lent = triste/calme)
        if (speakingRate > 160) {
            sentimentScore += 0.2; // Parole rapide = excitation
            intensity *= 1.2;
        } else if (speakingRate < 100) {
            sentimentScore -= 0.2; // Parole lente = tristesse
        }
        
        // Normalisation
        sentimentScore = Math.max(-1, Math.min(1, sentimentScore));
        
        if (sentimentScore >= 0.6) sentiment = 'TRES_POSITIF';
        else if (sentimentScore >= 0.2) sentiment = 'POSITIF';
        else if (sentimentScore > -0.2) sentiment = 'NEUTRE';
        else if (sentimentScore > -0.6) sentiment = 'NEGATIF';
        else sentiment = 'TRES_NEGATIF';
        
        return {
            transcript: '',
            confidence: 0.7,
            sentimentScore: sentimentScore,
            sentiment: sentiment,
            intensity: intensity,
            pitch: pitch,
            volume: volume,
            speakingRate: speakingRate
        };
    }

    getTranscriptObservable(): Observable<string> {
        return this.transcriptSubject.asObservable();
    }

    getAnalysisObservable(): Observable<VoiceAnalysis> {
        return this.analysisSubject.asObservable();
    }

    isSpeechRecognitionSupported(): boolean {
        return !!(window as any).SpeechRecognition || !!(window as any).webkitSpeechRecognition;
    }

    isMediaRecorderSupported(): boolean {
        return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    }
}