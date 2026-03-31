import { Component, OnInit } from '@angular/core';
import { CareerPlanService } from '../../services/career-plan.service';
import { CareerPlan, PlanStatus } from '../../models/mobility.model';
import { AuthRoleService } from '../../services/auth-role.service';

@Component({
  selector: 'app-employee-plan',
  templateUrl: './employee-plan.component.html'
})
export class EmployeePlanComponent implements OnInit {

  plans: CareerPlan[] = [];
  isLoading = true;
  PlanStatus = PlanStatus;

  constructor(
    private planService: CareerPlanService,
    private authRole: AuthRoleService
  ) {}

  ngOnInit(): void {
    const userId = this.authRole.getCurrentUserId();
    this.planService.getByEmployee(userId).subscribe({
      next: (data) => { this.plans = data; this.isLoading = false; },
      error: () => { this.isLoading = false; }
    });
  }

  getProgressColor(p: number): string {
    if (p >= 80) return '#16a34a';
    if (p >= 50) return '#d97706';
    return '#dc2626';
  }
}