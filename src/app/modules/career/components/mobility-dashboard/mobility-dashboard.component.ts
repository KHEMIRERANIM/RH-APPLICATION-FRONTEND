import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { MobilityService } from '../../services/mobility.service';
import { CareerService } from '../../services/career.service';
import { MobilityRequest, MobilityStatus } from '../../models/mobility.model';
import { Career } from '../../models/career.model';
import { MobilityRequestFormComponent } from '../mobility-request-form/mobility-request-form.component';

type FilterStatus = MobilityStatus | 'ALL';

@Component({
  selector: 'app-mobility-dashboard',
  templateUrl: './mobility-dashboard.component.html',
  styleUrls: ['./mobility-dashboard.component.scss']
})
export class MobilityDashboardComponent implements OnInit {

  requests: MobilityRequest[] = [];
  careers: Career[] = [];
  isLoading = true;

  // ✅ FIX IMPORTANT TYPE
  selectedStatus: FilterStatus = 'ALL';

  MobilityStatus = MobilityStatus;

  // ✅ FIX LISTE TYPESAFE
  statuses: FilterStatus[] = [
    'ALL',
    MobilityStatus.PENDING,
    MobilityStatus.APPROVED,
    MobilityStatus.REJECTED,
    MobilityStatus.ON_HOLD
  ];

  statusColors: Record<MobilityStatus, string> = {
    [MobilityStatus.PENDING]:  'background:#fef9c3; color:#854d0e;',
    [MobilityStatus.APPROVED]: 'background:#dcfce7; color:#166534;',
    [MobilityStatus.REJECTED]: 'background:#fee2e2; color:#991b1b;',
    [MobilityStatus.ON_HOLD]:  'background:#e0e7ff; color:#3730a3;'
  };

  statusLabels: Record<MobilityStatus, string> = {
    [MobilityStatus.PENDING]:  '⏳ En attente',
    [MobilityStatus.APPROVED]: '✅ Approuvé',
    [MobilityStatus.REJECTED]: '❌ Refusé',
    [MobilityStatus.ON_HOLD]:  '⏸️ En suspens'
  };

  constructor(
    private mobilityService: MobilityService,
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
    this.mobilityService.getAll().subscribe({
      next: (data) => {
        this.requests = data;
        this.isLoading = false;
      },
      error: () => this.isLoading = false
    });
  }

  // ✅ FIX TYPE FILTER
  get filteredRequests(): MobilityRequest[] {
    if (this.selectedStatus === 'ALL') return this.requests;
    return this.requests.filter(r => r.status === this.selectedStatus);
  }

  get totalPending(): number {
    return this.requests.filter(r => r.status === MobilityStatus.PENDING).length;
  }

  get totalApproved(): number {
    return this.requests.filter(r => r.status === MobilityStatus.APPROVED).length;
  }

  get totalRejected(): number {
    return this.requests.filter(r => r.status === MobilityStatus.REJECTED).length;
  }

  // ✅ FIX MISSING METHOD
  openRequestForm(): void {
    const ref = this.dialog.open(MobilityRequestFormComponent, {
      width: '600px',
      maxWidth: '95vw',
      data: { careers: this.careers },
      panelClass: 'career-dialog'
    });

    ref.afterClosed().subscribe(result => {
      if (result) this.loadAll();
    });
  }

  review(req: MobilityRequest, status: MobilityStatus): void {
    const comment = prompt(`Commentaire pour "${status}" :`);
    if (comment === null) return;

    this.mobilityService.review(req.id!, {
      status,
      reviewedBy: 'RH Admin',
      reviewComment: comment
    }).subscribe({
      next: () => {
        this.snackBar.open(`Demande mise à jour`, 'OK', { duration: 3000 });
        this.loadAll();
      },
      error: () => this.snackBar.open('Erreur', 'Fermer', { duration: 3000 })
    });
  }

  delete(req: MobilityRequest): void {
    if (!confirm(`Supprimer la demande de ${req.employeeName} ?`)) return;

    this.mobilityService.delete(req.id!).subscribe({
      next: () => {
        this.snackBar.open('Supprimé', 'OK', { duration: 3000 });
        this.loadAll();
      }
    });
  }
  
}