import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, switchMap, take, tap } from 'rxjs/operators';
import { Moment } from 'moment';
import { Calendar, CalendarEvent, CalendarEventEditMode, CalendarSettings, CalendarWeekday } from './calendar.types';

@Injectable({
    providedIn: 'root'
})
export class CalendarService {
    private _calendars: BehaviorSubject<Calendar[] | null> = new BehaviorSubject(null);
    private _events: BehaviorSubject<CalendarEvent[] | null> = new BehaviorSubject(null);
    private _settings: BehaviorSubject<CalendarSettings | null> = new BehaviorSubject(null);
    private _weekdays: BehaviorSubject<CalendarWeekday[] | null> = new BehaviorSubject(null);

    constructor(private _httpClient: HttpClient) { }

    // Getters avec $ pour les observables (comme utilisé dans le composant)
    get calendars$(): Observable<Calendar[]> {
        return this._calendars.asObservable();
    }

    get events$(): Observable<CalendarEvent[]> {
        return this._events.asObservable();
    }

    get settings$(): Observable<CalendarSettings> {
        return this._settings.asObservable();
    }

    get weekdays$(): Observable<CalendarWeekday[]> {
        return this._weekdays.asObservable();
    }

    // Méthodes API
    getCalendars(): Observable<Calendar[]> {
        return this._httpClient.get<Calendar[]>('api/apps/calendar/calendars').pipe(
            tap((response) => {
                this._calendars.next(response);
            })
        );
    }

    getEvents(start: Moment, end: Moment, replace: boolean = false): Observable<CalendarEvent[]> {
        return this._httpClient.get<CalendarEvent[]>('api/apps/calendar/events', {
            params: {
                start: start.toISOString(true),
                end: end.toISOString(true)
            }
        }).pipe(
            switchMap(response => this._events.pipe(
                take(1),
                map((events) => {
                    if (replace) {
                        this._events.next(response);
                    } else {
                        events = events || [];
                        this._events.next([...events, ...response]);
                    }
                    return response;
                })
            ))
        );
    }

    addEvent(event: CalendarEvent): Observable<CalendarEvent> {
        return this._httpClient.post<CalendarEvent>('api/apps/calendar/event', { event }).pipe(
            tap((addedEvent) => {
                const events = this._events.value || [];
                this._events.next([...events, addedEvent]);
            })
        );
    }

    updateEvent(id: string, event: CalendarEvent): Observable<CalendarEvent> {
        return this._httpClient.patch<CalendarEvent>('api/apps/calendar/event', { id, event }).pipe(
            tap((updatedEvent) => {
                const events = this._events.value || [];
                const index = events.findIndex(e => e.id === id);
                if (index !== -1) {
                    events[index] = updatedEvent;
                    this._events.next([...events]);
                }
            })
        );
    }

    deleteEvent(id: string): Observable<void> {
        return this._httpClient.delete<void>('api/apps/calendar/event', { params: { id } }).pipe(
            tap(() => {
                const events = this._events.value || [];
                this._events.next(events.filter(e => e.id !== id));
            })
        );
    }

    getSettings(): Observable<CalendarSettings> {
        return this._httpClient.get<CalendarSettings>('api/apps/calendar/settings').pipe(
            tap((response) => {
                this._settings.next(response);
            })
        );
    }

    updateSettings(settings: CalendarSettings): Observable<CalendarSettings> {
        return this._httpClient.patch<CalendarSettings>('api/apps/calendar/settings', { settings }).pipe(
            tap((updatedSettings) => {
                this._settings.next(updatedSettings);
            })
        );
    }

    getWeekdays(): Observable<CalendarWeekday[]> {
        return this._httpClient.get<CalendarWeekday[]>('api/apps/calendar/weekdays').pipe(
            tap((response) => {
                this._weekdays.next(response);
            })
        );
    }
}
