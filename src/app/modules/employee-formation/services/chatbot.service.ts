// services/chatbot.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface ChatbotMessage {
  id: string;
  content: string;
  sender: 'USER' | 'BOT';
  timestamp: Date;
  sources?: string[];
}

export interface ChatbotRequest {
  question: string;
  sessionId: string;
  employeId?: string;
}

export interface ChatbotResponse {
  answer: string;
  sources: string[];
  success: boolean;
  errorMessage?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ChatbotService {
  private apiUrl = `${environment.apiUrl}/chatbot`;

  constructor(private http: HttpClient) {}

  askQuestion(question: string, sessionId: string, employeId?: string): Observable<ChatbotResponse> {
    const request: ChatbotRequest = {
      question: question,
      sessionId: sessionId,
      employeId: employeId
    };
    return this.http.post<ChatbotResponse>(`${this.apiUrl}/ask`, request);
  }

  refreshKnowledgeBase(): Observable<any> {
    return this.http.post(`${this.apiUrl}/refresh-knowledge`, {});
  }

  healthCheck(): Observable<any> {
    return this.http.get(`${this.apiUrl}/health`);
  }
}