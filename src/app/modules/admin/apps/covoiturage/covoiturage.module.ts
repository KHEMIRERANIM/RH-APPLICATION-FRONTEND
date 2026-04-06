// src/app/modules/admin/apps/covoiturage/covoiturage.module.ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

import { CovoiturageUserComponent } from './user/covoiturage-user.component';
import { CovoiturageAdminComponent } from './admin/covoiturage-admin.component';
import { VehicleModalComponent } from './components/vehicle-modal/vehicle-modal.component';

import { CovoiturageRoutingModule } from './covoiturage-routing.module';
import { NavetteTrackingComponent } from './user/navette-tracking/navette-tracking.component';
import { ChauffeurTrackingComponent } from './user/chauffeur-tracking/chauffeur-tracking.component';
import { UserAdvantagesComponent } from './user/avantages/user-advantages.component';

@NgModule({
  declarations: [
    CovoiturageUserComponent,
    CovoiturageAdminComponent,
    NavetteTrackingComponent,
    VehicleModalComponent,
    ChauffeurTrackingComponent,
    UserAdvantagesComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatIconModule,
    CovoiturageRoutingModule,
  ],
  exports: [
    CovoiturageUserComponent
  ]
})
export class CovoiturageModule { }