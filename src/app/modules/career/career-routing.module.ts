import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CareerListComponent } from './components/career-list/career-list.component';
import { CareerAdminDashboardComponent } from './components/career-admin-dashboard/career-admin-dashboard.component';

const routes: Routes = [
  { path: '', component: CareerListComponent },
  { path: 'admin', component: CareerAdminDashboardComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CareerRoutingModule {}