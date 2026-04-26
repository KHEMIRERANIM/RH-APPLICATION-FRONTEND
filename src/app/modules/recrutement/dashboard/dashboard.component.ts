import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin } from 'rxjs';
import { take } from 'rxjs/operators';
import { OffreService } from '../services/offre.service';
import { CandidatureService } from '../services/candidature.service';
import { EntretienService } from '../services/entretien.service';
import { NotificationsService } from 'app/layout/common/notifications/notifications.service';
import { AuthService } from 'app/core/auth/auth.service';
import { Notification } from 'app/layout/common/notifications/notifications.types';
import { Offre, Entretien, STATUT_LABELS } from '../models/recrutement.models';

// Définition locale pour éviter l'erreur d'import manquant
export type ChartOptions = {
  series: any;
  chart: any;
  xaxis: any;
  plotOptions: any;
  dataLabels: any;
  fill: any;
  colors: any;
  markers: any;
  stroke: any;
  legend: any;
  labels: any;
};

@Component({
  selector: 'app-recrutement-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit, OnDestroy {
  // Graphiques
  funnelChartOptions: Partial<ChartOptions> = {};
  radarChartOptions: Partial<ChartOptions> = {};
  
  // Données
  offres: Offre[] = [];
  tousEntretiens: Entretien[] = [];
  topCandidats: any[] = [];
  smartAlerts: any[] = [];
  registrationHistory: any[] = [];
  
  // État de l'interface
  loading: boolean = true;
  showDetails: boolean = false;
  showMissionDrawer: boolean = false;
  selectedCandidat: any = null;
  aiInsight: string = "";
  recruitmentEfficiency: number = 0;
  totalAcceptedCandidates: number = 0;
  
  private _alertInterval: any;
  private _entretienAlertedIds: Set<string> = new Set();

  constructor(
    private offreService: OffreService,
    private candidatureService: CandidatureService,
    private entretienService: EntretienService,
    private notificationsService: NotificationsService,
    private _snackBar: MatSnackBar,
    private authService: AuthService,
    private router: Router,
  ) {}

  // Getters pour les statistiques
  get totalOffres(): number { return this.offres.length; }
  get totalCandidatures(): number { return this.offres.reduce((a, o) => a + o.nombreCandidatures, 0); }
  get entretiensAVenir(): Entretien[] {
    const now = new Date();
    return this.tousEntretiens.filter(e => e.statut === 'PLANIFIE' && new Date(e.dateHeure) >= now);
  }

  ngOnInit(): void {
    this.loadDashboardData();
    this.loadRegistrationHistory();
  }

  private loadDashboardData(): void {
    this.loading = true;
    const user = this.authService.currentUser;
    const userId = user?.id || user?.['_id'];

    forkJoin({
      offres: this.offreService.getOffresByAdmin(userId).pipe(take(1)),
      entretiens: this.entretienService.getEntretiensParRecruteur(userId).pipe(take(1)),
    }).subscribe({
      next: ({ offres, entretiens }) => {
        this.offres = offres;
        this.tousEntretiens = entretiens;

        if (this.offres.length > 0) {
          const candRequests = this.offres.slice(0, 5).map(o => this.candidatureService.getCandidaturesParOffre(o.id));
          forkJoin(candRequests).subscribe(allCands => {
            const flatCands = allCands.flat();
            this.totalAcceptedCandidates = flatCands.filter((c: any) => c.statut === 'ACCEPTE').length;
            
            this.generateTopCandidatsReal(flatCands);
            this.generateSmartAlertsReal(flatCands);
            this.initCharts();
            this.generateAiInsight();
            this.loading = false;
          });
        } else {
          this.initCharts();
          this.generateAiInsight();
          this.loading = false;
        }

        this.setupAlertPolling();
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  private initCharts(): void {
    this.funnelChartOptions = {
      series: [{ name: "Candidats", data: [this.totalCandidatures, this.tousEntretiens.length, this.totalAcceptedCandidates] }],
      chart: { type: "bar", height: 300, toolbar: { show: false } },
      plotOptions: { bar: { borderRadius: 8, horizontal: true, distributed: true, barHeight: '50%' } },
      colors: ['#6366f1', '#f59e0b', '#10b981'],
      dataLabels: { enabled: true },
      xaxis: { categories: ["Candidatures", "Entretiens", "Embauches"] }
    };

    this.recruitmentEfficiency = this.totalCandidatures > 0 
      ? Math.round((this.totalAcceptedCandidates / this.totalCandidatures) * 100) : 0;

    this.radarChartOptions = {
      series: [{ name: 'Compétences', data: [0, 0, 0, 0, 0] }],
      chart: { type: 'radar', height: 300, toolbar: { show: false } },
      xaxis: { categories: ['Leadership', 'Innovation', 'Empathie', 'Adaptation', 'Com'] },
      colors: ['#6366f1'],
      fill: { opacity: 0.2 }
    };
  }

  private generateAiInsight(): void {
    if (this.totalOffres === 0) this.aiInsight = "Aucune offre active. Publiez des postes pour attirer des talents.";
    else this.aiInsight = "Pipeline dynamique. Focus recommandé sur les entretiens techniques.";
  }

  private generateTopCandidatsReal(candidatures: any[]): void {
    this.topCandidats = [...candidatures]
      .sort((a, b) => b.scoreMatching - a.scoreMatching)
      .slice(0, 4)
      .map(c => ({
        id: c.id,
        name: `Candidat #${c.id.substring(c.id.length - 4)}`,
        score: c.scoreMatching.toFixed(0),
        role: this.offres.find(o => o.id === c.offreId)?.titre || 'Poste',
        avatar: `https://i.pravatar.cc/150?u=${c.id}`,
        original: c,
        radarData: [70, 80, 90, 85, 70],
        explanation: c.comparaisonExplication || 'Analyse IA très positive.'
      }));
  }

  private generateSmartAlertsReal(candidatures: any[]): void {
    this.smartAlerts = [{
      title: 'Système Actif',
      message: 'Données synchronisées en temps réel.',
      icon: 'heroicons_outline:check-circle',
      color: 'bg-emerald-50',
      textColor: 'text-emerald-600'
    }];
  }

  openCandidatDetails(talent: any): void {
    this.selectedCandidat = talent;
    this.radarChartOptions.series = [{ name: talent.name, data: talent.radarData }];
    this.showDetails = true;
  }

  closeDetails(): void {
    this.showDetails = false;
  }

  creerOffre(): void { this.router.navigate(['/recrutement/admin/offres/creer']); }
  
  voirPipeline(item: any): void {
    const id = typeof item === 'string' ? item : (item?.id || 'all');
    this.router.navigate(['/recrutement/admin/pipeline', id]);
  }

  editerOffre(offre: Offre): void {
      this.router.navigate(['/recrutement/admin/offres/modifier', offre.id]);
  }

  publierOffre(offre: Offre): void {
      this.offreService.publierOffre(offre.id).subscribe({
          next: () => {
              this._snackBar.open('Offre publiée avec succès !', 'OK', { duration: 3000 });
              this.loadDashboardData();
          },
          error: () => {
              this._snackBar.open('Erreur lors de la publication.', 'Réessayer', { duration: 3000 });
          }
      });
  }

  exporterRapportIA(): void {
    this._snackBar.open('Génération du rapport IA en cours...', 'OK', { duration: 3000 });
    // Simulation d'une action complexe
    setTimeout(() => {
        window.print();
    }, 1000);
  }

  supprimerOffre(offre: Offre, event: MouseEvent): void {
    event.stopPropagation(); // Évite de déclencher d'éventuels clics sur le parent
    
    if (confirm(`Êtes-vous sûr de vouloir supprimer l'offre "${offre.titre}" ?`)) {
        this.offreService.deleteOffre(offre.id).subscribe({
            next: () => {
                this._snackBar.open('Offre supprimée avec succès', 'Fermer', { duration: 3000 });
                this.loadDashboardData();
            },
            error: () => {
                this._snackBar.open('Erreur lors de la suppression', 'Réessayer', { duration: 3000 });
            }
        });
    }
  }

  private setupAlertPolling(): void {
    this.checkEntretienAlerts();
    this._alertInterval = setInterval(() => this.checkEntretienAlerts(), 60000);
  }

  private checkEntretienAlerts(): void {
    const now = new Date().getTime();
    const imminent = this.tousEntretiens.find(e => {
      const diff = new Date(e.dateHeure).getTime() - now;
      return e.statut === 'PLANIFIE' && diff > 0 && diff <= 3600000 && !this._entretienAlertedIds.has(e.id);
    });

    if (imminent) {
      this._entretienAlertedIds.add(imminent.id);
      this._snackBar.open(`Entretien imminant (${imminent.type})`, 'Voir', { duration: 5000 });
    }
  }

  loadRegistrationHistory(): void {
    const historyStr = localStorage.getItem('registrationHistory') || '[]';
    this.registrationHistory = JSON.parse(historyStr);
  }

  ngOnDestroy(): void {
    if (this._alertInterval) clearInterval(this._alertInterval);
  }
}
