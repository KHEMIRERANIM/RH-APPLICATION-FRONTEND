import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

// Import du composant analyse
import { MotivationAnalysisComponent } from './components/motivation-analysis/motivation-analysis.component';

import { CareerRoutingModule } from './career-routing.module';

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
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

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
    MotivationAnalysisComponent
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
    MatSlideToggleModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]   // ← Cette ligne est obligatoire ici
})
export class CareerModule {}