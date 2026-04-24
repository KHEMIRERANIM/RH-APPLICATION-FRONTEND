import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { CareerPlanService } from '../../services/career-plan.service';
import { CareerService } from '../../services/career.service';
import { EvolutionPlanService } from '../../services/evolution-plan.service';
import { CareerPlan, PlanStatus } from '../../models/mobility.model';
import { EvolutionPlan, EvolutionPlanStatus, parseCompetences } from '../../models/evolution-plan.model';
import { EmployeeCertification, CertificationType } from '../../models/certification.model';
import { Career } from '../../models/career.model';
import { CareerPlanFormComponent } from '../career-plan-form/career-plan-form.component';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Component({
  selector: 'app-career-plan-dashboard',
  templateUrl: './career-plan-dashboard.component.html',
  styleUrls: ['./career-plan-dashboard.component.scss']
})
export class CareerPlanDashboardComponent implements OnInit {
  plans: CareerPlan[] = [];
  careers: Career[] = [];
  PlanStatus = PlanStatus;

  evolutionPlans: EvolutionPlan[] = [];
  selectedPlan: EvolutionPlan | null = null;
  selectedCareer: Career | null = null;

  newFormation = '';
  EvolutionPlanStatus = EvolutionPlanStatus;

  activeView: 'plans' | 'evolution' = 'evolution';
  isLoading = true;

  private usersCache: Record<string, any> = {};

  constructor(
    private planService: CareerPlanService,
    private evolutionPlanService: EvolutionPlanService,
    private careerService: CareerService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.careerService.getAll().subscribe(data => {
      this.careers = data || [];
      this.loadAll();
      this.loadEvolutionPlans();
    });
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('accessToken');
    return new HttpHeaders({ Authorization: `Bearer ${token || ''}` });
  }

  private getUserName(userId: string): string {
    const user = this.usersCache[userId];
    if (!user) {
      return userId;
    }
    return `${user.prenom ?? ''} ${user.nom ?? ''}`.trim() || user.email || userId;
  }

  private getCareerTitle(careerId: string): string {
    if (!careerId) {
      return '—';
    }
    const career = this.careers.find(c => c.id === careerId);
    return career?.title ?? '—';
  }

  private getCareer(careerId: string): Career | null {
    return this.careers.find(c => c.id === careerId) ?? null;
  }

  private enrichPlans(plans: EvolutionPlan[]): EvolutionPlan[] {
    return plans.map(plan => ({
      ...plan,
      competencesActuelles: parseCompetences(plan),
      employeeName: this.getUserName(plan.employeeId),
      currentCareerTitle: this.getCareerTitle(plan.currentCareerId ?? ''),
      targetCareerTitle: this.getCareerTitle(plan.targetCareerId)
    }));
  }

