import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, ReplaySubject, forkJoin, of, throwError } from 'rxjs';
import { Notification } from 'app/layout/common/notifications/notifications.types';
import { map, switchMap, take, tap, catchError } from 'rxjs/operators';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { getWsTrackingSockJsUrl } from 'src/environments/environment';

const NOTIF_API = '/api/transport-notifications';
const MUTUELLE_API = '/api/mutuelle-notifications';
const CAREER_API = 'http://localhost:8081/api/notifications/carriere';

@Injectable({
    providedIn: 'root'
})
export class NotificationsService {
    private _notifications: ReplaySubject<Notification[]> = new ReplaySubject<Notification[]>(1);
    private _stomp?: Client;
    private _stompStarted = false;

    constructor(private _httpClient: HttpClient) { }

    private mapBackendRow(bn: any): Notification {
        const t = typeof bn.type === 'string' ? bn.type : (bn.type?.name || String(bn.type || ''));
        let title = 'Nouvelle notification';
        if (t === 'DEMANDE_CONFIRMATION') title = 'Demande de réservation';
        else if (t === 'RESERVATION') title = 'Mise à jour réservation';
        else if (t === 'ALTERNATIVES_DISPONIBLES' || t === 'ANNULATION_TRAJET') title = 'Trajet annulé';
        else if (t === 'ACTIVATION_BUS') title = 'Activation bus de réserve';
        else if (bn.title) title = bn.title;

        let icon = 'heroicons_outline:bell';
        if (t === 'DEMANDE_CONFIRMATION') icon = 'heroicons_outline:question-mark-circle';
        else if (t === 'ALTERNATIVES_DISPONIBLES' || t === 'ANNULATION_TRAJET') icon = 'heroicons_outline:arrow-path';
        else if (t === 'ACTIVATION_BUS') icon = 'heroicons_outline:truck';
        else if (t === 'PLACES_LIBEREES') icon = 'heroicons_solid:ticket';
        else if (t === 'PRIX_BAISSE') icon = 'heroicons_solid:currency-dollar';
        else if (t === 'MOBILITY_APPROVED') icon = 'heroicons_solid:check-circle';
        else if (t === 'MOBILITY_REJECTED') icon = 'heroicons_solid:x-circle';
        else if (t === 'MOBILITY_ON_HOLD') icon = 'heroicons_solid:pause-circle';
        else if (t === 'CERTIF_VALIDATED') icon = 'heroicons_solid:academic-cap';

        const n: Notification = {
            id: bn.id,
            icon,
            title: bn.titreOffreAvantage || title,
            description: bn.contenu || bn.message || 'Nouvelle notification système',
            time: bn.dateCreation || bn.createdAt || new Date().toISOString(),
            read: bn.lu ?? bn.read ?? false,
            type: t,
            reservationId: bn.reservationId,
            trajetId: bn.trajetId,
            trajetAnnuleId: bn.trajetAnnuleId || bn.trajetId,
            expediteurId: bn.expediteurId,
            destinataireId: bn.destinataireId,
            contenu: bn.contenu,
            idUser: bn.idUser // Add idUser to identify mutuelle
        };

        if (t === 'ACTIVATION_BUS') {
            n.link = '/apps/covoiturage/admin';
            n.useRouter = true;
        } else if (t === 'PLACES_LIBEREES' || t === 'PRIX_BAISSE') {
            n.link = '/apps/partnerships/mes-favoris';
            n.useRouter = true;
        } else if (t?.startsWith('MOBILITY') || t?.startsWith('CERTIF')) {
            n.link = '/apps/carriere';
            n.useRouter = true;
        }

        return n;
    }

    private mergeById(a: Notification[], b: Notification[]): Notification[] {
        const map = new Map<string, Notification>();
        [...a, ...b].forEach(n => {
            if (n.id && !map.has(n.id)) map.set(n.id, n);
        });
        return Array.from(map.values()).sort((x, y) =>
            String(y.time).localeCompare(String(x.time)));
    }

