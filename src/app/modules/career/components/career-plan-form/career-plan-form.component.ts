import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CareerPlanService } from '../../services/career-plan.service';
import { Career } from '../../models/career.model';
import { AuthRoleService } from '../../services/auth-role.service';

@Component({
  selector: 'app-career-plan-form',
  templateUrl: './career-plan-form.component.html',
  styleUrls: ['./career-plan-form.component.scss']
})
export class CareerPlanFormComponent implements OnInit {

  form!: FormGroup;
  isSaving = false;
  careers: Career[] = [];
  skillInput = '';
  currentSkills: string[] = [];

  constructor(
    private fb: FormBuilder,
    private planService: CareerPlanService,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<CareerPlanFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { careers: Career[] },
    private authRole: AuthRoleService
  ) {}

  ngOnInit(): void {
    this.careers = this.data.careers;
    this.dialogRef.updateSize('640px');

    const user = this.authRole.getCurrentUser();
    const fullName = user ? `${user.prenom || ''} ${user.nom || ''}`.trim() : 'RH Admin';

    this.form = this.fb.group({
      employeeId:      [this.authRole.getCurrentUserId(), Validators.required],
      currentCareerId: ['', Validators.required],
      targetCareerId:  ['', Validators.required],
      createdBy:       [fullName],
      notes:           ['']
    });
  }

  addSkill(): void {
    const s = this.skillInput.trim();
    if (s && !this.currentSkills.includes(s)) this.currentSkills.push(s);
    this.skillInput = '';
  }

  removeSkill(s: string): void {
    this.currentSkills = this.currentSkills.filter(x => x !== s);
  }

  onSkillKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter') { e.preventDefault(); this.addSkill(); }
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.isSaving = true;
    const payload = { ...this.form.value, currentSkills: this.currentSkills };
    this.planService.create(payload).subscribe({
      next: () => {
        this.snackBar.open('Plan créé !', 'OK', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: () => {
        this.isSaving = false;
        this.snackBar.open('Erreur', 'Fermer', { duration: 3000 });
      }
    });
  }

  cancel(): void { this.dialogRef.close(false); }
}