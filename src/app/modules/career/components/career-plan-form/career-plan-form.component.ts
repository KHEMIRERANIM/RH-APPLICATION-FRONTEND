import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CareerPlanService } from '../../services/career-plan.service';
import { Career } from '../../models/career.model';

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
    @Inject(MAT_DIALOG_DATA) public data: { careers: Career[] }
  ) {}

  ngOnInit(): void {
  this.careers = this.data.careers;

  this.form = this.fb.group({
  currentCareerId: [''],
  targetCareerId: ['']
});
}

save(): void {
  if (this.form.invalid) return;

  const payload = {
    currentCareerId: this.form.value.currentCareerId,
    targetCareerId: this.form.value.targetCareerId,
    currentSkills: this.currentSkills,
    notes: this.form.value.notes
  };

  this.planService.create(payload).subscribe(() => {
    this.dialogRef.close(true);
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

  

  cancel(): void { this.dialogRef.close(false); }
}