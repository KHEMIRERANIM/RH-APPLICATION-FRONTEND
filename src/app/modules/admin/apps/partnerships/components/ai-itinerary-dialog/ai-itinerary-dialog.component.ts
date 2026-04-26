import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AiItineraryResponse } from '../../services/partnerships.service';

@Component({
    selector: 'app-ai-itinerary-dialog',
    templateUrl: './ai-itinerary-dialog.component.html',
    styleUrls: ['./ai-itinerary-dialog.component.scss']
})
export class AiItineraryDialogComponent {

    constructor(
        public dialogRef: MatDialogRef<AiItineraryDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { itinerary: AiItineraryResponse, title: string }
    ) {}

    fermer(): void {
        this.dialogRef.close();
    }
}
