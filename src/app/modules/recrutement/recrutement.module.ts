import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

// Angular Material
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCardModule } from '@angular/material/card';
import { MatBadgeModule } from '@angular/material/badge';
import { MatCheckboxModule } from '@angular/material/checkbox';

import { FuseAlertModule } from '@fuse/components/alert';

// Routing
import { RecrutementRoutingModule } from './recrutement-routing.module';

// Components
import { OffresListComponent } from './offres/list/offres-list.component';
import { OffreDetailComponent } from './offres/detail/offre-detail.component';
import { CreerOffreComponent } from './offres/creer/creer-offre.component';
import { PostulerComponent } from './candidatures/postuler/postuler.component';
import { MesCandidaturesComponent } from './candidatures/mes-candidatures/mes-candidatures.component';
import { PipelineComponent } from './pipeline/pipeline.component';
import { PlanifierEntretienComponent } from './entretiens/planifier-entretien.component';
import { FeedbackEntretienComponent } from './entretiens/feedback-entretien.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { CalendrierComponent } from './calendrier/calendrier.component';

// ❌ SUPPRIMÉ ICI (IMPORTANT)
// import { CharteComponent } from './charte/charte.component';

// Pipe
import { FilterByStatutPipe } from './pipes/filter-by-statut.pipe';

// ✅ IMPORT MODULE CHARTE
import { CharteModule } from './charte/charte.module';

@NgModule({
  declarations: [
    OffresListComponent,
    OffreDetailComponent,
    CreerOffreComponent,
    PostulerComponent,
    MesCandidaturesComponent,
    PipelineComponent,
    PlanifierEntretienComponent,
    FeedbackEntretienComponent,
    DashboardComponent,
    CalendrierComponent,
    // ❌ SUPPRIMÉ : CharteComponent
    FilterByStatutPipe,
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule,
    RecrutementRoutingModule,

    // Angular Material
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatChipsModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatDialogModule,
    MatExpansionModule,
    MatSlideToggleModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatCardModule,
    MatBadgeModule,
    MatCheckboxModule,

    FuseAlertModule,

    // ✅ AJOUT IMPORTANT
    CharteModule
  ]
})
export class RecrutementModule {}