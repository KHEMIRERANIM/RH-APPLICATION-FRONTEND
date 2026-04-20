import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CovoiturageUserComponent } from './user/covoiturage-user.component';
import { CovoiturageAdminComponent } from './admin/covoiturage-admin.component';
import { ChauffeurTrackingComponent } from './user/chauffeur-tracking/chauffeur-tracking.component';
import { CovoiturageGuard } from 'app/core/auth/guards/covoiturage.guard';
import { UserAdvantagesComponent } from './user/avantages/user-advantages.component';

const routes: Routes = [
  {
    path: '',
    canActivate: [CovoiturageGuard],
    component: CovoiturageUserComponent  // jamais affiché, le guard redirige
  },
  {
    path: 'user',
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: CovoiturageUserComponent, title: 'Covoiturage' },
      { path: 'recompense', component: UserAdvantagesComponent, title: 'Récompenses' }
    ]
  },
  {
    path: 'admin',
    component: CovoiturageAdminComponent,
    title: 'Gestion Covoiturage - Admin'
  },
  {
    path: 'chauffeur',
    component: ChauffeurTrackingComponent,
    title: 'Interface Chauffeur'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CovoiturageRoutingModule { }