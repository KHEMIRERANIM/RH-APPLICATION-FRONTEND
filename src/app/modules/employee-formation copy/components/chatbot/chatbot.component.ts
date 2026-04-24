// components/chatbot/chatbot.component.ts
import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ChatbotService, ChatbotMessage, ChatbotResponse } from '../../services/chatbot.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { v4 as uuidv4 } from 'uuid';

@Component({
  selector: 'app-chatbot',
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.scss']
})
export class ChatbotComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('chatMessagesContainer') private messagesContainer!: ElementRef;
  
  chatForm: FormGroup;
  messages: ChatbotMessage[] = [];
  isLoading = false;
  sessionId: string;
  isOpen = false;
  unreadCount = 0;
  currentFormation?: string; // Ajouté pour le contexte de formation

  // Suggestions rapides
  quickQuestions: string[] = [
    'Quelles formations sont disponibles ?',
    'Comment m\'inscrire à une formation ?',
    'Quels sont les prérequis ?',
    'Combien coûte une formation ?',
    'Comment obtenir des points ?',
    'Quand aura lieu la prochaine formation ?'
  ];

  constructor(
    private fb: FormBuilder,
    private chatbotService: ChatbotService,
    private snackBar: MatSnackBar
  ) {
    this.sessionId = this.getOrCreateSessionId();
    this.chatForm = this.fb.group({
      message: ['', [Validators.required, Validators.minLength(2)]]
    });
  }

  ngOnInit(): void {
    this.addWelcomeMessage();
    this.loadChatHistory();
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  ngOnDestroy(): void {
    this.saveChatHistory();
  }

  private getOrCreateSessionId(): string {
    let sessionId = localStorage.getItem('chatbot_session_id');
    if (!sessionId) {
      sessionId = uuidv4();
      localStorage.setItem('chatbot_session_id', sessionId);
    }
    return sessionId;
  }

  /**
   * Nettoie la question en supprimant les préfixes indésirables
   * comme "Concernant la formation \"XXX\":"
   */
  private cleanQuestion(question: string): string {
    if (!question || typeof question !== 'string') {
      return '';
    }

    let cleaned = question.trim();

    // 1. Supprimer le préfixe "Concernant la formation..."
    const formationPrefixPatterns = [
      /^Concernant la formation\s+"[^"]*":\s*/i,
      /^Concernant la formation\s+'[^']*':\s*/i,
      /^Concernant la formation\s+[^:]+:\s*/i,
      /^Concernant\s+la\s+formation\s+"[^"]*":\s*/i,
      /^Concernant\s+la\s+formation\s+'[^']*':\s*/i,
      /^Pour\s+la\s+formation\s+"[^"]*":\s*/i,
      /^Au\s+sujet\s+de\s+la\s+formation\s+"[^"]*":\s*/i,
      /^À\s+propos\s+de\s+la\s+formation\s+"[^"]*":\s*/i,
      /^Concernant\s+la\s+formation\s+[^:]+:\s*/i
    ];

    for (const pattern of formationPrefixPatterns) {
      cleaned = cleaned.replace(pattern, '');
    }

    // 2. Supprimer le contexte de formation si présent
    if (this.currentFormation) {
      const escapedFormation = this.escapeRegex(this.currentFormation);
      const formationContextPattern = new RegExp(`^${escapedFormation}\\s*:\\s*`, 'i');
      cleaned = cleaned.replace(formationContextPattern, '');
    }

    // 3. Supprimer les guillemets résiduels
    cleaned = cleaned.replace(/^["']|["']$/g, '');

    // 4. Supprimer les préfixes génériques
    const genericPrefixes = [
      /^(Question|Demande|Info|Help|Dis|Dis-moi):\s*/i,
      /^dis\s+moi\s+/i,
      /^peux-tu\s+me\s+parler\s+de\s+/i,
      /^qu'est-ce\s+que\s+/i,
      /^c'est\s+quoi\s+/i,
      /^explique\s+moi\s+/i,
      /^je\s+veux\s+savoir\s+/i
    ];

    for (const pattern of genericPrefixes) {
      cleaned = cleaned.replace(pattern, '');
    }

    // 5. Nettoyer les espaces multiples
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    // 6. Nettoyer la ponctuation en début de phrase
    cleaned = cleaned.replace(/^[.,!?;:]+/, '');

    // 7. Si la question est vide après nettoyage, retourner la question originale
    if (!cleaned) {
      console.warn('⚠️ Question vide après nettoyage, utilisation de l\'originale:', question);
      return question.trim();
    }

    console.log('🧹 Nettoyage de la question:', {
      original: question,
      cleaned: cleaned,
      currentFormation: this.currentFormation
    });

    return cleaned;
  }

  /**
   * Échappe les caractères spéciaux pour les expressions régulières
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private addWelcomeMessage(): void {
    const welcomeMessage: ChatbotMessage = {
      id: uuidv4(),
      content: `Bonjour ${this.getUserName()} ! 👋\n\nJe suis votre assistant RH dédié aux formations. Je peux vous renseigner sur :\n\n• Les formations disponibles\n• Les prérequis et objectifs\n• Les modalités d'inscription\n• Les dates et lieux\n• Et bien plus encore !\n\nComment puis-je vous aider aujourd'hui ?`,
      sender: 'BOT',
      timestamp: new Date(),
      sources: []
    };
    this.messages.push(welcomeMessage);
  }

  private getUserName(): string {
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
      try {
        const user = JSON.parse(currentUser);
        return user.prenom || user.nom || 'Employé';
      } catch (e) {}
    }
    return 'cher collaborateur';
  }

  toggleChat(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.unreadCount = 0;
      setTimeout(() => this.scrollToBottom(), 100);
    }
  }

  sendMessage(): void {
    if (this.chatForm.invalid || this.isLoading) return;

    let messageText = this.chatForm.get('message')?.value.trim();
    if (!messageText) return;

    // 🔑 NETTOYER LA QUESTION ICI - C'est le point clé !
    const cleanedMessage = this.cleanQuestion(messageText);

    // Ajouter le message utilisateur (afficher la question originale pour l'utilisateur)
    const userMessage: ChatbotMessage = {
      id: uuidv4(),
      content: messageText, // Afficher l'original dans le chat
      sender: 'USER',
      timestamp: new Date()
    };
    this.messages.push(userMessage);
    
    // Vider le formulaire
    this.chatForm.reset();
    
    // Appeler l'API avec la question nettoyée
    this.isLoading = true;
    
    const employeId = localStorage.getItem('userId') || undefined;
    
    // Envoyer la question nettoyée au lieu de l'originale
    this.chatbotService.askQuestion(cleanedMessage, this.sessionId, employeId).subscribe({
      next: (response: ChatbotResponse) => {
        const botMessage: ChatbotMessage = {
          id: uuidv4(),
          content: response.answer,
          sender: 'BOT',
          timestamp: new Date(),
          sources: response.sources
        };
        this.messages.push(botMessage);
        this.isLoading = false;
        this.saveChatHistory();
        
        if (!this.isOpen) {
          this.unreadCount++;
        }
      },
      error: (error) => {
        console.error('Erreur chatbot:', error);
        const errorMessage: ChatbotMessage = {
          id: uuidv4(),
          content: 'Désolé, une erreur technique est survenue. Veuillez réessayer plus tard.',
          sender: 'BOT',
          timestamp: new Date()
        };
        this.messages.push(errorMessage);
        this.isLoading = false;
        
        this.snackBar.open('Erreur de communication avec l\'assistant', 'Fermer', { duration: 3000 });
      }
    });
  }

  sendQuickQuestion(question: string): void {
    // Nettoyer également les questions rapides
    this.chatForm.get('message')?.setValue(question);
    this.sendMessage();
  }

  private scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
      }
    } catch (err) {}
  }

  private saveChatHistory(): void {
    // Sauvegarder les 50 derniers messages
    const history = this.messages.slice(-50);
    localStorage.setItem(`chatbot_history_${this.sessionId}`, JSON.stringify(history));
  }

  private loadChatHistory(): void {
    const saved = localStorage.getItem(`chatbot_history_${this.sessionId}`);
    if (saved) {
      try {
        const history = JSON.parse(saved);
        this.messages = history.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
      } catch (e) {}
    }
  }

  clearHistory(): void {
    this.messages = [];
    this.addWelcomeMessage();
    localStorage.removeItem(`chatbot_history_${this.sessionId}`);
    this.snackBar.open('Historique effacé', 'Fermer', { duration: 2000 });
  }

  formatTime(date: Date): string {
    return new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  /**
   * Optionnel: Définir le contexte de formation actuel
   * (Appelez cette méthode quand l'utilisateur consulte une formation spécifique)
   */
  setCurrentFormation(formationName: string): void {
    this.currentFormation = formationName;
    console.log('📚 Contexte de formation défini:', formationName);
  }
}