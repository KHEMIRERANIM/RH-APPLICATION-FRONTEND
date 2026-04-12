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
    private planService:          CareerPlanService,
    private evolutionPlanService: EvolutionPlanService,
    private careerService:        CareerService,
    private snackBar:             MatSnackBar,
    private dialog:               MatDialog,
    private http:                 HttpClient
  ) {}

  ngOnInit(): void {
    this.careerService.getAll().subscribe(data => {
      this.careers = data;
      this.loadAll();
      this.loadEvolutionPlans();
    });
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('accessToken');
    return new HttpHeaders({ Authorization: `Bearer ${token || ''}` });
  }

  private getUserName(userId: string): string {
    const u = this.usersCache[userId];
    if (!u) return userId;
    return `${u.prenom ?? ''} ${u.nom ?? ''}`.trim() || u.email || userId;
  }

  private getCareerTitle(careerId: string): string {
    if (!careerId) return '—';
    const c = this.careers.find(c => c.id === careerId);
    return c?.title ?? '—';
  }

  private getCareer(careerId: string): Career | null {
    return this.careers.find(c => c.id === careerId) ?? null;
  }

  private enrichPlans(plans: EvolutionPlan[]): EvolutionPlan[] {
    return plans.map(p => ({
      ...p,
      competencesActuelles: parseCompetences(p),
      employeeName:         this.getUserName(p.employeeId),
      currentCareerTitle:   this.getCareerTitle(p.currentCareerId ?? ''),
      targetCareerTitle:    this.getCareerTitle(p.targetCareerId)
    }));
  }

  loadAll(): void {
    this.isLoading = true;
    this.planService.getAll().subscribe({
      next:  data => { this.plans = data; this.isLoading = false; },
      error: ()   => { this.isLoading = false; }
    });
  }

  get totalActive(): number { return this.evolutionPlans.length; }

  get totalCompleted(): number {
    return this.evolutionPlans.filter(p => (p.scoreGlobal ?? 0) >= 100).length;
  }

  get avgProgress(): number {
    if (!this.evolutionPlans.length) return 0;
    return Math.round(
      this.evolutionPlans.reduce((s, p) => s + (p.scoreGlobal ?? 0), 0) / this.evolutionPlans.length
    );
  }

  openForm(): void {
    const ref = this.dialog.open(CareerPlanFormComponent, {
      width: '640px', maxWidth: '95vw',
      data: { careers: this.careers }, panelClass: 'career-dialog'
    });
    ref.afterClosed().subscribe(result => { if (result) this.loadAll(); });
  }

  delete(plan: CareerPlan): void {
    if (!confirm(`Supprimer le plan de ${plan.employeeName} ?`)) return;
    this.planService.delete(plan.id!).subscribe({
      next: () => { this.snackBar.open('Supprime', 'OK', { duration: 3000 }); this.loadAll(); }
    });
  }

  getProgressColor(p: number): string {
    return p >= 80 ? '#16a34a' : p >= 50 ? '#d97706' : '#dc2626';
  }

  loadEvolutionPlans(): void {
    this.evolutionPlanService.getAll().subscribe({
      next: data => {
        const missingIds = [...new Set(data.map(p => p.employeeId))]
          .filter(id => id && !this.usersCache[id]);

        if (missingIds.length === 0) {
          this.evolutionPlans = this.enrichPlans(data);
          return;
        }

        this.http.get<any[]>('http://localhost:8081/api/users', { headers: this.getHeaders() })
          .pipe(catchError(() => of([])))
          .subscribe(users => {
            users.forEach(u => { this.usersCache[u.id] = u; });
            this.evolutionPlans = this.enrichPlans(data);
          });
      },
      error: () => {}
    });
  }

  openEvolutionPlan(p: EvolutionPlan): void {
    this.selectedPlan = {
      ...p,
      competencesActuelles:   parseCompetences(p),
      formationsRecommandees: p.formationsRecommandees ?? [],
      employeeName:           this.getUserName(p.employeeId),
      currentCareerTitle:     this.getCareerTitle(p.currentCareerId ?? ''),
      targetCareerTitle:      this.getCareerTitle(p.targetCareerId)
    };
    this.selectedCareer = this.getCareer(p.targetCareerId);
  }

  certifsTech(): EmployeeCertification[] {
    return (this.selectedPlan?.certifications ?? [])
      .filter(c => c.type === CertificationType.TECHNIQUE);
  }

  certifsSoft(): EmployeeCertification[] {
    return (this.selectedPlan?.certifications ?? [])
      .filter(c => c.type === CertificationType.SOFT_SKILL);
  }

  certifRequisesDuPoste(): any[] {
    return (this.selectedCareer as any)?.certifRequises ?? [];
  }

  competencesEmploye(): { nom: string; niveau: string; annees?: number }[] {
    if (!this.selectedPlan) return [];
    return parseCompetences(this.selectedPlan);
  }

  planScores(): { label: string; value: number; color: string }[] {
    if (!this.selectedPlan) return [];
    return [
      { label: 'Global',    value: this.selectedPlan.scoreGlobal    ?? 0, color: '#7c3aed' },
      { label: 'Technique', value: this.selectedPlan.scoreTechnique ?? 0, color: '#2563eb' },
      { label: 'Soft',      value: this.selectedPlan.scoreSoftSkill ?? 0, color: '#ea580c' }
    ];
  }

  addFormation(): void {
    if (!this.newFormation.trim() || !this.selectedPlan) return;
    this.selectedPlan.formationsRecommandees!.push(this.newFormation.trim());
    this.newFormation = '';
  }

  removeFormation(i: number): void {
    this.selectedPlan?.formationsRecommandees?.splice(i, 1);
  }

  saveEnrichissement(): void {
    if (!this.selectedPlan?.id) return;
    this.evolutionPlanService.enrichPlan(this.selectedPlan.id, {
      formationsRecommandees: this.selectedPlan.formationsRecommandees,
      commentaireAdmin:       this.selectedPlan.commentaireAdmin
    }).subscribe({
      next:  () => this.snackBar.open('Plan enrichi', 'OK', { duration: 3000 }),
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
    if (!this.selectedPlan?.id || !certif.id) return;
    const payload: any = {
      valideParAdmin:   certif.valideParAdmin,
      commentaireAdmin: certif.commentaireAdmin,
      obligatoire:      certif.obligatoire,
      nom:              certif.nom,
      type:             certif.type,
      statut:           certif.statut,
      methodeEval:      certif.methodeEval,
      niveauRequis:     certif.niveauRequis
    };
    if (certif.valideParAdmin === true) {
      payload.statut = 'OBTENU';
      certif.statut  = 'OBTENU' as any;
    }
    this.evolutionPlanService.updateCertification(
      this.selectedPlan.id, certif.id, payload
    ).subscribe({
      next: updatedPlan => {
        this.selectedPlan = {
          ...updatedPlan,
          competencesActuelles: parseCompetences(updatedPlan),
          employeeName:         this.getUserName(updatedPlan.employeeId),
          currentCareerTitle:   this.getCareerTitle(updatedPlan.currentCareerId ?? ''),
          targetCareerTitle:    this.getCareerTitle(updatedPlan.targetCareerId)
        };
        const idx = this.evolutionPlans.findIndex(p => p.id === updatedPlan.id);
        if (idx !== -1) this.evolutionPlans[idx] = this.enrichPlans([updatedPlan])[0];
        this.snackBar.open('Certif mise a jour', 'OK', { duration: 2500 });
      },
      error: () => this.snackBar.open('Erreur', 'Fermer', { duration: 3000 })
    });
  }

  evolutionStatusLabel(s: string): string {
    return ({ DRAFT: 'Brouillon', SUBMITTED: 'Soumis', REVIEWED: 'Examine',
              ACTIVE: 'Actif', COMPLETED: 'Complete' } as any)[s] ?? s;
  }

  evolutionStatusStyle(s: string): string {
    return ({
      DRAFT:     'background:#f3f4f6;color:#374151;',
      SUBMITTED: 'background:#fef9c3;color:#854d0e;',
      REVIEWED:  'background:#dcfce7;color:#166534;',
      ACTIVE:    'background:#ede9fe;color:#7c3aed;',
      COMPLETED: 'background:#dcfce7;color:#166534;'
    } as any)[s] ?? '';
  }

  certifStatusLabel(s: string): string {
    return ({ NON_COMMENCE: 'Non commence', EN_COURS: 'En cours', OBTENU: 'Obtenu' } as any)[s] ?? s;
  }

  certifStatusStyle(s: string): string {
    return ({
      NON_COMMENCE: 'background:#f3f4f6;color:#6b7280;',
      EN_COURS:     'background:#fef9c3;color:#854d0e;',
      OBTENU:       'background:#dcfce7;color:#166534;'
    } as any)[s] ?? '';
  }
}
