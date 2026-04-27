import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { of, Subscription, interval } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { CareerService } from '../../services/career.service';
import { EvolutionPlanService } from '../../services/evolution-plan.service';
import { CareerFormComponent } from '../career-form/career-form.component';
import { CareerDomain, CareerLevel } from '../../models/career.model';

type AdminTab = 'overview' | 'mobility' | 'plans' | 'rse' | 'careers';

@Component({
  selector: 'app-career-admin-dashboard',
  templateUrl: './career-admin-dashboard.component.html',
  styleUrls: ['./career-admin-dashboard.component.scss']
})
export class CareerAdminDashboardComponent implements OnInit, OnDestroy {
  allCareers: any[] = [];
  careersDataSource = new MatTableDataSource<any>([]);
  displayedCareerColumns: string[] = ['title', 'domain', 'level', 'salary', 'options', 'actions'];
  totalPositions = 0;
  totalPlans = 0;
  totalMobilities = 0;
  totalEmployees = 0;
  avgProgress = 0;
  pendingRequests = 0;
  approvedRequests = 0;
  rejectedRequests = 0;

  Math = Math;

  plansByStatus: { label: string; count: number; color: string }[] = [];
  mobilityByStatus: { label: string; count: number; color: string }[] = [];
  topTargetCareers: { title: string; count: number }[] = [];
  progressDistribution: { range: string; count: number; color: string }[] = [];

  isLoading = true;
  adminTab: AdminTab = 'overview';

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

  domainColors: Record<CareerDomain, string> = {
    [CareerDomain.IT]: 'bg-blue-100 text-blue-700',
    [CareerDomain.FINANCE]: 'bg-green-100 text-green-700',
    [CareerDomain.RH]: 'bg-pink-100 text-pink-700',
    [CareerDomain.MARKETING]: 'bg-purple-100 text-purple-700',
    [CareerDomain.LEGAL]: 'bg-yellow-100 text-yellow-700',
    [CareerDomain.OPERATIONS]: 'bg-orange-100 text-orange-700',
    [CareerDomain.SALES]: 'bg-teal-100 text-teal-700',
    [CareerDomain.ENGINEERING]: 'bg-indigo-100 text-indigo-700',
    [CareerDomain.HEALTH]: 'bg-red-100 text-red-700',
    [CareerDomain.EDUCATION]: 'bg-cyan-100 text-cyan-700'
  };

  levelColors: Record<CareerLevel, string> = {
    [CareerLevel.INTERN]: 'text-gray-400',
    [CareerLevel.JUNIOR]: 'text-gray-500',
    [CareerLevel.MID]: 'text-blue-500',
    [CareerLevel.SENIOR]: 'text-indigo-600',
    [CareerLevel.LEAD]: 'text-purple-600',
    [CareerLevel.MANAGER]: 'text-orange-600',
    [CareerLevel.DIRECTOR]: 'text-red-600',
    [CareerLevel.EXECUTIVE]: 'text-rose-700'
  };

  levelIcons: Record<CareerLevel, string> = {
    [CareerLevel.INTERN]: '○',
    [CareerLevel.JUNIOR]: '◔',
    [CareerLevel.MID]: '◑',
    [CareerLevel.SENIOR]: '◕',
    [CareerLevel.LEAD]: '★',
    [CareerLevel.MANAGER]: '▲',
    [CareerLevel.DIRECTOR]: '◆',
    [CareerLevel.EXECUTIVE]: '♛'
  };

  private refreshSubscription?: Subscription;

  constructor(
    private careerService: CareerService,
    private evolutionPlanService: EvolutionPlanService,
    private http: HttpClient,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadStats();

    this.refreshSubscription = interval(60000).subscribe(() => {
      this.loadStats();
    });
  }

  ngOnDestroy(): void {
    this.refreshSubscription?.unsubscribe();
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('accessToken') || '';
    return new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
  }

