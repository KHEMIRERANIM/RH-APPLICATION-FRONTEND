import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RestaurantComponent } from './restaurant/restaurant.component';
import { MenusComponent } from './pages/menus/menus.component';
import { PlatsComponent } from './pages/plats/plats.component';
import { CommandesComponent } from './pages/commandes/commandes.component';
import { AvisComponent } from './pages/avis/avis.component';

const routes: Routes = [
  {
    path: '',
    component: RestaurantComponent,
    children: [
      { path: 'menus', component: MenusComponent },
      { path: 'plats', component: PlatsComponent },
      { path: 'commandes', component: CommandesComponent },
      { path: 'avis', component: AvisComponent },
      { path: '', redirectTo: 'menus', pathMatch: 'full' } // page par défaut
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RestaurantRoutingModule {}