  loadAll(): void {
    this.isLoading = true;

    this.planService.getAll().subscribe({
      next: data => {
        this.plans = data || [];
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  get totalActive(): number {
    return this.evolutionPlans.length;
  }

  get totalCompleted(): number {
    return this.evolutionPlans.filter(plan => (plan.scoreGlobal ?? 0) >= 100).length;
  }

  get avgProgress(): number {
    if (!this.evolutionPlans.length) {
      return 0;
    }

    return Math.round(
      this.evolutionPlans.reduce((sum, plan) => sum + (plan.scoreGlobal ?? 0), 0) / this.evolutionPlans.length
    );
  }

  openForm(): void {
    const ref = this.dialog.open(CareerPlanFormComponent, {
      width: '640px',
      maxWidth: '95vw',
      data: { careers: this.careers },
      panelClass: 'career-dialog'
    });

    ref.afterClosed().subscribe(result => {
      if (result) {
        this.loadAll();
      }
    });
  }

  delete(plan: CareerPlan): void {
    if (!confirm(`Supprimer le plan de ${plan.employeeName} ?`)) {
      return;
    }

    this.planService.delete(plan.id!).subscribe({
      next: () => {
        this.snackBar.open('Supprimé', 'OK', { duration: 3000 });
        this.loadAll();
      }
    });
  }

  getProgressColor(progress: number): string {
    return progress >= 80 ? '#16a34a' : progress >= 50 ? '#d97706' : '#dc2626';
  }

  loadEvolutionPlans(): void {
    this.evolutionPlanService.getAll().subscribe({
      next: data => {
        const safeData = data || [];

        const missingIds = [...new Set(safeData.map(plan => plan.employeeId))]
          .filter(id => id && !this.usersCache[id]);

        if (missingIds.length === 0) {
          this.evolutionPlans = this.enrichPlans(safeData);
          return;
        }

        this.http.get<any[]>('http://localhost:8081/api/users', { headers: this.getHeaders() })
          .pipe(catchError(() => of([])))
          .subscribe(users => {
            (users || []).forEach(user => {
              this.usersCache[user.id] = user;
            });
            this.evolutionPlans = this.enrichPlans(safeData);
          });
      },
      error: () => {}
    });
  }

  openEvolutionPlan(plan: EvolutionPlan): void {
    this.selectedPlan = {
      ...plan,
      competencesActuelles: parseCompetences(plan),
      formationsRecommandees: plan.formationsRecommandees ?? [],
      employeeName: this.getUserName(plan.employeeId),
      currentCareerTitle: this.getCareerTitle(plan.currentCareerId ?? ''),
      targetCareerTitle: this.getCareerTitle(plan.targetCareerId)
    };

    this.selectedCareer = this.getCareer(plan.targetCareerId);
  }

  certifsTech(): EmployeeCertification[] {
    return (this.selectedPlan?.certifications ?? [])
      .filter(certif => certif.type === CertificationType.TECHNIQUE);
  }

  certifsSoft(): EmployeeCertification[] {
    return (this.selectedPlan?.certifications ?? [])
      .filter(certif => certif.type === CertificationType.SOFT_SKILL);
  }

  certifRequisesDuPoste(): EmployeeCertification[] {
    return this.selectedCareer?.certifRequises ?? [];
  }

  planScores(): { label: string; value: number; color: string }[] {
    if (!this.selectedPlan) {
      return [];
    }

    return [
      { label: 'Global', value: this.selectedPlan.scoreGlobal ?? 0, color: '#7c3aed' },
      { label: 'Technique', value: this.selectedPlan.scoreTechnique ?? 0, color: '#2563eb' },
      { label: 'Soft', value: this.selectedPlan.scoreSoftSkill ?? 0, color: '#ea580c' }
    ];
  }

  competencesEmploye(): { nom: string; niveau: string; annees?: number }[] {
    if (!this.selectedPlan) {
      return [];
    }

    return parseCompetences(this.selectedPlan);
  }

  addFormation(): void {
    if (!this.newFormation.trim() || !this.selectedPlan) {
      return;
    }

    this.selectedPlan.formationsRecommandees!.push(this.newFormation.trim());
    this.newFormation = '';
  }

  removeFormation(index: number): void {
    this.selectedPlan?.formationsRecommandees?.splice(index, 1);
  }

  saveEnrichissement(): void {
    if (!this.selectedPlan?.id) {
      return;
    }

    this.evolutionPlanService.enrichPlan(this.selectedPlan.id, {
      formationsRecommandees: this.selectedPlan.formationsRecommandees,
      commentaireAdmin: this.selectedPlan.commentaireAdmin
    }).subscribe({
      next: () => this.snackBar.open('Plan enrichi ✓', 'OK', { duration: 3000 }),
      error: () => this.snackBar.open('Erreur', 'Fermer', { duration: 3000 })
    });
  }

  validateCertif(certif: EmployeeCertification, valide: boolean): void {
    certif.valideParAdmin = valide;
    this.saveCertifAdmin(certif);
  }

  toggleObligatoire(certif: EmployeeCertification): void {
    certif.obligatoire = !certif.obligatoire;
    this.saveCertifAdmin(certif);
  }

  saveCertifAdmin(certif: EmployeeCertification): void {
    if (!this.selectedPlan?.id || !certif.id) {
      return;
    }

    const payload: any = {
      valideParAdmin: certif.valideParAdmin,
      commentaireAdmin: certif.commentaireAdmin,
      obligatoire: certif.obligatoire,
      nom: certif.nom,
      type: certif.type,
      statut: certif.statut,
      methodeEval: certif.methodeEval,
      niveauRequis: certif.niveauRequis
    };

    if (certif.valideParAdmin === true) {
      payload.statut = 'OBTENU';
      certif.statut = 'OBTENU' as any;
    }

    this.evolutionPlanService.updateCertification(
      this.selectedPlan.id,
      certif.id,
      payload
    ).subscribe({
      next: updatedPlan => {
        this.selectedPlan = {
          ...updatedPlan,
          competencesActuelles: parseCompetences(updatedPlan),
          employeeName: this.getUserName(updatedPlan.employeeId),
          currentCareerTitle: this.getCareerTitle(updatedPlan.currentCareerId ?? ''),
          targetCareerTitle: this.getCareerTitle(updatedPlan.targetCareerId)
        };

        const index = this.evolutionPlans.findIndex(plan => plan.id === updatedPlan.id);
        if (index !== -1) {
          this.evolutionPlans[index] = this.enrichPlans([updatedPlan])[0];
        }

        this.snackBar.open('Certif mise à jour ✓', 'OK', { duration: 2500 });
      },
      error: () => this.snackBar.open('Erreur', 'Fermer', { duration: 3000 })
    });
  }

  evolutionStatusLabel(status: string): string {
    return ({
      DRAFT: 'Brouillon',
      SUBMITTED: 'Soumis',
      REVIEWED: 'Examiné',
      ACTIVE: 'Actif',
      COMPLETED: 'Complété'
    } as any)[status] ?? status;
  }

  certifStatusLabel(status: string): string {
    return ({
      NON_COMMENCE: 'Non commencé',
      EN_COURS: 'En cours',
      OBTENU: 'Obtenu'
    } as any)[status] ?? status;
  }

  statusClass(status: string): string {
    return ({
      DRAFT: 'status-draft',
      SUBMITTED: 'status-submitted',
      REVIEWED: 'status-reviewed',
      ACTIVE: 'status-active',
      COMPLETED: 'status-completed'
    } as any)[status] ?? 'status-draft';
  }

  certifStatusClass(status: string): string {
    return ({
      NON_COMMENCE: 'certif-not-started',
      EN_COURS: 'certif-in-progress',
      OBTENU: 'certif-obtained'
    } as any)[status] ?? 'certif-not-started';
  }
  openCertificationFile(fileUrl: string): void {
  if (!fileUrl) {
    this.snackBar.open('Fichier introuvable', 'Fermer', { duration: 3000 });
    return;
  }

  const fullUrl = `http://localhost:8081${fileUrl}`;

  this.http.get(fullUrl, {
    headers: this.getHeaders(),
    responseType: 'blob',
    observe: 'response'
  }).subscribe({
    next: (response) => {
      const blob = response.body;
      if (!blob) {
        this.snackBar.open('Impossible d’ouvrir le fichier', 'Fermer', { duration: 3000 });
        return;
      }

      const blobUrl = window.URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');

      setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
      }, 10000);
    },
    error: () => {
      this.snackBar.open('Accès refusé ou fichier indisponible', 'Fermer', { duration: 3000 });
    }
  });
}
}