    private ensureStomp(localUser: { id: string; role?: string }): void {
        if (this._stompStarted) return;
        this._stompStarted = true;
        const wsUrl = getWsTrackingSockJsUrl();
        const token = localStorage.getItem('accessToken');
        const sockJsUrl = token ? `${wsUrl}?access_token=${encodeURIComponent(token)}` : wsUrl;
        this._stomp = new Client({
            webSocketFactory: () => new SockJS(sockJsUrl) as any,
            connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
            reconnectDelay: 5000,
            onConnect: () => {
                this._stomp!.subscribe(`/topic/notifications/${localUser.id}`, (message: { body: string }) => {
                    try {
                        const row = JSON.parse(message.body);
                        const mapped = this.mapBackendRow(row);
                        this._notifications.pipe(take(1)).subscribe((cur) => {
                            if (!cur.some(c => c.id === mapped.id)) {
                                this._notifications.next(this.mergeById([mapped], cur));
                            }
                        });
                    } catch {
                        /* ignore */
                    }
                });
                if (localUser.role === 'ADMIN') {
                    this._stomp!.subscribe('/topic/notifications/ADMIN', (message: { body: string }) => {
                        try {
                            const row = JSON.parse(message.body);
                            const mapped = this.mapBackendRow(row);
                            this._notifications.pipe(take(1)).subscribe((cur) => {
                                if (!cur.some(c => c.id === mapped.id)) {
                                    this._notifications.next(this.mergeById([mapped], cur));
                                }
                            });
                        } catch {
                            /* ignore */
                        }
                    });
                }
            }
        });
        this._stomp.activate();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Accessors
    // -----------------------------------------------------------------------------------------------------

    /**
     * Getter for notifications
     */
    get notifications$(): Observable<Notification[]> {
        return this._notifications.asObservable();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Add a local notification (frontend-only)
     */
    addLocalNotification(notification: Notification): void {
        this._notifications.pipe(take(1)).subscribe((current) => {
            if (!notification.id) {
                notification.id = 'local-' + Math.random().toString(36).substring(2, 9);
            }
            if (!current.some(n => n.id === notification.id)) {
                this._notifications.next(this.mergeById([notification], current));
            }
        });
    }

    pushLocal(notification: Notification): void {
        this._notifications.pipe(take(1)).subscribe(current => {
            const exists = current.some(n => n.id === notification.id);
            if (!exists) {
                this._notifications.next([notification, ...current]);
            } else {
                const updated = current.map(n =>
                    n.id === notification.id ? { ...n, ...notification } : n
                );
                this._notifications.next(updated);
            }
        });
    }

    removeLocal(id: string): void {
        this._notifications.pipe(take(1)).subscribe(current => {
            this._notifications.next(current.filter(n => n.id !== id));
        });
    }

    private getCareerHeaders(): HttpHeaders {
        const token = localStorage.getItem('accessToken');
        return new HttpHeaders({ Authorization: `Bearer ${token || ''}` });
    }

    /**
     * Get all notifications
     */
    getAll(): Observable<Notification[]> {
        const localUserStr = localStorage.getItem('currentUser');
        if (!localUserStr) {
            return this._httpClient.get<Notification[]>('api/common/notifications').pipe(
                tap((notifications) => {
                    this._notifications.next(notifications);
                })
            );
        }

        try {
            const localUser = JSON.parse(localUserStr);
            
            const mutuelle$ = this._httpClient.get<any[]>(`${MUTUELLE_API}`).pipe(
                catchError(() => of([])),
                map(rows => (rows || []).map(bn => this.mapBackendRow(bn)))
            );
            
            const user$ = this._httpClient.get<any[]>(`${NOTIF_API}/destinataire/${localUser.id}/non-lues`).pipe(
                catchError((error) => {
                    console.error('Chargement notifications utilisateur', error);
                    return of([]);
                }),
                map(rows => (rows || []).map(bn => this.mapBackendRow(bn)))
            );
            const admin$ = localUser.role === 'ADMIN'
                ? this._httpClient.get<any[]>(`${NOTIF_API}/destinataire/ADMIN/non-lues`).pipe(
                    catchError(() => of([])),
                    map(rows => (rows || []).map(bn => this.mapBackendRow(bn)))
                )
                : of([] as Notification[]);

            const career$ = this._httpClient.get<any[]>(CAREER_API, { headers: this.getCareerHeaders() }).pipe(
                catchError(err => {
                    if (err.status === 401 || err.status === 403) return of([]);
                    return of([]);
                }),
                map(rows => (rows || []).map(bn => this.mapBackendRow(bn)))
            );

            return forkJoin({ mutuelle: mutuelle$, user: user$, admin: admin$, career: career$ }).pipe(
                map(({ mutuelle, user, admin, career }) => this.mergeById(this.mergeById(this.mergeById(mutuelle, user), admin), career)),
                tap((notifications) => {
                    this._notifications.next(notifications);
                    this.ensureStomp(localUser);
                })
            );
        } catch (e) {
            return this._httpClient.get<Notification[]>('api/common/notifications').pipe(
                tap((notifications) => {
                    this._notifications.next(notifications);
                })
            );
        }
    }

    /**
     * Create a notification
     */
    create(notification: Notification): Observable<Notification> {
        return this.notifications$.pipe(
            take(1),
            switchMap(notifications => this._httpClient.post<Notification>('api/common/notifications', { notification }).pipe(
                map((newNotification) => {
                    this._notifications.next([...notifications, newNotification]);
                    return newNotification;
                })
            ))
        );
    }

    /**
     * Update the notification
     */
    update(id: string, notification: Notification): Observable<Notification> {
        return this.notifications$.pipe(
            take(1),
            switchMap(notifications => {
                const isCareer = notification?.type?.startsWith('MOBILITY') || notification?.type?.startsWith('CERTIF');
                const isMutuelle = !!(notification as any)['idUser'];
                
                let request$: Observable<any>;
                
                if (isCareer) {
                    request$ = this._httpClient.patch<void>(`${CAREER_API}/${id}/read`, {}, { headers: this.getCareerHeaders() });
                } else {
                    const endpoint = isMutuelle ? `${MUTUELLE_API}/${id}/lire` : `${NOTIF_API}/${id}/lire`;
                    request$ = isMutuelle ? this._httpClient.patch<Notification>(endpoint, {}) : this._httpClient.put<Notification>(endpoint, {});
                }
                
                if (notification.type || isMutuelle || isCareer) {
                    return request$.pipe(
                        map(() => {
                            const updatedNotification = { ...notification, read: true };
                            const index = notifications.findIndex(item => item.id === id);
                            if (index > -1) notifications[index] = updatedNotification;
                            this._notifications.next(notifications);
                            return updatedNotification;
                        }),
                        catchError(() => {
                            // Fallback to localhost if NOTIF_API fails
                            return this._httpClient.patch<any>(`/api/notifications/${id}/lire`, {}).pipe(
                                map(() => {
                                    const index = notifications.findIndex(item => item.id === id);
                                    if (index > -1) notifications[index].read = true;
                                    this._notifications.next(notifications);
                                    return notifications[index] || notification;
                                })
                            );
                        })
                    );
                } else {
                    return this._httpClient.patch<Notification>('api/common/notifications', {
                        id,
                        notification
                    }).pipe(
                        map((updatedNotification: Notification) => {
                            const index = notifications.findIndex(item => item.id === id);
                            if (index > -1) notifications[index] = updatedNotification;
                            this._notifications.next(notifications);
                            return updatedNotification;
                        })
                    );
                }
            })
        );
    }

    /**
     * Delete the notification
     */
    delete(id: string): Observable<boolean> {
        return this.notifications$.pipe(
            take(1),
            switchMap(notifications => {
                const targetNode = notifications.find(n => n.id === id);
                let request$: Observable<any>;

                if (targetNode) {
                    const isCareer = targetNode?.type?.startsWith('MOBILITY') || targetNode?.type?.startsWith('CERTIF');
                    const isMutuelle = !!(targetNode as any)['idUser'];
                    
                    if (isCareer) {
                        request$ = this._httpClient.delete<void>(`${CAREER_API}/${id}`, { headers: this.getCareerHeaders() });
                    } else {
                        const endpoint = isMutuelle ? `${MUTUELLE_API}/${id}` : `${NOTIF_API}/${id}`;
                        request$ = this._httpClient.delete<boolean>(endpoint);
                    }
                    
                    return request$.pipe(
                        map(() => true),
                        catchError(() => {
                            // Fallback to localhost
                            return this._httpClient.delete<void>(`/api/notifications/${id}`).pipe(
                                map(() => true),
                                catchError(() => of(false))
                            );
                        })
                    );
                } else {
                    return this._httpClient.delete<boolean>('api/common/notifications', { params: { id } });
                }
            }),
            map((isDeleted: boolean) => {
                if (isDeleted) {
                    this.notifications$.pipe(take(1)).subscribe(notifs => {
                        const index = notifs.findIndex(item => item.id === id);
                        if (index > -1) {
                            notifs.splice(index, 1);
                            this._notifications.next(notifs);
                        }
                    });
                }
                return isDeleted;
            })
        );
    }

    /**
     * Mark all notifications as read
     */
    markAllAsRead(): Observable<boolean> {
        return this.notifications$.pipe(
            take(1),
            switchMap(notifications => {
                const localUserStr = localStorage.getItem('currentUser');
                if (localUserStr) {
                    try {
                        const localUser = JSON.parse(localUserStr);
                        const userMark$ = this._httpClient.put<void>(`${NOTIF_API}/destinataire/${localUser.id}/lire-tout`, {}).pipe(
                            catchError(() => of(undefined))
                        );
                        const adminMark$ = localUser.role === 'ADMIN'
                            ? this._httpClient.put<void>(`${NOTIF_API}/destinataire/ADMIN/lire-tout`, {}).pipe(
                                catchError(() => of(undefined))
                            )
                            : of(undefined);
                        const careerMark$ = this._httpClient.patch<void>(`${CAREER_API}/mark-all-read`, {}, { headers: this.getCareerHeaders() }).pipe(
                            catchError(() => of(undefined))
                        );
                            
                        return forkJoin([userMark$, adminMark$, careerMark$]).pipe(
                            map(() => {
                                notifications.forEach((notification, index) => {
                                    notifications[index].read = true;
                                });
                                this._notifications.next(notifications);
                                return true;
                            }),
                            catchError(() => {
                                // Fallback
                                return this._httpClient.patch<void>('/api/notifications/tout-lire', {}).pipe(
                                    map(() => {
                                        notifications.forEach((notification, index) => {
                                            notifications[index].read = true;
                                        });
                                        this._notifications.next(notifications);
                                        return true;
                                    })
                                );
                            })
                        );
                    } catch (e) { }
                }

                return this._httpClient.get<boolean>('api/common/notifications/mark-all-as-read').pipe(
                    map((isUpdated: boolean) => {
                        notifications.forEach((notification, index) => {
                            notifications[index].read = true;
                        });
                        this._notifications.next(notifications);
                        return isUpdated;
                    })
                );
            })
        );
    }
}
