import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, ReplaySubject, forkJoin, of } from 'rxjs';
import { Notification } from 'app/layout/common/notifications/notifications.types';
import { map, switchMap, take, tap, catchError } from 'rxjs/operators';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { getWsTrackingSockJsUrl } from 'src/environments/environment';

const NOTIF_API = 'http://10.188.81.174:8081/api/notifications';

@Injectable({
    providedIn: 'root'
})
export class NotificationsService {
    private _notifications: ReplaySubject<Notification[]> = new ReplaySubject<Notification[]>(1);
    private _stomp?: Client;
    private _stompStarted = false;

    /**
     * Constructor
     */
    constructor(private _httpClient: HttpClient) {
    }

    private mapBackendRow(bn: any): Notification {
        const t = typeof bn.type === 'string' ? bn.type : (bn.type?.name || String(bn.type || ''));
        let title = 'Nouvelle notification';
        if (t === 'DEMANDE_CONFIRMATION') title = 'Demande de réservation';
        else if (t === 'RESERVATION') title = 'Mise à jour réservation';
        else if (t === 'ALTERNATIVES_DISPONIBLES' || t === 'ANNULATION_TRAJET') title = 'Trajet annulé';
        else if (t === 'ACTIVATION_BUS') title = 'Activation bus de réserve';
        let icon = 'heroicons_outline:bell';
        if (t === 'DEMANDE_CONFIRMATION') icon = 'heroicons_outline:question-mark-circle';
        else if (t === 'ALTERNATIVES_DISPONIBLES' || t === 'ANNULATION_TRAJET') icon = 'heroicons_outline:arrow-path';
        else if (t === 'ACTIVATION_BUS') icon = 'heroicons_outline:truck';
        const n: Notification = {
            id: bn.id,
            icon,
            title,
            description: bn.contenu || 'Nouvelle notification système',
            time: bn.dateCreation || new Date().toISOString(),
            read: bn.lu || false,
            type: t,
            reservationId: bn.reservationId,
            trajetId: bn.trajetId,
            trajetAnnuleId: bn.trajetAnnuleId || bn.trajetId,
            expediteurId: bn.expediteurId,
            destinataireId: bn.destinataireId,
            contenu: bn.contenu
        };
        if (t === 'ACTIVATION_BUS') {
            n.link = '/apps/covoiturage/admin';
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
     * @param notification
     */
    addLocalNotification(notification: Notification): void {
        this._notifications.pipe(take(1)).subscribe((current) => {
            // Ensure ID exists
            if (!notification.id) {
                notification.id = 'local-' + Math.random().toString(36).substring(2, 9);
            }
            // Add only if not already present
            if (!current.some(n => n.id === notification.id)) {
                this._notifications.next(this.mergeById([notification], current));
            }
        });
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

            return forkJoin({ user: user$, admin: admin$ }).pipe(
                map(({ user, admin }) => this.mergeById(user, admin)),
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
     *
     * @param notification
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
     *
     * @param id
     * @param notification
     */
    update(id: string, notification: Notification): Observable<Notification> {
        return this.notifications$.pipe(
            take(1),
            switchMap(notifications => {
                if (notification.type) {
                    return this._httpClient.put<Notification>(`${NOTIF_API}/${id}/lire`, {}).pipe(
                        map((backendNotif: any) => {
                            const updatedNotification = { ...notification, read: true };
                            const index = notifications.findIndex(item => item.id === id);
                            notifications[index] = updatedNotification;
                            this._notifications.next(notifications);
                            return updatedNotification;
                        })
                    );
                } else {
                    return this._httpClient.patch<Notification>('api/common/notifications', {
                        id,
                        notification
                    }).pipe(
                        map((updatedNotification: Notification) => {
                            const index = notifications.findIndex(item => item.id === id);
                            notifications[index] = updatedNotification;
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
     *
     * @param id
     */
    delete(id: string): Observable<boolean> {
        return this.notifications$.pipe(
            take(1),
            switchMap(notifications => {
                const targetNode = notifications.find(n => n.id === id);
                let request$: Observable<boolean>;
                
                if (targetNode?.type) {
                    request$ = this._httpClient.delete<boolean>(`${NOTIF_API}/${id}`).pipe(
                        map(() => true),
                        catchError(() => of(false))
                    );
                } else {
                    request$ = this._httpClient.delete<boolean>('api/common/notifications', { params: { id } });
                }

                return request$.pipe(
                    map((isDeleted: boolean) => {
                        const index = notifications.findIndex(item => item.id === id);
                        if (index > -1) {
                            notifications.splice(index, 1);
                            this._notifications.next(notifications);
                        }
                        return isDeleted;
                    })
                );
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
                        return forkJoin([userMark$, adminMark$]).pipe(
                            map(() => {
                                notifications.forEach((notification, index) => {
                                    notifications[index].read = true;
                                });
                                this._notifications.next(notifications);
                                return true;
                            })
                        );
                    } catch (e) {}
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
