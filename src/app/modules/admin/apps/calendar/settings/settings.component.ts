import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CalendarService } from '../calendar.service';
import { CalendarSettings } from '../calendar.types';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
    selector: 'calendar-settings',
    templateUrl: './settings.component.html',
    encapsulation: ViewEncapsulation.None
})
export class CalendarSettingsComponent implements OnInit, OnDestroy {
    settingsForm: FormGroup;
    private _unsubscribeAll: Subject<any> = new Subject<any>();

    constructor(
        private _calendarService: CalendarService,
        private _formBuilder: FormBuilder,
        private snackBar: MatSnackBar
    ) { }

    ngOnInit(): void {
        this._calendarService.settings$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((settings) => {
                if (settings) {
                    this.settingsForm = this._formBuilder.group({
                        dateFormat: [settings.dateFormat || 'DD/MM/YYYY', Validators.required],
                        timeFormat: [settings.timeFormat || 'HH:mm', Validators.required],
                        startWeekOn: [settings.startWeekOn || 1, Validators.required]
                    });
                }
            });
    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    saveSettings(): void {
        if (this.settingsForm.valid) {
            const settings: CalendarSettings = this.settingsForm.value;
            this._calendarService.updateSettings(settings).subscribe({
                next: () => {
                    this.snackBar.open('Paramètres sauvegardés', 'Fermer', { duration: 3000 });
                },
                error: (err) => {
                    console.error('Error saving settings', err);
                    this.snackBar.open('Erreur lors de la sauvegarde', 'Fermer', { duration: 3000 });
                }
            });
        }
    }
}
