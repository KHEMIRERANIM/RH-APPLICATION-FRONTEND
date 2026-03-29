import { Component, OnInit, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CareerService } from '../../services/career.service';
import { Career, CareerDomain, CareerLevel } from '../../models/career.model';

@Component({
  selector: 'app-career-form',
  templateUrl: './career-form.component.html',
  styleUrls: ['./career-form.component.scss']
})
export class CareerFormComponent implements OnInit {

  form!: FormGroup;
  isEdit = false;
  isSaving = false;
  skillInput = '';

  domains = Object.values(CareerDomain);
  levels = Object.values(CareerLevel);

  domainLabels: Record<CareerDomain, string> = {
    [CareerDomain.IT]: 'Informatique',
    [CareerDomain.FINANCE]: 'Finance',
    [CareerDomain.RH]: 'Ressources Humaines',
    [CareerDomain.MARKETING]: 'Marketing',
    [CareerDomain.LEGAL]: 'Juridique',
    [CareerDomain.OPERATIONS]: 'Opérations',
    [CareerDomain.SALES]: 'Commercial',
    [CareerDomain.ENGINEERING]: 'Ingénierie',
    [CareerDomain.HEALTH]: 'Santé',
    [CareerDomain.EDUCATION]: 'Éducation'
  };

  constructor(
    private fb: FormBuilder,
    private careerService: CareerService,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<CareerFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Career | null
  ) {}

  ngOnInit(): void {
    this.isEdit = !!this.data;

    // ✅ Forcer la largeur du dialog depuis le composant
    this.dialogRef.updateSize('620px');

    this.form = this.fb.group({
      title:                [this.data?.title || '',        [Validators.required, Validators.minLength(3)]],
      description:          [this.data?.description || ''],
      level:                [this.data?.level || '',         Validators.required],
      domain:               [this.data?.domain || '',        Validators.required],
      requiredSkills:       [this.data?.requiredSkills || []],
      departement:          [this.data?.departement || ''],
      poste:                [this.data?.poste || ''],
      salaryMin:            [this.data?.salaryMin || null],
      salaryMax:            [this.data?.salaryMax || null],
      isRemoteFriendly:     [this.data?.isRemoteFriendly || false],
      isAccessibleForDisabled: [this.data?.isAccessibleForDisabled || false]
    });
  }

  get skills(): string[] {
    return this.form.get('requiredSkills')?.value || [];
  }

  addSkill(): void {
    const skill = this.skillInput.trim();
    if (!skill) return;
    const current = this.skills;
    if (!current.includes(skill)) {
      this.form.patchValue({ requiredSkills: [...current, skill] });
    }
    this.skillInput = '';
  }

  removeSkill(skill: string): void {
    this.form.patchValue({
      requiredSkills: this.skills.filter(s => s !== skill)
    });
  }

  onSkillKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.addSkill();
    }
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.isSaving = true;
    const payload: Career = this.form.value;

    const request$ = this.isEdit
      ? this.careerService.update(this.data!.id!, payload)
      : this.careerService.create(payload);

    request$.subscribe({
      next: () => {
        this.snackBar.open(
          this.isEdit ? 'Position updated!' : 'Position created!',
          'OK',
          { duration: 3000 }
        );
        this.dialogRef.close(true);
      },
      error: () => {
        this.isSaving = false;
        this.snackBar.open('An error occurred', 'Close', { duration: 3000 });
      }
    });
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}