// voice-ai.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';

export interface VoiceAnalysisResult {
  emotion: string;
  sentimentScore: number;
  confidence: number;
  transcript: string;
  suggestedRating: number;
  detectedWords: string[];
}

const SENTIMENT_LEXICON: Record<string, number> = {
  // Très positif
  excellent: 1.0, exceptionnel: 1.0, parfait: 1.0, extraordinaire: 1.0,
  fantastique: 1.0, brillant: 0.9, remarquable: 0.9, incroyable: 0.9,
  formidable: 0.9, magnifique: 0.9,
  
  // Positif
  bien: 0.6, bon: 0.6, bonne: 0.6, satisfait: 0.7, satisfaite: 0.7,
  content: 0.7, contente: 0.7, heureux: 0.7, heureuse: 0.7,
  utile: 0.5, agreable: 0.6, clair: 0.5, claire: 0.5, interessant: 0.5,
  efficace: 0.6, comprehensible: 0.5, enrichissant: 0.7, precis: 0.5,
  bravo: 0.8, merci: 0.4, super: 0.7, top: 0.6, aime: 0.7, adore: 0.9,
  ravi: 0.8, ravie: 0.8, genial: 0.9, génial: 0.9,
  
  // ✅ AJOUT: Expressions composées négatives
  'très mauvais': -0.95, 'très mauvaise': -0.95,
  'très nul': -1.0, 'très nulle': -1.0,
  'très décevant': -0.9, 'très décevante': -0.9,
  'très insuffisant': -0.85, 'très insuffisante': -0.85,
  'pas bien': -0.6, 'pas bon': -0.6, 'pas bonne': -0.6,
  'pas satisfait': -0.7, 'pas content': -0.7,
  'vraiment mauvais': -0.9, 'vraiment mauvaise': -0.9,
  'absolument pas': -0.8,
  
  // ✅ AJOUT: Négatif (masculin et féminin)
  mauvais: -0.8,      // Masculin
  mauvaise: -0.8,     // Féminin ✅ AJOUTÉ
  nul: -0.9,          // Masculin
  nulle: -0.9,        // Féminin ✅ AJOUTÉ
  decevant: -0.7,     // Masculin
  decevante: -0.7,    // Féminin ✅ AJOUTÉ
  décevant: -0.7,
  décevante: -0.7,
  insuffisant: -0.6,  // Masculin
  insuffisante: -0.6, // Féminin ✅ AJOUTÉ
  difficile: -0.4,
  confus: -0.6,
  ennuyeux: -0.5,
  ennuyeuse: -0.5,    // ✅ AJOUTÉ
  lent: -0.4,
  lente: -0.4,        // ✅ AJOUTÉ
  complique: -0.5,
  compliquée: -0.5,   // ✅ AJOUTÉ
  probleme: -0.5,
  manque: -0.4,
  moyen: -0.3,
  moyenne: -0.3,      // ✅ AJOUTÉ
  bof: -0.4,
  
  // ✅ AJOUT: Très négatif
  horrible: -1.0,
  catastrophique: -1.0,
  desastreux: -1.0,
  desastreuse: -1.0,  // ✅ AJOUTÉ
  inutile: -0.8,
  incomprehensible: -0.8,
  desorganise: -0.8,
  desorganisée: -0.8, // ✅ AJOUTÉ
  fache: -0.8,
  colere: -0.9,
  triste: -0.7,       // ✅ AUGMENTÉ de -0.6 à -0.7
  decu: -0.7,
  decue: -0.7,        // ✅ AJOUTÉ
  déçu: -0.7,
  déçue: -0.7,
  
  // ✅ AJOUT: "malformation" et variantes
  malformation: -0.9,
  'mal formation': -0.9,
  'mal formé': -0.8,
  'mal formée': -0.8,
};

const INTENSIFIERS: Record<string, number> = {
  'très': 1.5, 'tres': 1.5, 'vraiment': 1.4, 'tellement': 1.5,
  'extrêmement': 1.7, 'extremement': 1.7, 'absolument': 1.6,
  'franchement': 1.2, 'assez': 0.8, 'un peu': 0.5, 'plutôt': 0.9,
  'plutot': 0.9, 'trop': 1.3,
};

// ✅ Gère "ne", "n" (après suppression apostrophe), "pas", "jamais", etc.
const NEGATIONS = new Set(['pas', 'ne', 'n', 'jamais', 'aucun', 'nullement', 'ni', 'plus']);

