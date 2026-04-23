import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ChatbotMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

@Injectable({
    providedIn: 'root'
})
export class ChatbotService {
    private apiUrl = 'http://localhost:8081/api/chatbot';

    constructor(private http: HttpClient) {}

    envoyerMessage(employeId: string, message: string): Observable<{ reponse: string }> {
        // Récupérer le token depuis localStorage
        const token = localStorage.getItem('accessToken'); // Utilise accessToken
        
        // Créer les headers avec le token
        let headers = new HttpHeaders({
            'Content-Type': 'application/json'
        });
        
        if (token) {
            headers = headers.set('Authorization', `Bearer ${token}`);
            console.log('Token ajouté aux headers'); // Debug
        } else {
            console.warn('Aucun token trouvé!');
        }
        
        const body = {
            employeId: employeId,
            message: message,
            historique: []
        };
        
        console.log('Envoi requête chatbot avec token'); // Debug
        
        return this.http.post<{ reponse: string }>(
            `${this.apiUrl}/message`, 
            body,
            { headers: headers }
        );
    }
}