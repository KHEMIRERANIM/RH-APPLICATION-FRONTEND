// src/app/modules/admin/apps/covoiturage/covoiturage.module.ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

import { CovoiturageUserComponent } from './user/covoiturage-user.component';
import { CovoiturageAdminComponent } from './admin/covoiturage-admin.component';
import { VehicleModalComponent } from './components/vehicle-modal/vehicle-modal.component';

import { CovoiturageRoutingModule } from './covoiturage-routing.module';

@NgModule({
  declarations: [
    CovoiturageUserComponent,
    CovoiturageAdminComponent,
    VehicleModalComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatIconModule,
    CovoiturageRoutingModule
  ],
  exports: [
    CovoiturageUserComponent
  ]
})
export class CovoiturageModule { }