// ✅ Normalise le texte : accents + apostrophes → espaces
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // supprime les accents
    .replace(/[''`]/g, ' ')          // ✅ apostrophes → espace (n'aime → n aime)
    .replace(/[.,!?;:]/g, ' ')       // ponctuation → espace
    .replace(/\s+/g, ' ')            // espaces multiples → un seul
    .trim();
}

@Injectable({ providedIn: 'root' })
export class VoiceAIService {
  private recognition: any;
  private transcriptSubject = new Subject<string>();

  constructor(private http: HttpClient) {
    this.initSpeechRecognition();
  }

  private initSpeechRecognition(): void {
    const SpeechRecognition = (window as any).SpeechRecognition ||
                              (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'fr-FR';
    }
  }

  startListening(): Observable<string> {
    return new Observable((observer) => {
      if (!this.recognition) {
        observer.error('Speech recognition not supported');
        return;
      }
      this.recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        observer.next(transcript);
        observer.complete();
      };
      this.recognition.onerror = (event: any) => {
        observer.error(event.error);
      };
      this.recognition.start();
    });
  }

  stopListening(): void {
    if (this.recognition) {
      this.recognition.stop();
    }
  }

  // ✅ MÉTHODE AMÉLIORÉE avec détection des bigrammes
  analyzeTranscript(transcript: string): VoiceAnalysisResult {
    const normalized = normalizeText(transcript);
    const words = normalized.split(' ');
    
    let weightedScore = 0;
    let matchCount = 0;
    const detectedWords: string[] = [];
    let i = 0;
    
    while (i < words.length) {
      let foundPhrase = false;
      
      // ✅ Vérifier les bigrammes (2 mots) d'abord
      if (i <= words.length - 2) {
        const bigram = `${words[i]} ${words[i+1]}`;
        if (SENTIMENT_LEXICON[bigram]) {
          const weight = SENTIMENT_LEXICON[bigram];
          weightedScore += weight;
          matchCount++;
          detectedWords.push(`📝 ${bigram} (${weight})`);
          i += 2;
          foundPhrase = true;
        }
      }
      
      // ✅ Vérifier les mots individuels
      if (!foundPhrase) {
        const word = words[i];
        let weight = SENTIMENT_LEXICON[word];
        
        if (weight !== undefined) {
          // ✅ Cherche une négation dans les 3 mots précédents
          let isNegated = false;
          for (let j = Math.max(0, i - 3); j < i; j++) {
            if (NEGATIONS.has(words[j])) {
              isNegated = true;
              break;
            }
          }
          
          // ✅ Détection intensificateur
          let intensifier = 1.0;
          let intensifierWord = '';
          if (i > 0 && INTENSIFIERS[words[i-1]]) {
            intensifier = INTENSIFIERS[words[i-1]];
            intensifierWord = words[i-1];
          }
          
          let finalWeight = weight * intensifier;
          
          // ✅ Négation : inverse le score
          if (isNegated) {
            finalWeight = -finalWeight * 0.9;
          }
          
          weightedScore += finalWeight;
          matchCount++;
          
          const negationMark = isNegated ? '¬' : '';
          const intensifierMark = intensifierWord ? `[${intensifierWord}×${intensifier}]` : '';
          detectedWords.push(`${negationMark}${word} (${finalWeight.toFixed(2)}) ${intensifierMark}`);
        }
        i++;
      }
    }
    
    // ✅ Correction spéciale pour les mots très négatifs
    const veryNegativeWords = ['malformation', 'mauvaise', 'mauvais', 'nul', 'nulle', 'horrible', 'catastrophique'];
    for (const word of veryNegativeWords) {
      if (normalized.includes(word) && matchCount === 1) {
        weightedScore = -0.9;
        matchCount = 1;
        break;
      }
    }
    
    // ✅ Correction pour "très mauvaise"
    if (normalized.includes('très mauvaise') || normalized.includes('tres mauvaise')) {
      weightedScore = -0.95;
      matchCount = 1;
      detectedWords.push('📝 très mauvaise (-0.95)');
    }
    
    // Score normalisé entre -1 et +1
    const normalizedScore = matchCount > 0
      ? Math.max(-1, Math.min(1, weightedScore / matchCount))
      : 0;
    
    // Confiance proportionnelle aux mots détectés
    const confidence = Math.min(0.98, 0.5 + matchCount * 0.08);
    
    // ✅ SEUILS AMÉLIORÉS pour la détection
    let emotion: string;
    let suggestedRating: number;
    
    if (normalizedScore <= -0.7) {
      emotion = 'COLERE';
      suggestedRating = 1;
    } else if (normalizedScore <= -0.3) {
      emotion = 'TRISTESSE';
      suggestedRating = 2;
    } else if (normalizedScore < 0.2) {
      emotion = 'NEUTRE';
      suggestedRating = 3;
    } else if (normalizedScore < 0.6) {
      emotion = 'JOIE';
      suggestedRating = 4;
    } else {
      emotion = 'EXCELLENT';
      suggestedRating = 5;
    }
    
    // ✅ Log pour déboguer
    console.log(`📊 Analyse: "${transcript}" → ${emotion} (${normalizedScore}) → ${suggestedRating}⭐`);
    console.log(`   Mots détectés: ${detectedWords.join(', ')}`);
    
    return {
      emotion,
      sentimentScore: parseFloat(normalizedScore.toFixed(3)),
      confidence: parseFloat(confidence.toFixed(2)),
      transcript,
      suggestedRating,
      detectedWords,
    };
  }

  analyzeVoice(audioBlob: Blob): Observable<VoiceAnalysisResult> {
    const formData = new FormData();
    formData.append('audioFile', audioBlob, 'recording.webm');
    return this.http.post<VoiceAnalysisResult>(
      'http://localhost:8081/api/sentiment/analyze-voice',
      formData
    );
  }
}