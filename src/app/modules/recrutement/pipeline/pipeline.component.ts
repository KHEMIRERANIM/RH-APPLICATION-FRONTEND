import { Component, OnInit, ViewChild } from '@angular/core';
import {
  ApexAxisChartSeries,
  ApexTitleSubtitle,
  ApexChart,
  ApexXAxis,
  ApexStroke,
  ApexFill,
  ApexMarkers,
  ApexPlotOptions,
  ChartComponent
} from "ng-apexcharts";
import { ActivatedRoute, Router } from '@angular/router';
import { CandidatureService } from '../services/candidature.service';
import { OffreService } from '../services/offre.service';
import {
  Candidature,
  Offre,
  KanbanData,
  StatutCandidature,
  STATUT_LABELS,
  STATUT_COLORS,
  KANBAN_COLUMNS,
  ChangerStatutRequest,
} from '../models/recrutement.models';

export type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  title: ApexTitleSubtitle;
  stroke: ApexStroke;
  fill: ApexFill;
  markers: ApexMarkers;
  xaxis: ApexXAxis;
  plotOptions: ApexPlotOptions;
};

@Component({
  selector: 'app-pipeline',
  templateUrl: './pipeline.component.html',
  standalone: false,
})
export class PipelineComponent implements OnInit {

  offre: Offre | null = null;
  kanban: KanbanData = {};
  loading = true;

  selectedCandidature: Candidature | null = null;
  notesText = '';
  savingNotes = false;
  changingStatut = false;

  // ApexCharts Radar
  @ViewChild("chart") chart: ChartComponent | undefined;
  public radarChartOptions: Partial<ChartOptions> | any;

  // Modernization: Sort & Analytics
  columnSortMap: Record<string, 'SCORE' | 'DATE'> = {
    'NOUVEAU': 'SCORE',
    'EN_COURS_ANALYSE': 'SCORE',
    'ENTRETIEN_RH': 'DATE',
    'ENTRETIEN_TECHNIQUE': 'DATE',
    'TEST_TECHNIQUE': 'SCORE',
    'OFFRE_ENVOYEE': 'SCORE',
    'ACCEPTE': 'DATE',
    'REFUSE': 'DATE'
  };

  STATUT_LABELS = STATUT_LABELS;
  STATUT_COLORS = STATUT_COLORS;
  KANBAN_COLUMNS = KANBAN_COLUMNS;

  get allStatuts(): StatutCandidature[] {
    return KANBAN_COLUMNS;
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private candidatureService: CandidatureService,
    private offreService: OffreService,
  ) {
    this.initRadarChart();
  }

  ngOnInit(): void {
    const offreId = this.route.snapshot.paramMap.get('offreId');
    if (!offreId) { this.router.navigate(['/recrutement/admin/offres']); return; }

    this.offreService.getOffreById(offreId).subscribe(o => this.offre = o);
    this.loadKanban(offreId);
  }

  loadKanban(offreId?: string): void {
    const id = offreId || this.offre?.id;
    if (!id) return;
    this.loading = true;
    this.candidatureService.getKanban(id).subscribe({
      next: (data) => {
        this.kanban = data;
        // Appliquer le tri par défaut
        for (const statut of this.allStatuts) {
           this.applySort(statut as StatutCandidature);
        }
        this.loading = false;
      },
      error: () => this.loading = false,
    });
  }

  private applySort(statut: StatutCandidature): void {
    const sortType = this.columnSortMap[statut] || 'SCORE';
    const list = this.kanban[statut];
    if (!list) return;

    if (sortType === 'SCORE') {
      list.sort((a, b) => (b.scoreMatching || 0) - (a.scoreMatching || 0));
    } else {
      list.sort((a, b) => new Date(b.dateDerniereMAJ || b.datePostulation).getTime() - new Date(a.dateDerniereMAJ || a.datePostulation).getTime());
    }
  }

  toggleSort(statut: StatutCandidature): void {
    this.columnSortMap[statut] = this.columnSortMap[statut] === 'SCORE' ? 'DATE' : 'SCORE';
    this.applySort(statut);
  }

  getColumnAverageScore(statut: StatutCandidature): number {
    const list = this.getCandidaturesForStatut(statut).filter(c => c.scoreMatching > 0);
    if (list.length === 0) return 0;
    const sum = list.reduce((acc, c) => acc + c.scoreMatching, 0);
    return Math.round(sum / list.length);
  }

