import { Component, OnInit } from '@angular/core';
import { RseService } from '../../services/rse.service';
import { ValidationResponse } from '../../models/validation-response.model';

@Component({
  selector: 'app-rse-admin-dashboard',
  templateUrl: './rse-admin-dashboard.component.html',
  styleUrls: ['./rse-admin-dashboard.component.scss']
})
export class RseAdminDashboardComponent implements OnInit {
  actions: any[] = [];
  validatedActions: any[] = [];
  validationResult?: ValidationResponse;
  loading = false;

  pendingCount = 0;
  latestPointsAdded = 0;
  latestBadgesCount = 0;
  latestTotalPoints = 0;

  constructor(private rseService: RseService) {}

  ngOnInit(): void {
    this.loadPendingActions();
    this.loadValidatedActions();
  }

  loadPendingActions(): void {
    this.loading = true;

    this.rseService.getPendingActions().subscribe({
      next: (data) => {
        this.actions = data;
        this.pendingCount = data.length;
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur chargement actions RSE', err);
        this.loading = false;
      }
    });
  }

  loadValidatedActions(): void {
    this.rseService.getValidatedActions().subscribe({
      next: (data) => {
        this.validatedActions = data;

        if (this.validatedActions.length > 0) {
          const latest = this.validatedActions[0];
          this.latestTotalPoints = latest.rsePoints || 0;
          this.latestBadgesCount = latest.badges?.length || 0;
        }
      },
      error: (err) => {
        console.error('Erreur chargement actions validées RSE', err);
      }
    });
  }

  validateAction(actionId: string): void {
    this.rseService.validateAction(actionId).subscribe({
      next: (res) => {
        this.validationResult = res;
        this.latestPointsAdded = res.pointsAdded || 0;
        this.latestBadgesCount = res.badges?.length || 0;
        this.latestTotalPoints = res.totalPoints || 0;

        this.loadPendingActions();
        this.loadValidatedActions();
      },
      error: (err) => {
        console.error('Erreur validation action RSE', err);
      }
    });
  }
}