import { Component, Input, OnInit, ViewChild, ElementRef, AfterViewChecked, OnDestroy } from '@angular/core';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { CandidatureService } from '../../services/candidature.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { Candidature } from '../../models/recrutement.models';

export interface ChatMessage {
  sender: 'bot' | 'user';
  text: string;
}

declare const webkitSpeechRecognition: any;

@Component({
  selector: 'app-chat-coach',
  templateUrl: './chat-coach.component.html',
  styleUrls: ['./chat-coach.component.scss'],
  animations: [
    trigger('slideInOut', [
      transition(':enter', [
        style({ transform: 'translateY(100%)', opacity: 0 }),
        animate('300ms cubic-bezier(0.25, 0.8, 0.25, 1)', style({ transform: 'translateY(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms cubic-bezier(0.25, 0.8, 0.25, 1)', style({ transform: 'translateY(100%)', opacity: 0 }))
      ])
    ])
  ]
})
export class ChatCoachComponent implements OnInit, AfterViewChecked, OnDestroy {
  @Input() candidatureActive: Candidature | null = null;
  @ViewChild('scrollMe') private myScrollContainer!: ElementRef;

  isOpen = false;
  messages: ChatMessage[] = [];
  userInput = '';
  isTyping = false;

  // NOUVEAU: Simulateur et API Vocales
  isInterviewMode = false;
  isListening = false;
  recognition: any;

  constructor(
    private candidatureService: CandidatureService,
    private authService: AuthService
  ) {
    this.initSpeechRecognition();
  }

  ngOnInit(): void {
    const userName = this.authService.currentUser?.prenom || 'Candidat';
    this.messages.push({
      sender: 'bot',
      text: `Bonjour ${userName} ! Je suis votre Career Coach RSE 🌱. Comment puis-je vous aider aujourd'hui ?`
    });
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  ngOnDestroy() {
    if (this.recognition) {
      this.recognition.stop();
    }
  }

  scrollToBottom(): void {
    try {
      this.myScrollContainer.nativeElement.scrollTop = this.myScrollContainer.nativeElement.scrollHeight;
    } catch (err) { }
  }

  toggleChat(): void {
    this.isOpen = !this.isOpen;
  }

  // --- SPEECH TO TEXT ---
  initSpeechRecognition() {
    if ('webkitSpeechRecognition' in window) {
      this.recognition = new webkitSpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'fr-FR';

      this.recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        this.userInput = transcript;
        this.sendMessage(); // Auto-send vocal message
      };

      this.recognition.onend = () => {
        this.isListening = false;
      };

      this.recognition.onerror = () => {
        this.isListening = false;
      };
    }
  }

  toggleListening() {
    if (!this.recognition) {
      alert("Votre navigateur ne supporte pas la saisie vocale.");
      return;
    }
    if (this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    } else {
      this.recognition.start();
      this.isListening = true;
    }
  }

  // --- TEXT TO SPEECH ---
  speakText(text: string) {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Stop current speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'fr-FR';
      utterance.pitch = 1.1; // Voix légèrement plus enthousiaste
      window.speechSynthesis.speak(utterance);
    }
  }

  // --- ACTIONS RAPIDES ---
  toggleInterviewMode() {
    this.isInterviewMode = !this.isInterviewMode;
    if (this.isInterviewMode) {
      this.userInput = "start_interview";
      this.sendMessage();
    }
  }

  downloadTips() {
    if (!this.candidatureActive?.id) {
      alert("Candidature introuvable pour générer le PDF.");
      return;
    }
    const allBotTips = this.messages
      .filter(m => m.sender === 'bot')
      .map(m => m.text)
      .join('\n\n* ');

    const finalTips = "* " + allBotTips;

    this.candidatureService.telechargerCoachTipsPdf(this.candidatureActive.id, finalTips).subscribe(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Mes_Conseils_Coach_RSE.pdf';
      a.click();
      window.URL.revokeObjectURL(url);
    });
  }

  // --- MESSAGING ---
  sendMessage(): void {
    if (!this.userInput.trim()) return;

    const messageToSend = this.userInput;
    if (messageToSend !== "start_interview") {
      this.messages.push({ sender: 'user', text: messageToSend });
    }
    this.userInput = '';
    this.isTyping = true;

    const fullname = `${this.authService.currentUser?.prenom} ${this.authService.currentUser?.nom}`;
    const offreTitle = 'le poste';
    const missingSkills = this.candidatureActive?.competencesManquantes || [];

    // Garder seulement les 5 derniers messages pour le contexte JSON
    const history = this.messages.slice(-5);

    this.candidatureService.chatCoach(
      messageToSend,
      fullname,
      offreTitle,
      missingSkills,
      history,
      this.isInterviewMode
    ).subscribe({
      next: (res) => {
        setTimeout(() => {
          this.isTyping = false;
          this.messages.push({ sender: 'bot', text: res.reply });
          this.speakText(res.reply);
        }, 800);
      },
      error: () => {
        this.isTyping = false;
        this.messages.push({ sender: 'bot', text: 'Désolé, je rencontre des problèmes de réseau (IA injoignable).' });
      }
    });
  }

  // --- ANTI-TRICHE ---
  onPaste(event: ClipboardEvent) {
    if (this.isInterviewMode) {
      event.preventDefault(); // Annule le formatage/collage
      this.messages.push({
        sender: 'bot',
        text: '🚨 [Alerte Anti-Fraude] Le Copier/Coller est strictement désactivé en mode Simulateur d\'Entretien pour garantir l\'authenticité de vos soft-skills. Veuillez écrire au clavier ou utiliser votre Voix !'
      });
      this.speakText("Alerte. Le copier-coller est désactivé pendant l'évaluation.");
      setTimeout(() => this.scrollToBottom(), 100);
    }
  }
}