  getDaysInStage(date: any): number {
    if (!date) return 0;
    const diff = new Date().getTime() - new Date(date).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  getAiRecommendation(c: Candidature): { action: string, reason: string, color: string } {
    if (c.scoreMatching >= 85) return { action: 'Prioriser', reason: 'Profil expert, matching exceptionnel.', color: 'text-indigo-600' };
    if (c.scoreMatching >= 70) return { action: 'Engager', reason: 'Candidat solide, valider le soft-skills.', color: 'text-blue-600' };
    if (c.scoreMatching > 0 && c.scoreMatching < 40) return { action: 'Rejeter', reason: 'Écart de compétences trop important.', color: 'text-red-600' };
    return { action: 'Analyser', reason: 'Compléter l\'évaluation manuelle.', color: 'text-gray-600' };
  }

  getCandidaturesForStatut(statut: StatutCandidature): Candidature[] {
    return this.kanban[statut] || [];
  }

  getTotalCandidatures(): number {
    return KANBAN_COLUMNS.reduce((acc, s) => acc + (this.kanban[s]?.length || 0), 0);
  }

  selectCandidature(c: Candidature): void {
    this.selectedCandidature = c;
    this.notesText = c.notesRecruteur || '';
    this.updateRadarChart(c);
  }

  private initRadarChart(): void {
    this.radarChartOptions = {
      series: [
        {
          name: "Score IA",
          data: [0, 0, 0, 0, 0]
        }
      ],
      chart: {
        height: 300,
        type: "radar",
        toolbar: { show: false },
        dropShadow: {
            enabled: true,
            blur: 8,
            left: 1,
            top: 1,
            opacity: 0.2
        }
      },
      plotOptions: {
        radar: {
          polygons: {
            strokeColors: "#e8e8e8",
            fill: {
              colors: ["#f8f8f8", "#fff"]
            }
          }
        }
      },
      title: {
        text: ""
      },
      stroke: {
        width: 3,
        colors: ["#4F46E5"] // Indigo-600
      },
      fill: {
        opacity: 0.4,
        colors: ["#4F46E5"]
      },
      markers: {
        size: 4,
        colors: ["#fff"],
        strokeColors: ["#4F46E5"],
        strokeWidth: 2
      },
      xaxis: {
        categories: ["Leadership", "Innovation", "Empathie", "Adaptabilité", "Communication"],
        labels: {
            show: true,
            style: {
                colors: ["#64748b", "#64748b", "#64748b", "#64748b", "#64748b"],
                fontSize: "11px",
                fontWeight: 800
            }
        }
      }
    };
  }

  private updateRadarChart(c: Candidature): void {
    if (!c.scoreLeadership) return;
    
    this.radarChartOptions.series = [{
      name: "Score IA",
      data: [
        c.scoreLeadership,
        c.scoreInnovation,
        c.scoreEmpathie,
        c.scoreAdaptabilite,
        c.scoreCommunication
      ]
    }];
  }

  closePanel(): void {
    this.selectedCandidature = null;
  }

  changerStatut(nouveauStatut: StatutCandidature): void {
    if (!this.selectedCandidature) return;
    this.directMove(this.selectedCandidature, nouveauStatut);
  }

  directMove(c: Candidature, nouveauStatut: StatutCandidature): void {
    if (this.changingStatut || c.statut === nouveauStatut) return;
    
    this.changingStatut = true;
    const req: ChangerStatutRequest = { nouveauStatut, commentaire: 'Mouvement rapide via Pipeline' };
    
    this.candidatureService.changerStatut(c.id, req).subscribe({
      next: () => {
        this.changingStatut = false;
        if (this.selectedCandidature?.id === c.id) {
          this.closePanel();
        }
        this.loadKanban();
      },
      error: () => this.changingStatut = false,
    });
  }

  sauvegarderNotes(): void {
    if (!this.selectedCandidature) return;
    this.savingNotes = true;
    this.candidatureService.ajouterNotes(this.selectedCandidature.id, this.notesText).subscribe({
      next: (updated) => {
        this.savingNotes = false;
        this.selectedCandidature = updated;
      },
      error: () => this.savingNotes = false,
    });
  }

  planifierEntretien(): void {
    if (!this.selectedCandidature) return;
    this.router.navigate(['/recrutement/admin/entretiens/planifier'], {
      queryParams: { candidatureId: this.selectedCandidature.id }
    });
  }

  scoreColor(score: number): string {
    if (score >= 75) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-500';
  }

  scoreBg(score: number): string {
    if (score >= 75) return 'bg-green-100';
    if (score >= 50) return 'bg-yellow-100';
    return 'bg-red-100';
  }

  telechargerContrat(): void {
    if (!this.selectedCandidature) return;
    this.candidatureService.telechargerContratPdf(this.selectedCandidature.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `contrat_${this.selectedCandidature?.candidatId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
      },
      error: (err) => console.error("Erreur téléchargement contrat", err)
    });
  }

  retour(): void {
    this.router.navigate(['/recrutement/admin/offres']);
  }
}
