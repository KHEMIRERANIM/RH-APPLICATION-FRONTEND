export interface Calendar {
    id: string;
    title: string;
    color: string;
    visible?: boolean;
}

export interface CalendarEvent {
    id: string;
    title: string;
    start: Date;
    end: Date;
    description?: string;
    calendarId: string;
    allDay?: boolean;
    color?: string;
    recurrence?: any;
    isFirstInstance?: boolean;
}

export type CalendarEventEditMode = 'single' | 'future' | 'all';

export interface CalendarSettings {
    startWeekOn: number;
    dateFormat: string;
    timeFormat: string;
}

export interface CalendarWeekday {
    name: string;
    short: string;
}
