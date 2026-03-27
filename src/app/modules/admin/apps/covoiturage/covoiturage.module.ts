// src/app/modules/admin/apps/covoiturage/covoiturage.module.ts
import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  LucideMapPin,
  LucideClock,
  LucideUsers,
  LucideMessageCircle,
  LucideCheckCircle,
  LucideGift,
  LucideTrendingUp
} from '@lucide/angular';

import { CovoiturageUserComponent } from './user/covoiturage-user.component';
import { CovoiturageAdminComponent } from './admin/covoiturage-admin.component';

import { CovoiturageRoutingModule } from './covoiturage-routing.module';

@NgModule({
  declarations: [
    CovoiturageUserComponent,
    CovoiturageAdminComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    CovoiturageRoutingModule,

    // Icons Lucide
    LucideMapPin,
    LucideClock,
    LucideUsers,
    LucideMessageCircle,
    LucideCheckCircle,
    LucideGift,
    LucideTrendingUp
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],   // ← AJOUTE CETTE LIGNE
  exports: [
    CovoiturageUserComponent
  ]
})
export class CovoiturageModule { }