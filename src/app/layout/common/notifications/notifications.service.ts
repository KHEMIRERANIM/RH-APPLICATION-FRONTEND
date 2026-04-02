import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, ReplaySubject, of } from 'rxjs';
import { Notification } from 'app/layout/common/notifications/notifications.types';
import { map, switchMap, take, tap, catchError } from 'rxjs/operators';

@Injectable({
    providedIn: 'root'
})
export class NotificationsService {
    private _notifications: ReplaySubject<Notification[]> = new ReplaySubject<Notification[]>(1);

    /**
     * Constructor
     */
    constructor(private _httpClient: HttpClient) {
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
            return this._httpClient.get<any[]>(`http://10.90.222.174:8081/api/notifications/destinataire/${localUser.id}/non-lues`).pipe(
                map(backendNotifs => backendNotifs.map(bn => ({
                    id: bn.id,
                    icon: bn.type === 'DEMANDE_CONFIRMATION' ? 'heroicons_outline:question-mark-circle' : 'heroicons_outline:bell',
                    title: bn.type === 'DEMANDE_CONFIRMATION' ? 'Demande de réservation' : (bn.type === 'RESERVATION' ? 'Mise à jour réservation' : 'Nouvelle notification'),
                    description: bn.contenu || 'Nouvelle notification système',
                    time: bn.dateCreation || new Date().toISOString(),
                    read: bn.lu || false,
                    type: bn.type,
                    reservationId: bn.reservationId,
                    trajetId: bn.trajetId,
                    expediteurId: bn.expediteurId,
                    destinataireId: bn.destinataireId,
                    contenu: bn.contenu
                }))),
                catchError((error) => {
                    console.error("ERREUR DE CHARGEMENT BACKEND NOTIFICATIONS: Veuillez vérifier que votre NotificationController existe et répond bien sur l'URL: http://10.90.222.174:8081/api/notifications/employe/{id}/non-lues", error);
                    return of([]);
                }),
                tap((notifications) => {
                    this._notifications.next(notifications);
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

                    // Update the notifications with the new notification
                    this._notifications.next([...notifications, newNotification]);

                    // Return the new notification from observable
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
                // If backend notification, assume we can hit the marquer-lu endpoint
                if (notification.type) {
                    return this._httpClient.put<Notification>(`http://10.90.222.174:8081/api/notifications/${id}/lire`, {}).pipe(
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
                    request$ = this._httpClient.delete<boolean>(`http://10.90.222.174:8081/api/notifications/${id}`).pipe(
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
                        return this._httpClient.put<boolean>(`http://10.90.222.174:8081/api/notifications/destinataire/${localUser.id}/lire-tout`, {}).pipe(
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
                
                // Fallback for mock
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
