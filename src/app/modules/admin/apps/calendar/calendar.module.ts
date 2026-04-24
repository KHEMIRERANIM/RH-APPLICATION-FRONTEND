import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { BaseChartDirective } from 'ng2-charts';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FullCalendarModule } from '@fullcalendar/angular';
import { FuseDateRangeModule } from '@fuse/components/date-range';
import { CalendarComponent } from './calendar.component';
import { CalendarSettingsComponent } from './settings/settings.component';
import { CalendarSidebarComponent } from './sidebar/sidebar.component';
import { calendarRoutes } from './calendar.routing';
import { SharedSentimentModule } from '../../../../shared/sentiment.module';
import { CalendarService } from './calendar.service';


@NgModule({
    declarations: [
        CalendarComponent,
        CalendarSettingsComponent,
        CalendarSidebarComponent,
    ],
    imports: [
        CommonModule,
        SharedSentimentModule,
        ReactiveFormsModule,
        MatIconModule,
        FormsModule,
        RouterModule.forChild(calendarRoutes),
        MatButtonModule,
        MatCheckboxModule,
        MatDatepickerModule,
        BaseChartDirective,
        MatDialogModule,
        MatDividerModule,
        MatFormFieldModule,
        MatInputModule,
        MatMenuModule,
        MatSelectModule,
        MatSidenavModule,
        MatTooltipModule,
        MatSnackBarModule,
        MatProgressSpinnerModule,
        FullCalendarModule,
        FuseDateRangeModule
    ],
     providers: [
       
        provideCharts(withDefaultRegisterables()) ,
        CalendarService // ✅ Ajouter ceci
    ]
})
export class CalendarModule { }