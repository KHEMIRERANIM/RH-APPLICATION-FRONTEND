// formation-chatbot.component.ts
import { Component, Input, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ChatbotService, ChatbotMessage, ChatbotResponse } from '../../services/chatbot.service';
import { Formation } from '../../../../shared/models/formation.model';
import { v4 as uuidv4 } from 'uuid';

@Component({
  selector: 'app-formation-chatbot',
  templateUrl: './formation-chatbot.component.html',
  styleUrls: ['./formation-chatbot.component.scss']
})
export class FormationChatbotComponent implements OnInit {
  @Input() formation!: Formation;
  @ViewChild('chatMessagesContainer') private messagesContainer!: ElementRef;
  
  isOpen = false;
  unreadCount = 0;
  messages: ChatbotMessage[] = [];
  chatForm: FormGroup;
  isLoading = false;
  sessionId: string;
  quickQuestions: string[] = [];

  constructor(
    private fb: FormBuilder,
    private chatbotService: ChatbotService
  ) {
    this.sessionId = uuidv4();
    this.chatForm = this.fb.group({
      message: ['', [Validators.required, Validators.minLength(2)]]
    });
  }

  ngOnInit(): void {
    this.initQuickQuestions();
    this.addWelcomeMessage();
  }

  private initQuickQuestions(): void {
    this.quickQuestions = [
      `Quels sont les prérequis pour "${this.formation?.titre || 'cette formation'}" ?`,
      `Quand commence cette formation ?`,
      `Qui est le formateur ?`,
      `Combien de temps dure la formation ?`,
      `Où aura lieu la formation ?`,
      `Quels sont les objectifs de cette formation ?`
    ];
  }

  /**
   * Nettoie la question en supprimant les préfixes indésirables
   */
  private cleanQuestion(question: string): string {
    if (!question || typeof question !== 'string') {
      return '';
    }

    let cleaned = question.trim();

    // Supprimer le préfixe "Concernant la formation..."
    const patterns = [
      /^Concernant la formation\s+"[^"]*":\s*/i,
      /^Concernant la formation\s+'[^']*':\s*/i,
      /^Concernant la formation\s+[^:]+:\s*/i,
      /^Concernant\s+la\s+formation\s+"[^"]*":\s*/i,
      /^Pour\s+la\s+formation\s+"[^"]*":\s*/i,
      /^Au\s+sujet\s+de\s+la\s+formation\s+"[^"]*":\s*/i,
      /^À\s+propos\s+de\s+la\s+formation\s+"[^"]*":\s*/i
    ];

    for (const pattern of patterns) {
      cleaned = cleaned.replace(pattern, '');
    }

    // Supprimer les guillemets résiduels
    cleaned = cleaned.replace(/^["']|["']$/g, '');
    
    // Nettoyer les espaces
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    return cleaned || question;
  }

  private addWelcomeMessage(): void {
    const welcomeMessage: ChatbotMessage = {
      id: uuidv4(),
      content: `👋 Bonjour ! Je suis l'assistant dédié à la formation **${this.formation?.titre || 'cette formation'}**.\n\nPosez-moi toutes vos questions sur :\n\n• Le contenu et les objectifs\n• Les prérequis nécessaires\n• Le formateur et son expertise\n• Les modalités pratiques\n• Les dates et le lieu\n\nComment puis-je vous aider ?`,
      sender: 'BOT',
      timestamp: new Date(),
      sources: []
    };
    this.messages = [welcomeMessage];
  }

  clearHistory(): void {
    this.messages = [];
    this.addWelcomeMessage();
    localStorage.removeItem(`chatbot_history_${this.sessionId}`);
    this.unreadCount = 0;
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

    // 🔑 ÉTAPE 1: Nettoyer la question de l'utilisateur
    const cleanedMessage = this.cleanQuestion(messageText);
    
    // 🔑 ÉTAPE 2: Ajouter le contexte de formation UNIQUEMENT si la question n'est pas déjà contextuelle
    let contextualQuestion: string;
    
    // Vérifier si la question concerne déjà cette formation spécifiquement
    const formationName = this.formation?.titre || 'cette formation';
    const alreadyContextual = messageText.toLowerCase().includes(formationName.toLowerCase());
    
    if (alreadyContextual) {
      // La question mentionne déjà la formation, ne pas ajouter de préfixe
      contextualQuestion = cleanedMessage;
      console.log('📝 Question déjà contextuelle, pas de préfixe ajouté');
    } else {
      // Ajouter le contexte de formation
      contextualQuestion = `Concernant la formation "${formationName}": ${cleanedMessage}`;
      console.log('📝 Contexte de formation ajouté');
    }

    // Ajouter message utilisateur (afficher l'original)
    const userMessage: ChatbotMessage = {
      id: uuidv4(),
      content: messageText,
      sender: 'USER',
      timestamp: new Date()
    };
    this.messages.push(userMessage);
    this.chatForm.reset();
    this.isLoading = true;

    console.log('📤 Envoi au backend:', {
      original: messageText,
      cleaned: cleanedMessage,
      contextual: contextualQuestion
    });

    const employeId = localStorage.getItem('userId') || undefined;

    // Envoyer la question contextuelle
    this.chatbotService.askQuestion(contextualQuestion, this.sessionId, employeId).subscribe({
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
        setTimeout(() => this.scrollToBottom(), 100);
        
        if (!this.isOpen) {
          this.unreadCount++;
        }
      },
      error: (error) => {
        console.error('Erreur chatbot:', error);
        const errorMessage: ChatbotMessage = {
          id: uuidv4(),
          content: '❌ Désolé, une erreur technique est survenue. Veuillez réessayer plus tard.',
          sender: 'BOT',
          timestamp: new Date()
        };
        this.messages.push(errorMessage);
        this.isLoading = false;
      }
    });
  }

  sendQuickQuestion(question: string): void {
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
    const history = this.messages.slice(-50);
    localStorage.setItem(`chatbot_history_${this.sessionId}`, JSON.stringify(history));
  }

  formatTime(date: Date): string {
    return new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  getQuickQuestions(): string[] {
    return this.quickQuestions;
  }
}