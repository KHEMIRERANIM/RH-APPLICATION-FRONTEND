import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { SharedModule } from 'app/shared/shared.module';
import { HrAppComponent } from './hr-app.component';
import { hrAppsRoutes } from './hr-apps-routing';

@NgModule({
    declarations: [
        HrAppComponent
    ],
    imports     : [
        RouterModule.forChild(hrAppsRoutes),
        MatButtonModule,
        MatIconModule,
        SharedModule
    ]
})
export class HrAppsModule {}
