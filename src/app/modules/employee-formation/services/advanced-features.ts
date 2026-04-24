import { SENTIMENT_LEXICON, NEGATIONS } from './voice-ai.service';

export class AdvancedFeatureExtractor {
  
  extractFeatures(text: string): any {
    const words = text.toLowerCase().split(' ');
    
    return {
      // N-grammes (bigrammes et trigrammes)
      bigrams: this.extractNGrams(words, 2),
      trigrams: this.extractNGrams(words, 3),
      
      // Features syntaxiques
      exclamationCount: (text.match(/!/g) || []).length,
      questionCount: (text.match(/\?/g) || []).length,
      uppercaseWords: words.filter(w => w === w.toUpperCase() && w.length > 2).length,
      
      // Longueur et complexité
      wordCount: words.length,
      avgWordLength: words.reduce((sum, w) => sum + w.length, 0) / words.length,
      
      // Mots émotionnels avancés
      intensifierSequence: this.findIntensifierSequences(words),
      negationScope: this.getNegationScope(words),
      
      // Ponctuation émotionnelle
      emotionalPunctuation: (text.match(/!+\?+|\?+!+/g) || []).length,
      
      // Score basé sur le lexique avec contexte
      contextualScore: this.calculateContextualScore(words)
    };
  }
  
  private extractNGrams(words: string[], n: number): string[] {
    const ngrams: string[] = [];
    for (let i = 0; i <= words.length - n; i++) {
      ngrams.push(words.slice(i, i + n).join(' '));
    }
    return ngrams;
  }
  
  private findIntensifierSequences(words: string[]): string[] {
    const INTENSIFIERS = new Set(['très', 'vraiment', 'tellement', 'extrêmement', 'absolument']);
    const sequences: string[] = [];
    
    for (let i = 0; i < words.length - 1; i++) {
      if (INTENSIFIERS.has(words[i]) && SENTIMENT_LEXICON[words[i + 1]]) {
        sequences.push(`${words[i]} ${words[i + 1]}`);
      }
    }
    return sequences;
  }
  
  private getNegationScope(words: string[]): number[] {
    const scopes: number[] = [];
    for (let i = 0; i < words.length; i++) {
      if (NEGATIONS.has(words[i])) {
        let distance = 0;
        for (let j = i + 1; j < Math.min(i + 5, words.length); j++) {
          if (SENTIMENT_LEXICON[words[j]]) {
            distance = j - i;
            break;
          }
        }
        scopes.push(distance);
      }
    }
    return scopes;
  }
  
  private calculateContextualScore(words: string[]): number {
    let score = 0;
    let weightSum = 0;
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const sentimentScore = SENTIMENT_LEXICON[word];
      
      if (sentimentScore !== undefined) {
        // Poids basé sur la position (les mots récents sont plus importants)
        const positionWeight = 1 + (i / words.length) * 0.5;
        
        // Vérification de négation
        let isNegated = false;
        for (let j = Math.max(0, i - 3); j < i; j++) {
          if (NEGATIONS.has(words[j])) {
            isNegated = true;
            break;
          }
        }
        
        const finalScore = isNegated ? -sentimentScore : sentimentScore;
        score += finalScore * positionWeight;
        weightSum += positionWeight;
      }
    }
    
    return weightSum > 0 ? score / weightSum : 0;
  }
}