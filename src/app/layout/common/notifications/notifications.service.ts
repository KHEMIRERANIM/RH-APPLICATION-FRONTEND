import { Injectable } from '@angular/core';
import { HttpBackend, HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, ReplaySubject, of, throwError } from 'rxjs';
import { catchError, map, switchMap, take, tap } from 'rxjs/operators';
import { Notification } from 'app/layout/common/notifications/notifications.types';

@Injectable({ providedIn: 'root' })
export class NotificationsService {

    private _notifications: ReplaySubject<Notification[]> = new ReplaySubject<Notification[]>(1);
    private apiUrl = 'http://localhost:8081/api/notifications';
    private _http: HttpClient;

    constructor(handler: HttpBackend) {
        this._http = new HttpClient(handler);
    }

    get notifications$(): Observable<Notification[]> {
        return this._notifications.asObservable();
    }

    private getHeaders(): HttpHeaders {
        const token = localStorage.getItem('accessToken');
        return new HttpHeaders({ Authorization: `Bearer ${token || ''}` });
    }

    private toFuse(n: any): Notification {
        return {
            id         : n.id,
            title      : n.title,
            description: n.message,
            time       : new Date(n.createdAt),
            read       : n.read ?? false,
            icon       : this.typeToIcon(n.type),
            link       : this.typeToLink(n.type),
            useRouter  : true
        };
    }

    private typeToIcon(type: string): string {
        const icons: Record<string, string> = {
            MOBILITY_APPROVED: 'heroicons_solid:check-circle',
            MOBILITY_REJECTED: 'heroicons_solid:x-circle',
            MOBILITY_ON_HOLD : 'heroicons_solid:pause-circle',
            CERTIF_VALIDATED : 'heroicons_solid:academic-cap'
        };
        return icons[type] ?? 'heroicons_solid:bell';
    }

    private typeToLink(type: string): string | null {
        if (type?.startsWith('MOBILITY')) return '/apps/carriere';
        if (type?.startsWith('CERTIF'))   return '/apps/carriere';
        return null;
    }

    // ✅ Recharge les notifications — ignore silencieusement 401/403
    getAll(): Observable<Notification[]> {
        return this._http
            .get<any[]>(this.apiUrl, { headers: this.getHeaders() })
            .pipe(
                map(data => data.map(n => this.toFuse(n))),
                tap(notifications => this._notifications.next(notifications)),
                catchError(err => {
                    // ✅ Token absent/expiré — ne pas bloquer l'app
                    if (err.status === 401 || err.status === 403) {
                        this._notifications.next([]);
                        return of([]);
                    }
                    return throwError(() => err);
                })
            );
    }

    markAllAsRead(): Observable<boolean> {
        return this.notifications$.pipe(
            take(1),
            switchMap(notifications =>
                this._http
                    .patch<void>(`${this.apiUrl}/mark-all-read`, {}, { headers: this.getHeaders() })
                    .pipe(
                        map(() => {
                            this._notifications.next(notifications.map(n => ({ ...n, read: true })));
                            return true;
                        }),
                        catchError(() => of(false))
                    )
            )
        );
    }

    update(id: string, notification: Notification): Observable<Notification> {
        return this.notifications$.pipe(
            take(1),
            switchMap(notifications =>
                this._http
                    .patch<void>(`${this.apiUrl}/${id}/read`, {}, { headers: this.getHeaders() })
                    .pipe(
                        map(() => {
                            const index = notifications.findIndex(n => n.id === id);
                            if (index !== -1) {
                                const updated = [...notifications];
                                updated[index] = { ...notifications[index], ...notification };
                                this._notifications.next(updated);
                            }
                            return notification;
                        }),
                        catchError(() => of(notification))
                    )
            )
        );
    }

    delete(id: string): Observable<boolean> {
        return this.notifications$.pipe(
            take(1),
            switchMap(notifications =>
                this._http
                    .delete<void>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() })
                    .pipe(
                        map(() => {
                            this._notifications.next(notifications.filter(n => n.id !== id));
                            return true;
                        }),
                        catchError(() => of(false))
                    )
            )
        );
    }
}