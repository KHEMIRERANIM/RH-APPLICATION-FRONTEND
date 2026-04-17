import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

// Angular Material
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

import { CareerRoutingModule } from './career-routing.module';

import { CareerListComponent } from './components/career-list/career-list.component';
import { CareerFormComponent } from './components/career-form/career-form.component';
import { MobilityDashboardComponent } from './components/mobility-dashboard/mobility-dashboard.component';
import { MobilityRequestFormComponent } from './components/mobility-request-form/mobility-request-form.component';
import { CareerPlanDashboardComponent } from './components/career-plan-dashboard/career-plan-dashboard.component';
import { CareerPlanFormComponent } from './components/career-plan-form/career-plan-form.component';
import { CareerEmployeesDialogComponent } from './components/career-employees-dialog/career-employees-dialog.component';
import { EmployeeMobilityComponent } from './components/employee-mobility/employee-mobility.component';
import { EmployeePlanComponent } from './components/employee-plan/employee-plan.component';
import { MotivationPreviewDialogComponent } from './components/motivation-preview-dialog/motivation-preview-dialog.component';
import { MotivationAnalysisComponent } from './components/motivation-analysis/motivation-analysis.component';
import { CareerAdminDashboardComponent } from './components/career-admin-dashboard/career-admin-dashboard.component';

@NgModule({
  declarations: [
    CareerListComponent,
    CareerFormComponent,
    MobilityDashboardComponent,
    MobilityRequestFormComponent,
    CareerPlanDashboardComponent,
    CareerPlanFormComponent,
    CareerEmployeesDialogComponent,
    EmployeeMobilityComponent,
    EmployeePlanComponent,
    MotivationPreviewDialogComponent,
    MotivationAnalysisComponent,
    CareerAdminDashboardComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CareerRoutingModule,

    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatCardModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]   // ← Ajouté temporairement
})
export class CareerModule { }