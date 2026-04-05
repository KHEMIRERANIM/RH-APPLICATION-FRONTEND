import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MobilityRequest } from '../../models/mobility.model';
import { MobilityService } from '../../services/mobility.service';

@Component({
  selector: 'app-motivation-preview-dialog',
  templateUrl: './motivation-preview-dialog.component.html'
})
export class MotivationPreviewDialogComponent implements OnInit {

  pdfUrl: SafeResourceUrl | null = null;
  isLoading = true;

  constructor(
    public dialogRef: MatDialogRef<MotivationPreviewDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public request: MobilityRequest,
    private mobilityService: MobilityService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {

    if (!this.request?.id) {
      this.isLoading = false;
      return;
    }

    this.isLoading = true;

    this.mobilityService.getPreview(this.request.id).subscribe({
      next: (blob: Blob) => {

        const file = new Blob([blob], { type: 'application/pdf' });
        const url = URL.createObjectURL(file);
        

        this.pdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('PDF ERROR:', err);
        this.isLoading = false;
      }
    });
  }

  download(): void {

    this.mobilityService.downloadFile(this.request.id).subscribe({
      next: (blob: Blob) => {

        const fileName = this.request.motivationFileName || 'motivation.pdf';
        const url = window.URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();

        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('DOWNLOAD ERROR:', err);
      }
    });
  }

  close(): void {
    this.dialogRef.close();
  }
}