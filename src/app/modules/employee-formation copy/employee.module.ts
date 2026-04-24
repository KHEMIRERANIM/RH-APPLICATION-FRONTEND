// src/app/modules/employee/employee.module.ts
import { NgModule } from '@angular/core';
import { CommonModule, DatePipe, SlicePipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';

// Angular Material Modules - AJOUTER TOUS LES MODULES NÉCESSAIRES
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDividerModule } from '@angular/material/divider';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { ExamensEmployeComponent } from './components/examens-employe/examens-employe.component';

import { AvisFormationComponent } from './components/avis-formation/avis-formation.component';

import { EmployeeRoutingModule } from './employee-routing.module';
import { FormationsDisponiblesComponent } from './pages/formations-disponibles/formations-disponibles.component';
import { MesFormationsComponent } from './pages/mes-formations/mes-formations.component';
import { FormateurListComponent } from './formateurs/formateur-list.component';
import { FormateurFormComponent } from './formateurs/formateur-form.component';
import { EmployeService } from './services/employe.service';
import { MesFormationsFormateurComponent } from './formateur-formations/mes-formations-formateur.component';
import { StripePaymentComponent } from './components/Payment/stripe-payment.component';
import { BuyPointsDialogComponent } from './components/Payment/buy-points-dialog.component';

import { FormateurService } from './formateurs/formateur.service';
import { ParticipantService } from './services/participant.service';
import { DocumentService } from './services/document.service';
import { ExamenService } from './services/examen.service';
import { FormationResourcesComponent } from './pages/mes-formations/formation-resources.component';
// Composants
import { ParticipantsListComponent } from './components/participants-list/participants-list.component';
import { ParticipantValidationComponent } from './components/participant-validation/participant-validation.component';
import { DocumentsListComponent } from './components/documents-list/documents-list.component';
import { DocumentUploadComponent } from './components/document-upload/document-upload.component';
import { ExamensListComponent } from './components/examens-list/examens-list.component';
import { ExamenFormComponent } from './components/examen-form/examen-form.component';
import { ExamenPasserComponent } from './components/examen-passer/examen-passer.component';
import { ExamenResultatsComponent } from './components/examen-resultats/examen-resultats.component';
import { ExamenQuestionComponent } from './components/examen-question/examen-question.component';
import { SentimentAnalysisComponent } from './components/analyse-de-sentiment/sentiment-analysis.component';
import { SharedSentimentModule } from '../../shared/sentiment.module';
import { VoiceRecorderComponent } from './components/voice-recorder/voice-recorder.component';
import { ChatbotService } from './services/chatbot.service';

import { FormationChatbotComponent } from './components/chatbot/formation-chatbot.component';

import { FeedbackIaDialogComponent } from './components/feedback-ia-dialog/feedback-ia-dialog.component';

@NgModule({
    declarations: [
        FormationsDisponiblesComponent,
          FeedbackIaDialogComponent, 
        MesFormationsComponent,
        FormateurListComponent,
        VoiceRecorderComponent,  
            FormationChatbotComponent,
                    FormationResourcesComponent,

        ExamensEmployeComponent,
 StripePaymentComponent ,
        FormateurFormComponent,
        MesFormationsFormateurComponent,
        ParticipantsListComponent,
        ParticipantValidationComponent,
        DocumentsListComponent,
        DocumentUploadComponent,
        ExamensListComponent,
        ExamenFormComponent,
        ExamenPasserComponent,
        AvisFormationComponent,
            BuyPointsDialogComponent,
        ExamenResultatsComponent,
        ExamenQuestionComponent 
    ],
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        RouterModule,
        HttpClientModule,
        EmployeeRoutingModule,
        
        SharedSentimentModule,  // ✅ Importer le module partagé
        MatProgressBarModule,
        MatSnackBarModule,
        MatProgressSpinnerModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatButtonModule,
        MatIconModule,
        MatTableModule,
        MatPaginatorModule,
        MatSortModule,
        MatChipsModule,
        MatTooltipModule,
        MatCardModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatTabsModule,
        MatDividerModule,
        MatBadgeModule,
        MatMenuModule
    ],
    providers: [
        FormateurService,
        EmployeService,
        ParticipantService,
            ChatbotService,
        DocumentService,
        ExamenService,
        DatePipe,
        SlicePipe
    ],
    exports: [
        ParticipantsListComponent,
        DocumentsListComponent,
        ExamensListComponent
    ]
})
export class EmployeeModule { }