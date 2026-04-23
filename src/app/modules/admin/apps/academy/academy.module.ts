import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatDialogModule } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { FuseFindByKeyPipeModule } from '@fuse/pipes/find-by-key';
import { SharedModule } from 'app/shared/shared.module';
import { academyRoutes } from 'app/modules/admin/apps/academy/academy.routing';
import { AcademyComponent } from 'app/modules/admin/apps/academy/academy.component';
import { AcademyDashboardComponent } from 'app/modules/admin/apps/academy/dashboard/dashboard.component';
import { CreateBulletinDialogComponent } from './dashboard/dialogs/create-bulletin-dialog.component';
import { ValidateCongeDialogComponent } from './dashboard/dialogs/validate-conge-dialog.component';
import { BulletinDetailDialogComponent } from './dashboard/dialogs/bulletin-detail-dialog.component';
import { SoldeCongeDialogComponent } from './dashboard/dialogs/solde-conge-dialog.component';
import { ConfirmDialogComponent } from './dashboard/dialogs/confirm-dialog.component';
import { EditBulletinDialogComponent } from './dashboard/dialogs/edit-bulletin-dialog.component';
import { EmployeeComponent } from './employee/employee.component';
import { NewDemandeDialogComponent } from './employee/dialogs/new-demande-dialog.component';
import { AcademyRedirectComponent } from './redirect.component';
import { EditDemandeDialogComponent } from './employee/dialogs/edit-demande-dialog.component';
import { ConfirmDeleteDialogComponent } from './employee/dialogs/confirm-delete-dialog.component';
import { ChatbotComponent } from './chatbot/chatbot.component';

@NgModule({
    declarations: [
        AcademyComponent,
        AcademyDashboardComponent,
        CreateBulletinDialogComponent,
        ValidateCongeDialogComponent,
        BulletinDetailDialogComponent,
        SoldeCongeDialogComponent,
        ChatbotComponent,
        ConfirmDialogComponent,
        EditDemandeDialogComponent,
        EditBulletinDialogComponent,
        EmployeeComponent,                    // ← Ajouté
        NewDemandeDialogComponent,
        AcademyRedirectComponent,  
         ConfirmDeleteDialogComponent,
    ],
    imports     : [
        RouterModule.forChild(academyRoutes),
        MatButtonModule,
        MatFormFieldModule,
        MatIconModule,                        // ← Vérifiez que c'est bien présent
        MatInputModule,
        MatProgressBarModule,
        MatSelectModule,
        MatSidenavModule,
        MatSlideToggleModule,
        MatTooltipModule,
        FuseFindByKeyPipeModule,
        SharedModule,
        MatTabsModule,
        MatTableModule,
        MatDialogModule,
        MatCardModule,
        MatDatepickerModule,                  // ← Ajouté
        MatNativeDateModule                   // ← Ajouté
    ]
})
export class AcademyModule {}