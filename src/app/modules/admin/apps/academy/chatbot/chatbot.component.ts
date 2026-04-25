import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ChatbotService, ChatbotMessage } from 'src/app/services/chatbot.service';
import { AcademyService } from '../academy.service';

@Component({
    selector: 'chatbot',
    template: `
        <div class="fixed bottom-4 right-4 z-50">
            <!-- Bouton pour ouvrir/fermer -->
            <button *ngIf="!isOpen" 
                    (click)="toggleChat()"
                    class="bg-primary-600 hover:bg-primary-700 text-white rounded-full p-4 shadow-lg transition-all">
                <mat-icon>chat</mat-icon>
            </button>

            <!-- Fenêtre de chat -->
            <div *ngIf="isOpen" 
                 class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-96 h-[500px] flex flex-col overflow-hidden border">
                
                <!-- En-tête -->
                <div class="bg-primary-600 text-white p-4 flex justify-between items-center">
                    <div class="flex items-center gap-2">
                        <mat-icon>smart_toy</mat-icon>
                        <span class="font-semibold">Assistant RH 🤖</span>
                    </div>
                    <button mat-icon-button (click)="toggleChat()" class="text-white">
                        <mat-icon>close</mat-icon>
                    </button>
                </div>

                <!-- Messages -->
                <div #messagesContainer class="flex-1 overflow-y-auto p-4 space-y-3">
                    <div *ngFor="let msg of messages" 
                         [class.flex-row-reverse]="msg.role === 'user'"
                         class="flex items-start gap-2">
                        
                        <div *ngIf="msg.role === 'assistant'" 
                             class="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                            <mat-icon class="text-primary-600 text-sm">smart_toy</mat-icon>
                        </div>
                        
                        <div [class.bg-primary-600]="msg.role === 'user'"
                             [class.bg-gray-100]="msg.role === 'assistant'"
                             [class.text-white]="msg.role === 'user'"
                             class="max-w-[80%] rounded-2xl px-4 py-2">
                            {{ msg.content }}
                        </div>
                        
                        <div *ngIf="msg.role === 'user'" 
                             class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                            <mat-icon class="text-gray-600 text-sm">person</mat-icon>
                        </div>
                    </div>
                    
                    <div *ngIf="isLoading" class="flex justify-start">
                        <div class="bg-gray-100 rounded-2xl px-4 py-2">
                            <div class="flex gap-1">
                                <span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                                <span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></span>
                                <span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Input -->
                <form [formGroup]="messageForm" (ngSubmit)="envoyerMessage()" class="p-4 border-t">
                    <div class="flex gap-2">
                        <mat-form-field class="flex-1" appearance="outline">
                            <mat-label>Posez votre question...</mat-label>
                            <input matInput formControlName="message" placeholder="Ex: Combien de jours de congé me reste-t-il ?">
                        </mat-form-field>
                        <button mat-flat-button color="primary" type="submit" [disabled]="messageForm.invalid || isLoading">
                            <mat-icon>send</mat-icon>
                        </button>
                    </div>
                    <div class="text-xs text-secondary mt-2 text-center">
                        💡 Questions possibles : solde, démarches, règles...
                    </div>
                </form>
            </div>
        </div>
    `,
    styles: [`
        .animate-bounce { animation: bounce 0.6s infinite; }
        .delay-100 { animation-delay: 0.1s; }
        .delay-200 { animation-delay: 0.2s; }
        @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-5px); }
        }
    `]
})
export class ChatbotComponent implements OnInit {
    @ViewChild('messagesContainer') messagesContainer!: ElementRef;
    
    isOpen = false;
    isLoading = false;
    messages: ChatbotMessage[] = [];
    messageForm: FormGroup;
    employeId: string = '';

    constructor(
        private fb: FormBuilder,
        private chatbotService: ChatbotService,
        private academyService: AcademyService
    ) {
        this.messageForm = this.fb.group({
            message: ['', Validators.required]
        });
    }

    ngOnInit(): void {
        // Récupérer l'ID de l'employé connecté
        const userStr = localStorage.getItem('currentUser');
        if (userStr) {
            const user = JSON.parse(userStr);
            this.employeId = user.id;
        }
        
        // Message de bienvenue
        this.messages.push({
            role: 'assistant',
            content: 'Bonjour ! Je suis votre assistant RH. Je peux vous renseigner sur vos congés, les démarches, et répondre à vos questions. Comment puis-je vous aider ?',
            timestamp: new Date()
        });
    }

    toggleChat(): void {
        this.isOpen = !this.isOpen;
        if (this.isOpen) {
            setTimeout(() => this.scrollToBottom(), 100);
        }
    }

    envoyerMessage(): void {
        if (this.messageForm.invalid || this.isLoading) return;
        
        const message = this.messageForm.value.message;
        
        // Ajouter le message de l'utilisateur
        this.messages.push({
            role: 'user',
            content: message,
            timestamp: new Date()
        });
        
        this.messageForm.reset();
        this.scrollToBottom();
        
        this.isLoading = true;
        
        this.chatbotService.envoyerMessage(this.employeId, message).subscribe({
            next: (response) => {
                this.messages.push({
                    role: 'assistant',
                    content: response.reponse,
                    timestamp: new Date()
                });
                this.isLoading = false;
                this.scrollToBottom();
            },
            error: (err) => {
                console.error('Erreur chatbot:', err);
                this.messages.push({
                    role: 'assistant',
                    content: 'Désolé, je rencontre une difficulté technique. Veuillez réessayer dans quelques instants.',
                    timestamp: new Date()
                });
                this.isLoading = false;
                this.scrollToBottom();
            }
        });
    }

    private scrollToBottom(): void {
        setTimeout(() => {
            if (this.messagesContainer) {
                this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
            }
        }, 50);
    }
}