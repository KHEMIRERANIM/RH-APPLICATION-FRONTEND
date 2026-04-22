import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CareerService } from '../../services/career.service';
import { EvolutionPlanService } from '../../services/evolution-plan.service';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-career-admin-dashboard',
  templateUrl: './career-admin-dashboard.component.html',
  styleUrls: ['./career-admin-dashboard.component.scss']
})
export class CareerAdminDashboardComponent implements OnInit, OnDestroy {

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
  adminTab: 'overview' | 'mobility' | 'plans' | 'rse' = 'overview';

  private refreshInterval: any;

  constructor(
    private careerService: CareerService,
    private evolutionPlanService: EvolutionPlanService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.loadStats();
    this.refreshInterval = setInterval(() => this.loadStats(), 60000);
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('accessToken');
    return new HttpHeaders({ Authorization: `Bearer ${token || ''}` });
  }

  loadStats(): void {
    this.isLoading = true;

    this.careerService.getAll().subscribe({
      next: careers => {
        this.totalPositions = careers.length;
      }
    });

    this.evolutionPlanService.getAll().subscribe({
      next: plans => {
        this.totalPlans = plans.length;
        this.avgProgress = plans.length
          ? Math.round(plans.reduce((s, p) => s + (p.scoreGlobal ?? 0), 0) / plans.length)
          : 0;

        const statusMap: Record<string, number> = {};
        plans.forEach(p => {
          statusMap[p.status] = (statusMap[p.status] || 0) + 1;
        });

        this.plansByStatus = [
          { label: 'Brouillon', count: statusMap['DRAFT'] || 0, color: '#6b7280' },
          { label: 'Soumis', count: statusMap['SUBMITTED'] || 0, color: '#d97706' },
          { label: 'Examiné', count: statusMap['REVIEWED'] || 0, color: '#16a34a' },
        ];

        const p0 = plans.filter(p => (p.scoreGlobal ?? 0) === 0).length;
        const p25 = plans.filter(p => (p.scoreGlobal ?? 0) > 0 && (p.scoreGlobal ?? 0) <= 25).length;
        const p50 = plans.filter(p => (p.scoreGlobal ?? 0) > 25 && (p.scoreGlobal ?? 0) <= 50).length;
        const p75 = plans.filter(p => (p.scoreGlobal ?? 0) > 50 && (p.scoreGlobal ?? 0) <= 75).length;
        const p100 = plans.filter(p => (p.scoreGlobal ?? 0) > 75).length;

        this.progressDistribution = [
          { range: '0%', count: p0, color: '#dc2626' },
          { range: '1–25%', count: p25, color: '#ea580c' },
          { range: '26–50%', count: p50, color: '#d97706' },
          { range: '51–75%', count: p75, color: '#65a30d' },
          { range: '76–100%', count: p100, color: '#16a34a' },
        ];

        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });

    this.http.get<any[]>('http://localhost:8081/api/mobility', { headers: this.getHeaders() })
      .pipe(catchError(() => of([])))
      .subscribe(requests => {
        this.totalMobilities = requests.length;
        this.pendingRequests = requests.filter(r => r.status === 'PENDING').length;
        this.approvedRequests = requests.filter(r => r.status === 'APPROVED').length;
        this.rejectedRequests = requests.filter(r => r.status === 'REJECTED').length;

        this.mobilityByStatus = [
          { label: 'En attente', count: this.pendingRequests, color: '#d97706' },
          { label: 'Approuvées', count: this.approvedRequests, color: '#16a34a' },
          { label: 'Refusées', count: this.rejectedRequests, color: '#dc2626' },
        ];

        const careerCount: Record<string, { title: string; count: number }> = {};
        requests.forEach((r: any) => {
          if (r.targetCareerTitle) {
            if (!careerCount[r.targetCareerTitle]) {
              careerCount[r.targetCareerTitle] = { title: r.targetCareerTitle, count: 0 };
            }
            careerCount[r.targetCareerTitle].count++;
          }
        });

        this.topTargetCareers = Object.values(careerCount)
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
      });

    this.http.get<any[]>('http://localhost:8081/api/users', { headers: this.getHeaders() })
      .pipe(catchError(() => of([])))
      .subscribe(users => {
        this.totalEmployees = users.filter(
          u => u.role === 'EMPLOYE' || u.role === 'EMPLOYEE' || u.role === 'USER'
        ).length;
      });
  }

  getBarWidth(count: number, max: number): string {
    if (!max) return '0%';
    return Math.round((count / max) * 100) + '%';
  }

  getMaxCount(items: { count: number }[]): number {
    return Math.max(...items.map(i => i.count), 1);
  }

  setAdminTab(tab: 'overview' | 'mobility' | 'plans' | 'rse'): void {
    this.adminTab = tab;
  }

  getAdminTabStyle(tab: 'overview' | 'mobility' | 'plans' | 'rse'): string {
    const active = this.adminTab === tab;
    return `
      padding: 12px 18px;
      border: none;
      background: ${active ? '#f5f3ff' : 'white'};
      color: ${active ? '#6d28d9' : '#4b5563'};
      font-weight: ${active ? '700' : '500'};
      border-radius: 10px;
      cursor: pointer;
    `;
  }
}