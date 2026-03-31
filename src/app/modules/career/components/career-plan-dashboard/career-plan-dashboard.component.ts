import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { CareerPlanService } from '../../services/career-plan.service';
import { CareerService } from '../../services/career.service';
import { CareerPlan, PlanStatus } from '../../models/mobility.model';
import { Career } from '../../models/career.model';
import { CareerPlanFormComponent } from '../career-plan-form/career-plan-form.component';

@Component({
  selector: 'app-career-plan-dashboard',
  templateUrl: './career-plan-dashboard.component.html',
  styleUrls: ['./career-plan-dashboard.component.scss']
})
export class CareerPlanDashboardComponent implements OnInit {

  plans: CareerPlan[] = [];
  careers: Career[] = [];
  isLoading = true;
  PlanStatus = PlanStatus;

  constructor(
    private planService: CareerPlanService,
    private careerService: CareerService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadAll();
    this.careerService.getAll().subscribe(data => this.careers = data);
  }

  loadAll(): void {
    this.isLoading = true;
    this.planService.getAll().subscribe({
      next: (data) => { this.plans = data; this.isLoading = false; },
      error: () => { this.isLoading = false; }
    });
  }

  get totalActive(): number { return this.plans.filter(p => p.status === PlanStatus.ACTIVE).length; }
  get totalCompleted(): number { return this.plans.filter(p => p.status === PlanStatus.COMPLETED).length; }
  get avgProgress(): number {
    if (!this.plans.length) return 0;
    return Math.round(this.plans.reduce((sum, p) => sum + (p.progressPercent || 0), 0) / this.plans.length);
  }

  openForm(): void {
    const ref = this.dialog.open(CareerPlanFormComponent, {
      width: '640px',
      maxWidth: '95vw',
      data: { careers: this.careers },
      panelClass: 'career-dialog'
    });
    ref.afterClosed().subscribe(result => { if (result) this.loadAll(); });
  }

  delete(plan: CareerPlan): void {
    if (!confirm(`Supprimer le plan de ${plan.employeeName} ?`)) return;
    this.planService.delete(plan.id!).subscribe({
      next: () => { this.snackBar.open('Supprimé', 'OK', { duration: 3000 }); this.loadAll(); }
    });
  }

  getProgressColor(p: number): string {
    if (p >= 80) return '#16a34a';
    if (p >= 50) return '#d97706';
    return '#dc2626';
  }
}