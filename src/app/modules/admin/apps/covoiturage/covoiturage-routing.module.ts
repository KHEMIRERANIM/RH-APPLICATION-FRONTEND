import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CovoiturageUserComponent } from './user/covoiturage-user.component';
import { CovoiturageAdminComponent } from './admin/covoiturage-admin.component';
import { CovoiturageGuard } from 'app/core/auth/guards/covoiturage.guard';

const routes: Routes = [
  {
    path: '',
    canActivate: [CovoiturageGuard],
    component: CovoiturageUserComponent  // jamais affiché, le guard redirige
  },
  {
    path: 'user',
    component: CovoiturageUserComponent,
    title: 'Covoiturage'
  },
  {
    path: 'admin',
    component: CovoiturageAdminComponent,
    title: 'Gestion Covoiturage - Admin'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CovoiturageRoutingModule { }