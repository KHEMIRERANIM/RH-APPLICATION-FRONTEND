import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { RestaurantRoutingModule } from './restaurant-routing.module';
import { MenusComponent } from './pages/menus/menus.component';
import { PlatsComponent } from './pages/plats/plats.component';
import { CommandesComponent } from './pages/commandes/commandes.component';
import { AvisComponent } from './pages/avis/avis.component';
import { RestaurantComponent } from './restaurant/restaurant.component';
import { RestaurantMiniPanierComponent } from './restaurant-mini-panier/restaurant-mini-panier.component';

@NgModule({
  declarations: [
    MenusComponent,
    PlatsComponent,
    CommandesComponent,
    AvisComponent,
    RestaurantComponent,
    RestaurantMiniPanierComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    HttpClientModule,
    RestaurantRoutingModule
  ]
})
export class RestaurantModule { }
