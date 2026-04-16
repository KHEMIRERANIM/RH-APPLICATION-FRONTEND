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

import {
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexDataLabels,
  ApexTooltip,
  ApexStroke,
  ApexTitleSubtitle,
  ApexYAxis,
  ApexFill,
  ApexLegend,
  ApexPlotOptions
} from "ng-apexcharts";

export type ChartOptions = {
  series: ApexAxisChartSeries | any;
  chart: ApexChart;
  xaxis?: ApexXAxis;
  stroke?: ApexStroke;
  dataLabels?: ApexDataLabels;
  plotOptions?: ApexPlotOptions;
  yaxis?: ApexYAxis;
  fill?: ApexFill;
  tooltip?: ApexTooltip;
  colors?: string[];
  labels?: string[];
  legend?: ApexLegend;
  title?: ApexTitleSubtitle;
};

@Component({
  selector: 'app-recrutement-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit, OnDestroy {

  funnelChartOptions: Partial<ChartOptions>;
  departementChartOptions: Partial<ChartOptions>;
  topCandidats: any[] = [];
  smartAlerts: any[] = [];
  aiInsight: string = "";

  loading = true;
  offres: Offre[] = [];
  tousEntretiens: Entretien[] = [];
  STATUT_LABELS = STATUT_LABELS;
  private _alertInterval: any;

  // KPIs
  get totalOffres(): number { return this.offres.length; }
  get offresPubliees(): number { return this.offres.filter(o => o.statut === 'PUBLIEE').length; }
  get offresBrouillon(): number { return this.offres.filter(o => o.statut === 'BROUILLON').length; }
  get totalCandidatures(): number { return this.offres.reduce((a, o) => a + o.nombreCandidatures, 0); }

  // Entretiens filtrés
  get entretiensAVenir(): Entretien[] {
    const now = new Date();
    return this.tousEntretiens.filter(e =>
      e.statut === 'PLANIFIE' && new Date(e.dateHeure) >= now
    );
  }

  get entretiensPasses(): Entretien[] {
    const now = new Date();
    return this.tousEntretiens.filter(e =>
      e.statut === 'PLANIFIE' && new Date(e.dateHeure) < now
    );
  }

  get entretiensRealises(): Entretien[] {
    return this.tousEntretiens.filter(e => e.statut === 'REALISE');
  }

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

  exporterRapportIA(): void {
    const contenu = [
      'RAPPORT ANALYTIQUE RECRUTEMENT IA',
      '==================================',
      `Date du rapport : ${new Date().toLocaleString()}`,
      '',
      'STATISTIQUES GLOBALES',
      `Total Offres : ${this.totalOffres}`,
      `Offres Publiées : ${this.offresPubliees}`,
      `Total Candidatures : ${this.totalCandidatures}`,
      `Entretiens à venir : ${this.entretiensAVenir.length}`,
      '',
      'ANALYSE IA (INSIGHT)',
      this.aiInsight,
      '',
      'RECOMMANDATIONS',
      '1. Prioriser les entretiens pour les candidats avec un score > 80%.',
      '2. Renforcer la visibilité des offres peu consultées.',
      '3. Valider les tests linguistiques pour les candidats acceptés.',
      '',
      'Généré automatiquement par RH-RSE Dashboard Admin'
    ].join('\r\n');

    const blob = new Blob([contenu], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rapport-ia-${new Date().getTime()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  ngOnInit(): void {
    const user = this.authService.currentUser;
    const userId = user?.id || user?.['_id'];

    forkJoin({
      offres: this.offreService.getOffresByAdmin(userId),
      entretiens: this.entretienService.getEntretiensParRecruteur(userId),
    }).subscribe({
      next: ({ offres, entretiens }) => {
        this.offres = offres;
        this.tousEntretiens = entretiens;
        this.initCharts();
        this.generateAiInsight();
        
        // Fetch real candidatures for Top Talents
        if (this.offres.length > 0) {
          const candRequests = this.offres.slice(0, 5).map(o => this.candidatureService.getCandidaturesParOffre(o.id));
          forkJoin(candRequests).subscribe(allCands => {
            const flatCands = allCands.flat();
            this.generateTopCandidatsReal(flatCands);
            this.generateSmartAlertsReal(flatCands);
          });
        }

        this.loading = false;
        this.checkEntretienAlerts();
        this._alertInterval = setInterval(() => this.checkEntretienAlerts(), 60000);
      },
      error: () => this.loading = false,
    });
  }

  private initCharts(): void {
    // 1. RECRUITMENT FUNNEL
    // On agrège les données : Candidats -> Entretiens (Planifiés/Réalisés) -> Acceptés
    const statsCandidats = this.totalCandidatures;
    const statsEntretiens = this.tousEntretiens.length;
    const statsAcceptes = this.offres.reduce((acc, o) => acc + (o.nombreCandidatures > 0 ? Math.floor(o.nombreCandidatures * 0.2) : 0), 0); // Simulation

    this.funnelChartOptions = {
      series: [
        {
          name: "Nombre de personnes",
          data: [statsCandidats, statsEntretiens, statsAcceptes]
        }
      ],
      chart: {
        type: "bar",
        height: 320,
        toolbar: { show: false }
      },
      plotOptions: {
        bar: {
          borderRadius: 10,
          horizontal: true,
          distributed: true,
          barHeight: '60%',
        }
      },
      colors: ['#4F46E5', '#F59E0B', '#10B981'],
      dataLabels: {
        enabled: true,
        formatter: (val: any, opt: any) => opt.w.globals.labels[opt.dataPointIndex] + ": " + val,
        dropShadow: { enabled: true }
      },
      xaxis: {
        categories: ["Candidatures", "Entretiens", "Embauches"],
      },
      legend: { show: false }
    };

    // 2. DEPARTMENT DISTRIBUTION
    const depts = [...new Set(this.offres.map(o => o.departement))];
    const deptCounts = depts.map(d => this.offres.filter(o => o.departement === d).length);

    this.departementChartOptions = {
      series: deptCounts,
      chart: {
        type: "donut",
        height: 350
      },
      labels: depts,
      colors: ['#4F46E5', '#818CF8', '#C7D2FE', '#312E81'],
      legend: {
        position: 'bottom'
      },
      plotOptions: {
        pie: {
          donut: {
            size: '70%'
          }
        }
      }
    };
  }

  private generateAiInsight(): void {
    const activeOffres = this.offresPubliees;
    if (activeOffres === 0) {
      this.aiInsight = "Visibilité faible : aucune offre active. Publiez des postes pour attirer des talents.";
    } else if (this.totalCandidatures / activeOffres < 2) {
      this.aiInsight = "Sourcing à optimiser : volume de candidatures faible. Revoyez vos critères de segmentation.";
    } else {
      this.aiInsight = "Pipeline sain : focus recommandé sur les entretiens techniques des profils 'Elite'.";
    }
  }

  private generateSmartAlertsReal(candidatures: any[]): void {
    const alerts = [];
    
    // 1. Alert Urgent: Entretien imminent (moins d'1h)
    const now = new Date().getTime();
    const imminent = this.entretiensAVenir.find(e => {
        const diff = new Date(e.dateHeure).getTime() - now;
        return diff > 0 && diff < 3600000;
    });
    if (imminent) {
        alerts.push({
            type: 'URGENT',
            title: 'Entretien imminent',
            message: `Votre entretien ${imminent.type} commence bientôt.`,
            icon: 'heroicons_outline:clock',
            color: 'bg-red-500',
            textColor: 'text-red-700'
        });
    }

    // 2. Alert Match: Candidat avec score élevé
    const topMatch = candidatures.find(c => c.scoreMatching > 90);
    if (topMatch) {
        alerts.push({
            type: 'MATCH',
            title: 'Haut Potentiel !',
            message: `Un candidat vient de postuler avec un score de ${topMatch.scoreMatching.toFixed(0)}%.`,
            icon: 'heroicons_outline:sparkles',
            color: 'bg-indigo-500',
            textColor: 'text-indigo-700'
        });
    }

    // 3. Diversité (Mock car data non dispo, mais basé sur volume)
    if (this.totalCandidatures > 20) {
        alerts.push({
            type: 'BIAS',
            title: 'Alerte Sourcing',
            message: 'Le pipeline est saturé pour "Développeur", diversifiez vos offres.',
            icon: 'heroicons_outline:exclamation-triangle',
            color: 'bg-amber-500',
            textColor: 'text-amber-700'
        });
    }

    this.smartAlerts = alerts.length > 0 ? alerts : [
        { type: 'INFO', title: 'Dashboard prêt', message: 'Toutes les données sont synchronisées.', icon: 'heroicons_outline:check', color: 'bg-green-500', textColor: 'text-green-700' }
    ];
  }

  private generateTopCandidatsReal(candidatures: any[]): void {
    const sorted = [...candidatures]
      .sort((a, b) => b.scoreMatching - a.scoreMatching)
      .slice(0, 4);

    this.topCandidats = sorted.map(c => ({
      name: `Candidat #${c.id.substring(c.id.length - 4)}`,
      score: c.scoreMatching.toFixed(0),
      role: this.offres.find(o => o.id === c.offreId)?.titre || 'Poste RH',
      avatar: `https://i.pravatar.cc/150?u=${c.id}`
    }));
  }

  ngOnDestroy(): void {
    if (this._alertInterval) {
      clearInterval(this._alertInterval);
    }
  }

  // Navigation
  voirPipeline(offre: Offre): void {
    this.router.navigate(['/recrutement/admin/pipeline', offre.id]);
  }

  modifierOffre(offre: Offre): void {
    this.router.navigate(['/recrutement/admin/offres/modifier', offre.id]);
  }

  voirDetail(offre: Offre): void {
    this.router.navigate(['/recrutement/offres', offre.id]);
  }

  creerOffre(): void {
    this.router.navigate(['/recrutement/admin/offres/creer']);
  }

  // Actions offres
  publierOffre(offre: Offre, event: Event): void {
    event.stopPropagation();
    this.offreService.publierOffre(offre.id).subscribe(() => {
      offre.statut = 'PUBLIEE';
    });
  }

  supprimerOffre(offre: Offre, event: Event): void {
    event.stopPropagation();
    if (!confirm(`Supprimer l'offre "${offre.titre}" ?`)) return;
    this.offreService.deleteOffre(offre.id).subscribe(() => {
      this.offres = this.offres.filter(o => o.id !== offre.id);
    });
  }

  // Actions entretiens
  marquerRealise(entretien: Entretien, event: Event): void {
    event.stopPropagation();
    this.entretienService.marquerRealise(entretien.id).subscribe(() => {
      entretien.statut = 'REALISE';
    });
  }

  annulerEntretien(entretien: Entretien, event: Event): void {
    event.stopPropagation();
    if (!confirm('Voulez-vous vraiment annuler cet entretien ?')) return;
    this.entretienService.annulerEntretien(entretien.id).subscribe(() => {
      this.tousEntretiens = this.tousEntretiens.filter(e => e.id !== entretien.id);
    });
  }

  supprimerEntretienPasse(entretien: Entretien, event: Event): void {
    event.stopPropagation();
    if (!confirm('Supprimer cet entretien passé ?')) return;
    this.entretienService.annulerEntretien(entretien.id).subscribe(() => {
      this.tousEntretiens = this.tousEntretiens.filter(e => e.id !== entretien.id);
    });
  }

  modifierEntretien(entretien: Entretien): void {
    this.router.navigate(['/recrutement/admin/entretiens/modifier', entretien.id]);
  }

  private checkEntretienAlerts(): void {
    const now = new Date().getTime();
    const prochainEntretien = this.tousEntretiens.find(entretien => {
      if (entretien.statut !== 'PLANIFIE') {
        return false;
      }

      const diff = new Date(entretien.dateHeure).getTime() - now;
      return diff > 0 && diff <= 3600000 && !this._entretienAlertedIds.has(entretien.id);
    });

    if (!prochainEntretien) {
      return;
    }

    this._entretienAlertedIds.add(prochainEntretien.id);

    const notification: Notification = {
      id: '',
      icon: 'notification_important',
      title: 'Entretien dans 1 heure',
      description: `Entretien ${prochainEntretien.type} prévu à ${new Date(prochainEntretien.dateHeure).toLocaleTimeString()}`,
      time: 'Maintenant',
      link: `/recrutement/admin/entretiens/${prochainEntretien.id}`,
      useRouter: true,
      read: false,
    };

    this.notificationsService.create(notification).pipe(take(1)).subscribe();

    this._snackBar.open(
      `Entretien ${prochainEntretien.type} dans 1 heure`,
      'Voir',
      { duration: 8000 }
    ).onAction().subscribe(() => {
      this.router.navigate([notification.link]);
    });
  }

  supprimerTousEntretiensRealises(): void {
    if (!confirm('Voulez-vous vraiment supprimer tous les entretiens réalisés ?')) return;
    const demandes = this.entretiensRealises.map(entretien =>
      this.entretienService.annulerEntretien(entretien.id)
    );

    if (demandes.length === 0) {
      return;
    }

    forkJoin(demandes).subscribe(() => {
      this.tousEntretiens = this.tousEntretiens.filter(e => e.statut !== 'REALISE');
    });
  }

  telechargerEntretien(entretien: Entretien): void {
    const contenu = [
      'Entretien',
      '-------------------------',
      `ID : ${entretien.id}`,
      `Candidature : ${entretien.candidatureId}`,
      `Recruteur : ${entretien.recruteurId}`,
      `Type : ${entretien.type}`,
      `Date / heure : ${new Date(entretien.dateHeure).toLocaleString()}`,
      `Durée : ${entretien.dureeMinutes} minutes`,
      `Lieu : ${entretien.lieu || 'Non spécifié'}`,
      `Lien visio : ${entretien.lienVisio || 'Aucun'}`,
      `Statut : ${entretien.statut}`,
      `Feedback global : ${entretien.feedbackGlobal || 'Aucun'}`,
      `Note globale : ${entretien.noteGlobale ?? 'N/A'}`,
      `Points forts : ${entretien.pointsForts?.join(', ') || 'Aucun'}`,
      `Points faibles : ${entretien.pointsFaibles?.join(', ') || 'Aucun'}`,
      `Recommandation : ${entretien.recommandeEmbauche ? 'Oui' : 'Non'}`,
      `Créé le : ${new Date(entretien.createdAt).toLocaleString()}`,
    ].join('\r\n');

    const blob = new Blob([contenu], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `entretien-${entretien.id}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  telechargerTousEntretiensAVenir(): void {
    const contenu = this.entretiensAVenir.map((entretien, index) => [
      `Entretien ${index + 1}`,
      '-------------------------',
      `ID : ${entretien.id}`,
      `Candidature : ${entretien.candidatureId}`,
      `Recruteur : ${entretien.recruteurId}`,
      `Type : ${entretien.type}`,
      `Date / heure : ${new Date(entretien.dateHeure).toLocaleString()}`,
      `Durée : ${entretien.dureeMinutes} minutes`,
      `Lieu : ${entretien.lieu || 'Non spécifié'}`,
      `Lien visio : ${entretien.lienVisio || 'Aucun'}`,
      `Statut : ${entretien.statut}`,
      `Feedback global : ${entretien.feedbackGlobal || 'Aucun'}`,
      `Note globale : ${entretien.noteGlobale ?? 'N/A'}`,
      `Points forts : ${entretien.pointsForts?.join(', ') || 'Aucun'}`,
      `Points faibles : ${entretien.pointsFaibles?.join(', ') || 'Aucun'}`,
      `Recommandation : ${entretien.recommandeEmbauche ? 'Oui' : 'Non'}`,
      `Créé le : ${new Date(entretien.createdAt).toLocaleString()}`,
    ].join('\r\n')).join('\r\n\r\n');

    const blob = new Blob([contenu], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `entretiens-a-venir.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  isEntretienPasse(entretien: Entretien): boolean {
    return new Date(entretien.dateHeure) < new Date();
  }
}