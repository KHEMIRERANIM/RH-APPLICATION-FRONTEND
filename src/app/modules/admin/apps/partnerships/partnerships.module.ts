import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxModule } from '@angular/material/checkbox';

// Fuse
import { SharedModule } from 'app/shared/shared.module';
import { FuseCardModule } from '@fuse/components/card';

// Components
import { CatalogueComponent } from './components/catalogue/catalogue.component';
import { OffreDetailDialogComponent } from './components/offre-detail-dialog/offre-detail-dialog.component';
import { MesReservationsComponent } from './components/mes-reservations/mes-reservations.component';
import { MesFavorisComponent } from './components/mes-favoris/mes-favoris.component';
import { AdminDashboardComponent } from './components/admin/admin-dashboard.component';
import { PartenaireFormComponent } from './components/admin/partenaire-form/partenaire-form.component';
import { OffreFormComponent } from './components/admin/offre-form/offre-form.component';
import { ConfirmDialogComponent } from './components/admin/confirm-dialog/confirm-dialog.component';

// Service
import { PartnershipsService } from './services/partnerships.service';

// Graphs
import { BaseChartDirective } from 'ng2-charts';

// Routing
import { partnershipsRoutes } from './partnerships-routing';

// Stats Component
import { StatAvantageComponent } from './components/stat-avantage/stat-avantage.component';

@NgModule({
    declarations: [
        CatalogueComponent,
        OffreDetailDialogComponent,
        MesReservationsComponent,
        MesFavorisComponent,
        AdminDashboardComponent,
        PartenaireFormComponent,
        OffreFormComponent,
        ConfirmDialogComponent,
        StatAvantageComponent
    ],
    imports: [
        RouterModule.forChild(partnershipsRoutes),
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        SharedModule,
        FuseCardModule,
        // Material
        MatIconModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatTabsModule,
        MatTableModule,
        MatPaginatorModule,
        MatSortModule,
        MatDialogModule,
        MatSlideToggleModule,
        MatChipsModule,
        MatTooltipModule,
        MatProgressBarModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatProgressSpinnerModule,
        MatBadgeModule,
        MatMenuModule,
        MatDividerModule,
        MatSnackBarModule,
        MatRadioModule,
        MatCheckboxModule,
        BaseChartDirective
    ],
    providers: [
        PartnershipsService
    ]
})
export class PartnershipsModule { }
