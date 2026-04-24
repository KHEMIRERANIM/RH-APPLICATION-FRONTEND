import { Component, Inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MobilityService } from '../../services/mobility.service';
import { Career } from '../../models/career.model';

@Component({
  selector: 'app-mobility-request-form',
  templateUrl: './mobility-request-form.component.html',
  styleUrls: ['./mobility-request-form.component.scss']
})
export class MobilityRequestFormComponent implements OnInit {

  form!: FormGroup;
  isSaving      = false;
  formSubmitted = false;
  careers: Career[] = [];

  selectedCareer: Career | null = null;

  selectedFile: File | null = null;
  fileError    = '';
  isDragging   = false;

  constructor(
    private fb:              FormBuilder,
    private mobilityService: MobilityService,
    private snackBar:        MatSnackBar,
    private cdr:             ChangeDetectorRef,
    public  dialogRef:       MatDialogRef<MobilityRequestFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { careers: Career[]; preselectedCareerId?: string }
  ) {}

  ngOnInit(): void {
    this.careers = this.data?.careers || [];
    this.dialogRef.updateSize('600px');

    this.form = this.fb.group({
      targetCareerId: [this.data?.preselectedCareerId || '', Validators.required]
    });

    // ✅ trim() pour éviter les espaces invisibles + detectChanges() pour forcer le rendu
    if (this.data?.preselectedCareerId) {
      const pid = this.data.preselectedCareerId.trim();
      this.selectedCareer = this.careers.find(c => c.id?.trim() === pid) ?? null;
      this.cdr.detectChanges();
    }
  }

  onCareerChange(): void {
    const id = this.form.get('targetCareerId')?.value;
    this.selectedCareer = this.careers.find(c => c.id === id) ?? null;
    this.cdr.detectChanges();
  }

  // ── Fichier ───────────────────────────────────────────────────────────
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) this.processFile(input.files[0]);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
    const file = event.dataTransfer?.files[0];
    if (file) this.processFile(file);
  }

  processFile(file: File): void {
    this.fileError = '';
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (!allowedTypes.includes(file.type)) {
      this.fileError = 'Format non supporté. Utilisez PDF, DOC ou DOCX.';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.fileError = 'Fichier trop volumineux. Maximum 5 MB.';
      return;
    }
    this.selectedFile = file;
  }

  removeFile(event: MouseEvent): void {
    event.stopPropagation();
    this.selectedFile = null;
    this.fileError    = '';
  }

  getFileIcon(): string {
    if (!this.selectedFile) return '📄';
    if (this.selectedFile.type === 'application/pdf') return '📕';
    return '📝';
  }

  getFileSize(): string {
    if (!this.selectedFile) return '';
    const kb = this.selectedFile.size / 1024;
    return kb < 1024 ? `${kb.toFixed(1)} KB` : `${(kb / 1024).toFixed(1)} MB`;
  }

  // ── Soumission ────────────────────────────────────────────────────────
  save(): void {
    this.formSubmitted = true;
    if (this.form.invalid || !this.selectedFile) return;
    this.isSaving = true;

    const formData = new FormData();
    formData.append('targetCareerId', this.form.value.targetCareerId);
    formData.append('motivationFile', this.selectedFile);

    this.mobilityService.submitWithFile(formData).subscribe({
      next: () => {
        this.snackBar.open('Demande soumise !', 'OK', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.isSaving = false;
        this.snackBar.open(err.error?.message || 'Erreur', 'Fermer', { duration: 4000 });
      }
    });
  }

  cancel(): void { this.dialogRef.close(false); }
}