import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, ReplaySubject } from 'rxjs';
import { Notification } from 'app/layout/common/notifications/notifications.types';
import { map, switchMap, take, tap } from 'rxjs/operators';

@Injectable({
    providedIn: 'root'
})
export class NotificationsService
{
    private _notifications: ReplaySubject<Notification[]> = new ReplaySubject<Notification[]>(1);

    constructor(private _httpClient: HttpClient) {}

    get notifications$(): Observable<Notification[]>
    {
        return this._notifications.asObservable();
    }

<<<<<<< HEAD
=======
    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

>>>>>>> daaaf38a49e0403cda1705bb46c92ef6a134f9d3
    getAll(): Observable<Notification[]>
    {
        return this._httpClient.get<any[]>('http://localhost:8081/api/notifications').pipe(
            map(backendNotifs => {
                return backendNotifs.map(bn => ({
                    id: bn.id,
                    icon: bn.type === 'PLACES_LIBEREES' ? 'heroicons_solid:ticket' : 
                          bn.type === 'PRIX_BAISSE' ? 'heroicons_solid:currency-dollar' : 'heroicons_solid:clock',
                    title: bn.titreOffreAvantage,
                    description: bn.message,
                    time: bn.dateCreation,
                    read: bn.lu,
                    link: '/apps/partnerships/mes-favoris',
                    useRouter: true
                }));
            }),
            tap((notifications) => {
                this._notifications.next(notifications);
            })
        );
    }

<<<<<<< HEAD
    pushLocal(notification: Notification): void
    {
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

    removeLocal(id: string): void
    {
        this._notifications.pipe(take(1)).subscribe(current => {
            this._notifications.next(current.filter(n => n.id !== id));
        });
    }

    create(notification: Notification): Observable<Notification>
    {
        return this.notifications$.pipe(
            take(1),
            switchMap(notifications => this._httpClient.post<Notification>('api/common/notifications', {notification}).pipe(
                map((newNotification) => {
                    this._notifications.next([...notifications, newNotification]);
                    return newNotification;
                })
            ))
        );
=======
    create(notification: Notification): Observable<Notification>
    {
        // Not used, mocking response
        return new Observable(observer => observer.next(notification));
>>>>>>> daaaf38a49e0403cda1705bb46c92ef6a134f9d3
    }

    update(id: string, notification: Notification): Observable<Notification>
    {
        return this.notifications$.pipe(
            take(1),
<<<<<<< HEAD
            switchMap(notifications => this._httpClient.patch<Notification>('api/common/notifications', {
                id,
                notification
            }).pipe(
                map((updatedNotification: Notification) => {
                    const index = notifications.findIndex(item => item.id === id);
                    notifications[index] = updatedNotification;
                    this._notifications.next(notifications);
                    return updatedNotification;
=======
            switchMap(notifications => this._httpClient.patch<any>(`http://localhost:8081/api/notifications/${id}/lire`, {}).pipe(
                map(() => {
                    const index = notifications.findIndex(item => item.id === id);
                    notifications[index].read = true;
                    this._notifications.next(notifications);
                    return notifications[index];
>>>>>>> daaaf38a49e0403cda1705bb46c92ef6a134f9d3
                })
            ))
        );
    }

    delete(id: string): Observable<boolean>
    {
        return this.notifications$.pipe(
            take(1),
<<<<<<< HEAD
            switchMap(notifications => this._httpClient.delete<boolean>('api/common/notifications', {params: {id}}).pipe(
                map((isDeleted: boolean) => {
                    const index = notifications.findIndex(item => item.id === id);
                    notifications.splice(index, 1);
                    this._notifications.next(notifications);
                    return isDeleted;
=======
            switchMap(notifications => this._httpClient.delete<void>(`http://localhost:8081/api/notifications/${id}`).pipe(
                map(() => {
                    const index = notifications.findIndex(item => item.id === id);
                    if (index > -1) {
                        notifications.splice(index, 1);
                        this._notifications.next(notifications);
                    }
                    return true;
>>>>>>> daaaf38a49e0403cda1705bb46c92ef6a134f9d3
                })
            ))
        );
    }

    markAllAsRead(): Observable<boolean>
    {
        return this.notifications$.pipe(
            take(1),
<<<<<<< HEAD
            switchMap(notifications => this._httpClient.get<boolean>('api/common/notifications/mark-all-as-read').pipe(
                map((isUpdated: boolean) => {
=======
            switchMap(notifications => this._httpClient.patch<void>('http://localhost:8081/api/notifications/tout-lire', {}).pipe(
                map(() => {
>>>>>>> daaaf38a49e0403cda1705bb46c92ef6a134f9d3
                    notifications.forEach((notification, index) => {
                        notifications[index].read = true;
                    });
                    this._notifications.next(notifications);
<<<<<<< HEAD
                    return isUpdated;
=======
                    return true;
>>>>>>> daaaf38a49e0403cda1705bb46c92ef6a134f9d3
                })
            ))
        );
    }
}
