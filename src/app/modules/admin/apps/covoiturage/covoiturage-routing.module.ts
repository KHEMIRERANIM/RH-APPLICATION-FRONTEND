import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { CovoiturageUserComponent } from './user/covoiturage-user.component';
import { CovoiturageAdminComponent } from './admin/covoiturage-admin.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'user',
    pathMatch: 'full'
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