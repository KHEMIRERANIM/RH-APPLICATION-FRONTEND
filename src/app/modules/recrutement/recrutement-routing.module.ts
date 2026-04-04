import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { OffresListComponent } from './offres/list/offres-list.component';
import { OffreDetailComponent } from './offres/detail/offre-detail.component';
import { CreerOffreComponent } from './offres/creer/creer-offre.component';
import { PostulerComponent } from './candidatures/postuler/postuler.component';
import { MesCandidaturesComponent } from './candidatures/mes-candidatures/mes-candidatures.component';
import { PipelineComponent } from './pipeline/pipeline.component';
import { PlanifierEntretienComponent } from './entretiens/planifier-entretien.component';
import { FeedbackEntretienComponent } from './entretiens/feedback-entretien.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { CharteComponent } from './charte/charte.component';

const routes: Routes = [
  { path: '', redirectTo: 'offres', pathMatch: 'full' },
  { path: 'offres', component: OffresListComponent },
  { path: 'offres/:id', component: OffreDetailComponent },
  { path: 'postuler/:offreId', component: PostulerComponent },
  { path: 'mes-candidatures', component: MesCandidaturesComponent },
  { path: 'admin/dashboard', component: DashboardComponent },
  { path: 'admin/offres/creer', component: CreerOffreComponent },
  { path: 'admin/offres', component: OffresListComponent },
  { path: 'admin/pipeline/:offreId', component: PipelineComponent },
  { path: 'admin/entretiens/modifier/:id', component: PlanifierEntretienComponent },
  { path: 'admin/entretiens', component: PlanifierEntretienComponent },
  { path: 'admin/entretiens/planifier', component: PlanifierEntretienComponent },
  { path: 'admin/entretiens/:id/feedback', component: FeedbackEntretienComponent },
  { path: 'charte/:candidatureId', component: CharteComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RecrutementRoutingModule {}