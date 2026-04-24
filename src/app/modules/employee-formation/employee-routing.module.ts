import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FormationsDisponiblesComponent } from './pages/formations-disponibles/formations-disponibles.component';
import { MesFormationsComponent } from './pages/mes-formations/mes-formations.component';
import { FormationResourcesComponent } from './pages/mes-formations/formation-resources.component';

import { FormateurListComponent } from './formateurs/formateur-list.component';
import { MesFormationsFormateurComponent } from './formateur-formations/mes-formations-formateur.component';
import { ParticipantsListComponent } from './components/participants-list/participants-list.component';
import { DocumentsListComponent } from './components/documents-list/documents-list.component';
import { ExamensListComponent } from './components/examens-list/examens-list.component';
import { ExamenFormComponent } from './components/examen-form/examen-form.component';
import { ExamenPasserComponent } from './components/examen-passer/examen-passer.component';
import { ExamenResultatsComponent } from './components/examen-resultats/examen-resultats.component';
import { ExamensEmployeComponent } from './components/examens-employe/examens-employe.component';
import { LayoutComponent } from 'app/layout/layout.component';  // ← Importer LayoutComponent
import { VotesPropositionsComponent } from './components/votes-propositions/votes-propositions.component';
const routes: Routes = [
 {
        path: '',
        component: LayoutComponent,  // ← Utiliser LayoutComponent pour garder la sidebar
        children: [
            { path: '', redirectTo: 'formations', pathMatch: 'full' },
    { path: 'formations', component: FormationsDisponiblesComponent },
    { path: 'mes-inscriptions', component: MesFormationsComponent },
    { path: 'formateurs', component: FormateurListComponent },
    { path: 'mes-formations-formateur', component: MesFormationsFormateurComponent },
    { path: 'formations/:formationId/participants', component: ParticipantsListComponent },
    { path: 'formations/:formationId/examens', component: ExamensListComponent },
    { path: 'formations/:formationId/examens/create', component: ExamenFormComponent },
    { path: 'formations/:formationId/examens/:examenId/edit', component: ExamenFormComponent },
    { path: 'formations/:formationId/documents', redirectTo: 'formations/:formationId/ressources?tab=documents' },
{ path: 'formations/:formationId/examenEmploye', redirectTo: 'formations/:formationId/ressources?tab=examens' },
    { path: 'examens/:examenId/passer', component: ExamenPasserComponent },
    { path: 'examens/:examenId/resultats', component: ExamenResultatsComponent },
    { path: 'formations/:formationId/ressources', component: FormationResourcesComponent },
{ path: 'formations/:formationId/ressources/:titre', component: FormationResourcesComponent },
            { path: 'votes-propositions', component: VotesPropositionsComponent }


]}];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class EmployeeRoutingModule { }