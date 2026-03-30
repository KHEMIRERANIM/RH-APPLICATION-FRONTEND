import { NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { FuseConfirmationService } from './confirmation.service';
import { FuseConfirmationDialogComponent } from './dialog/dialog.component';

@NgModule({
    declarations: [FuseConfirmationDialogComponent],
    imports: [
        CommonModule,
        MatButtonModule,
        MatDialogModule,
        MatIconModule,
    ],
    providers: [FuseConfirmationService]
})
export class FuseConfirmationModule {}