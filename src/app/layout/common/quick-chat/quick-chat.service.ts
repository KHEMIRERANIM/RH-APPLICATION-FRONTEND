import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import { Chat, Contact } from 'app/layout/common/quick-chat/quick-chat.types';
import { AuthService } from 'app/core/auth/auth.service';

@Injectable({
    providedIn: 'root'
})
export class QuickChatService
{
    private _chat: BehaviorSubject<Chat> = new BehaviorSubject(null);
    private _chats: BehaviorSubject<Chat[]> = new BehaviorSubject<Chat[]>(null);

    /**
     * Constructor
     */
    constructor(private _httpClient: HttpClient, private _authService: AuthService)
    {
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Accessors
    // -----------------------------------------------------------------------------------------------------

    /**
     * Getter for chat
     */
    get chat$(): Observable<Chat>
    {
        return this._chat.asObservable();
    }

    /**
     * Getter for chat
     */
    get chats$(): Observable<Chat[]>
    {
        return this._chats.asObservable();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Get chats (Contacts)
     */
    getChats(): Observable<any>
    {
        return this._httpClient.get<any[]>('/api/chat/contacts').pipe(
            map((users: any[]) => {
                const currentUser = this._authService.currentUser;
                // Filter out current user from contacts and map to Chat type
                const chats: Chat[] = users
                    .filter(user => user.id !== currentUser.id)
                    .map(user => {
                    const contact: Contact = {
                        id: user.id,
                        name: `${user.prenom} ${user.nom}`,
                        avatar: user.photoUrl
                    };
                    return {
                        id: user.id, // Using user id as chat id
                        contactId: user.id,
                        contact: contact,
                        unreadCount: 0,
                        messages: []
                    };
                });
                return chats;
            }),
            tap((chats: Chat[]) => {
                this._chats.next(chats);
            })
        );
    }

    /**
     * Get chat by id
     *
     * @param id (Contact ID)
     */
    getChatById(id: string): Observable<any>
    {
        const currentUserId = this._authService.currentUser.id;
        return this._httpClient.get<any[]>(`/api/chat/messages/${currentUserId}/${id}`).pipe(
            map((messages: any[]) => {
                const chats = this._chats.getValue();
                const chatIndex = chats.findIndex(c => c.id === id);
                let chat = chats[chatIndex];

                if (!chat) {
                    return null; // or throw
                }

                chat.messages = messages.map(m => ({
                    id: m.id,
                    isMine: m.senderId === currentUserId,
                    value: m.content,
                    createdAt: m.createdAt
                }));

                // Update the chat
                this._chat.next(chat);

                return chat;
            }),
            switchMap((chat) => {
                if ( !chat )
                {
                    return throwError('Could not found chat with id of ' + id + '!');
                }
                return of(chat);
            })
        );
    }

    /**
     * Send message
     */
    sendMessage(contactId: string, content: string): Observable<any>
    {
        const currentUserId = this._authService.currentUser.id;
        const payload = {
            senderId: currentUserId,
            receiverId: contactId,
            content: content
        };

        return this._httpClient.post<any>('/api/chat/messages', payload).pipe(
            tap((newMessage) => {
                const chat = this._chat.getValue();
                if (chat && chat.id === contactId) {
                    chat.messages.push({
                        id: newMessage.id,
                        isMine: true,
                        value: newMessage.content,
                        createdAt: newMessage.createdAt
                    });
                    this._chat.next({...chat}); // Trigger update
                }
            })
        );
    }
}
