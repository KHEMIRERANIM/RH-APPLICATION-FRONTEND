import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, ReplaySubject, of } from 'rxjs';
import { Message } from 'app/layout/common/messages/messages.types';
import { map, switchMap, take, tap, catchError } from 'rxjs/operators';
import { Client } from '@stomp/stompjs';

const CHAT_API = '/api/chat/messages';

@Injectable({
    providedIn: 'root'
})
export class MessagesService
{
    private _messages: ReplaySubject<Message[]> = new ReplaySubject<Message[]>(1);
    private _stomp?: Client;
    private _stompStarted = false;

    /**
     * Constructor
     */
    constructor(private _httpClient: HttpClient)
    {
    }

    private mergeById(a: Message[], b: Message[]): Message[] {
        const map = new Map<string, Message>();
        [...a, ...b].forEach(n => {
            if (n.id && !map.has(n.id)) map.set(n.id, n);
        });
        return Array.from(map.values()).sort((x, y) =>
            String(y.time).localeCompare(String(x.time)));
    }

    private ensureStomp(localUser: { id: string }): void {
        if (this._stompStarted) return;
        this._stompStarted = true;

        const token = localStorage.getItem('accessToken');
        // Utiliser un WebSocket pur (sans SockJS) sur le endpoint /websocket
        // Spring accepte les connexions WebSocket directes sur ws://host/ws-chat/websocket
        const brokerURL = token
            ? `ws://localhost:8081/ws-chat/websocket?access_token=${encodeURIComponent(token)}`
            : 'ws://localhost:8081/ws-chat/websocket';

        this._stomp = new Client({
            brokerURL,
            connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
            reconnectDelay: 5000,
            onConnect: () => {
                this._stomp!.subscribe(`/topic/messages/${localUser.id}`, (message: { body: string }) => {
                    try {
                        const row = JSON.parse(message.body);
                        row.useRouter = true;
                        this._messages.pipe(take(1)).subscribe((cur) => {
                            if (!cur.some(c => c.id === row.id)) {
                                this._messages.next(this.mergeById([row], cur));
                            }
                        });
                    } catch {
                        /* ignore */
                    }
                });
            }
        });
        this._stomp.activate();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Accessors
    // -----------------------------------------------------------------------------------------------------

    /**
     * Getter for messages
     */
    get messages$(): Observable<Message[]>
    {
        return this._messages.asObservable();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Get all unread messages
     */
    getAll(): Observable<Message[]>
    {
        const localUserStr = localStorage.getItem('currentUser');
        if (!localUserStr) {
            return this._httpClient.get<Message[]>('api/common/messages').pipe(
                tap((messages) => {
                    this._messages.next(messages);
                })
            );
        }

        try {
            const localUser = JSON.parse(localUserStr);
            
            const token = localStorage.getItem('accessToken');
            const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;
            return this._httpClient.get<Message[]>(`${CHAT_API}/unread/${localUser.id}`, { headers }).pipe(
                catchError(() => of([])),
                tap((messages: Message[]) => {
                    messages.forEach((m: Message) => m.useRouter = true);
                    this._messages.next(messages);
                    this.ensureStomp(localUser);
                })
            );
        } catch (e) {
            return this._httpClient.get<Message[]>('api/common/messages').pipe(
                tap((messages) => {
                    this._messages.next(messages);
                })
            );
        }
    }

    /**
     * Create a message
     *
     * @param message
     */
    create(message: Message): Observable<Message>
    {
        return this.messages$.pipe(
            take(1),
            switchMap(messages => this._httpClient.post<Message>('api/common/messages', {message}).pipe(
                map((newMessage) => {
                    this._messages.next([...messages, newMessage]);
                    return newMessage;
                })
            ))
        );
    }

    /**
     * Update the message (Mark as Read)
     *
     * @param id
     * @param message
     */
    update(id: string, message: Message): Observable<Message>
    {
        return this.messages$.pipe(
            take(1),
            switchMap(messages => this._httpClient.put<void>(`${CHAT_API}/${id}/read`, {}).pipe(
                map(() => {
                    const updatedMessage = { ...message, read: true };
                    const index = messages.findIndex(item => item.id === id);
                    if (index > -1) {
                        messages[index] = updatedMessage;
                    }
                    this._messages.next(messages);
                    return updatedMessage;
                }),
                catchError(() => {
                    // Fallback to mock API if backend fails
                    return this._httpClient.patch<Message>('api/common/messages', {
                        id,
                        message
                    }).pipe(
                        map((updatedMessage: Message) => {
                            const index = messages.findIndex(item => item.id === id);
                            if (index > -1) messages[index] = updatedMessage;
                            this._messages.next(messages);
                            return updatedMessage;
                        })
                    );
                })
            ))
        );
    }

    /**
     * Delete the message
     *
     * @param id
     */
    delete(id: string): Observable<boolean>
    {
        return this.messages$.pipe(
            take(1),
            switchMap(messages => this._httpClient.delete<boolean>('api/common/messages', {params: {id}}).pipe(
                map((isDeleted: boolean) => {
                    const index = messages.findIndex(item => item.id === id);
                    messages.splice(index, 1);
                    this._messages.next(messages);
                    return isDeleted;
                })
            ))
        );
    }

    /**
     * Mark all messages as read
     */
    markAllAsRead(): Observable<boolean>
    {
        return this.messages$.pipe(
            take(1),
            switchMap(messages => this._httpClient.get<boolean>('api/common/messages/mark-all-as-read').pipe(
                map((isUpdated: boolean) => {
                    messages.forEach((message, index) => {
                        messages[index].read = true;
                    });
                    this._messages.next(messages);
                    return isUpdated;
                })
            ))
        );
    }
}