  loadStats(): void {
    this.isLoading = true;

    this.careerService.getAll().subscribe({
      next: (careers: any[]) => {
        this.totalPositions = careers?.length || 0;
        this.allCareers = careers || [];
        this.careersDataSource.data = this.allCareers;
      },
      error: () => {
        this.totalPositions = 0;
        this.allCareers = [];
        this.careersDataSource.data = [];
      }
    });

    this.evolutionPlanService.getAll().subscribe({
      next: (plans: any[]) => {
        const safePlans = plans || [];

        this.totalPlans = safePlans.length;
        this.avgProgress = safePlans.length
          ? Math.round(
              safePlans.reduce((sum, plan) => sum + (plan.scoreGlobal ?? 0), 0) / safePlans.length
            )
          : 0;

        const statusMap: Record<string, number> = {};
        safePlans.forEach((plan: any) => {
          const status = plan?.status || 'UNKNOWN';
          statusMap[status] = (statusMap[status] || 0) + 1;
        });

        this.plansByStatus = [
          { label: 'Brouillon', count: statusMap['DRAFT'] || 0, color: '#6b7280' },
          { label: 'Soumis', count: statusMap['SUBMITTED'] || 0, color: '#d97706' },
          { label: 'Examiné', count: statusMap['REVIEWED'] || 0, color: '#16a34a' }
        ];

        const p0 = safePlans.filter((p: any) => (p.scoreGlobal ?? 0) === 0).length;
        const p25 = safePlans.filter((p: any) => (p.scoreGlobal ?? 0) > 0 && (p.scoreGlobal ?? 0) <= 25).length;
        const p50 = safePlans.filter((p: any) => (p.scoreGlobal ?? 0) > 25 && (p.scoreGlobal ?? 0) <= 50).length;
        const p75 = safePlans.filter((p: any) => (p.scoreGlobal ?? 0) > 50 && (p.scoreGlobal ?? 0) <= 75).length;
        const p100 = safePlans.filter((p: any) => (p.scoreGlobal ?? 0) > 75).length;

        this.progressDistribution = [
          { range: '0%', count: p0, color: '#dc2626' },
          { range: '1–25%', count: p25, color: '#ea580c' },
          { range: '26–50%', count: p50, color: '#d97706' },
          { range: '51–75%', count: p75, color: '#65a30d' },
          { range: '76–100%', count: p100, color: '#16a34a' }
        ];

        this.isLoading = false;
      },
      error: () => {
        this.totalPlans = 0;
        this.avgProgress = 0;
        this.plansByStatus = [];
        this.progressDistribution = [];
        this.isLoading = false;
      }
    });

    this.http
      .get<any[]>('http://localhost:8081/api/mobility', { headers: this.getHeaders() })
      .pipe(catchError(() => of([])))
      .subscribe((requests: any[]) => {
        const safeRequests = requests || [];

        this.totalMobilities = safeRequests.length;
        this.pendingRequests = safeRequests.filter(r => r.status === 'PENDING').length;
        this.approvedRequests = safeRequests.filter(r => r.status === 'APPROVED').length;
        this.rejectedRequests = safeRequests.filter(r => r.status === 'REJECTED').length;

        this.mobilityByStatus = [
          { label: 'En attente', count: this.pendingRequests, color: '#d97706' },
          { label: 'Approuvées', count: this.approvedRequests, color: '#16a34a' },
          { label: 'Refusées', count: this.rejectedRequests, color: '#dc2626' }
        ];

        const careerCount: Record<string, { title: string; count: number }> = {};

        safeRequests.forEach((request: any) => {
          if (request?.targetCareerTitle) {
            if (!careerCount[request.targetCareerTitle]) {
              careerCount[request.targetCareerTitle] = {
                title: request.targetCareerTitle,
                count: 0
              };
            }

            careerCount[request.targetCareerTitle].count++;
          }
        });

        this.topTargetCareers = Object.values(careerCount)
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
      });

    this.http
      .get<any[]>('http://localhost:8081/api/users', { headers: this.getHeaders() })
      .pipe(catchError(() => of([])))
      .subscribe((users: any[]) => {
        const safeUsers = users || [];

        this.totalEmployees = safeUsers.filter(
          user => user.role === 'EMPLOYE' || user.role === 'EMPLOYEE' || user.role === 'USER'
        ).length;
      });
  }

  getBarWidth(count: number, max: number): string {
    if (!max || count <= 0) {
      return '0%';
    }
    return Math.round((count / max) * 100) + '%';
  }

  getMaxCount(items: { count: number }[]): number {
    if (!items?.length) {
      return 1;
    }
    return Math.max(...items.map(item => item.count), 1);
  }

  setAdminTab(tab: AdminTab): void {
    this.adminTab = tab;
  }

  // --- Gestion des Carrieres ---

  openCareerForm(career?: any): void {
    const dialogRef = this.dialog.open(CareerFormComponent, {
      width: '700px',
      maxWidth: '95vw',
      data: career || null,
      panelClass: 'career-dialog'
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadStats();
      }
    });
  }

  deleteCareer(id: string): void {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette carrière ?')) {
      return;
    }

    this.careerService.delete(id).subscribe({
      next: () => {
        this.snackBar.open('Carrière supprimée avec succès', 'OK', { duration: 3000 });
        this.loadStats();
      },
      error: () => {
        this.snackBar.open('Erreur lors de la suppression', 'Fermer', { duration: 3000 });
      }
    });
  }

  formatSalary(career: any): string {
    if (!career.salaryMin && !career.salaryMax) return '—';
    if (career.salaryMin && career.salaryMax) {
      return `${career.salaryMin.toLocaleString()} – ${career.salaryMax.toLocaleString()} TND`;
    }
    if (career.salaryMin) return `À partir de ${career.salaryMin.toLocaleString()} TND`;
    return `Jusqu'à ${career.salaryMax!.toLocaleString()} TND`;
  }
}
