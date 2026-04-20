import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

// Angular Material
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

import { TeamAdminComponent } from './team-admin.component';
import { MaterialModule } from 'app/material.module';
import { FuseConfirmationModule } from '@fuse/services/confirmation';

@NgModule({
    declarations: [
        TeamAdminComponent
    ],
    imports: [MaterialModule,
        CommonModule,
        RouterModule.forChild([
            { path: '', component: TeamAdminComponent }
        ]),
        FormsModule,
        MatIconModule,
        MatButtonModule,
        FuseConfirmationModule
    ]
})
export class TeamAdminModule { }
