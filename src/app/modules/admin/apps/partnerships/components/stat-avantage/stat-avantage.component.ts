import { Component, OnInit, ViewChildren, QueryList } from '@angular/core';
import { PartnershipsService } from '../../services/partnerships.service';
import { StatAvantageKpi, StatCategorie, StatTopOffre, StatMensuelle, StatStatut } from '../../models/partnerships.models';
import { ChartConfiguration, ChartData, ChartType, Chart, registerables } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

Chart.register(...registerables);

@Component({
  selector: 'app-stat-avantage',
  templateUrl: './stat-avantage.component.html',
  styleUrls: ['./stat-avantage.component.scss']
})
export class StatAvantageComponent implements OnInit {

  @ViewChildren(BaseChartDirective) charts: QueryList<BaseChartDirective> | undefined;

  kpis: StatAvantageKpi | null = null;
  anneeSelectionnee: number = new Date().getFullYear();

  // Chart: Répartition par catégorie (Pie)
  public pieChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20 } },
    }
  };
  public pieChartData: ChartData<'pie', number[], string | string[]> = { labels: [], datasets: [] };
  public pieChartType: ChartType = 'pie';

  // Chart: Top 5 Offres (Bar Horizontale)
  public barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y', // Barres horizontales
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: { grid: { display: false }, border: { display: false } },
      y: { grid: { display: false }, border: { display: false } }
    }
  };
  public barChartData: ChartData<'bar', number[], string | string[]> = { labels: [], datasets: [] };
  public barChartType: ChartType = 'bar';

  // Chart: Evoultion Mensuelle (Line)
  public lineChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { usePointStyle: true } },
    },
    scales: {
      x: { grid: { display: false } },
      y: { border: { display: false } } // Subtle horizontal guides
    }
  };
  public lineChartData: ChartData<'line', number[], string | string[]> = { labels: [], datasets: [] };
  public lineChartType: ChartType = 'line';

  // Chart: Répartition Statuts (Doughnut)
  public doughnutChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20 } },
    }
  };
  public doughnutChartData: ChartData<'doughnut', number[], string | string[]> = { labels: [], datasets: [] };
  public doughnutChartType: ChartType = 'doughnut';

  constructor(private partnershipsService: PartnershipsService) {
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    // 1. KPIs
    this.partnershipsService.getKpisAvantages().subscribe(data => {
      this.kpis = data;
    });

    // 2. Catégories
    this.partnershipsService.getStatParCategorie().subscribe(data => {
      this.pieChartData = {
        labels: data.map(d => d.categorie || 'Autre'),
        datasets: [{
          data: data.map(d => d.count),
          // Professional monochromatic indigo palette
          backgroundColor: ['#4338ca', '#6366f1', '#a5b4fc', '#e0e7ff'],
          hoverBackgroundColor: ['#3730a3', '#4f46e5', '#818cf8', '#c7d2fe'],
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      };
      this.forceUpdateAllCharts();
    });

    // 3. Top 5 Offres
    this.partnershipsService.getTopOffres().subscribe(data => {
      this.barChartData = {
        labels: data.map(d => d.titreOffre || 'Non défini'),
        datasets: [{
          data: data.map(d => d.count),
          label: 'Réservations',
          backgroundColor: '#6366f1', // Indigo instead of green for consistency
          hoverBackgroundColor: '#4f46e5',
          barPercentage: 0.6, // Flatter, elegant bars
          borderRadius: 6
        }]
      };
      this.forceUpdateAllCharts();
    });

    // 4. Statuts (CONFIRMÉE vs ANNULÉE)
    this.partnershipsService.getStatStatuts().subscribe(data => {
      this.doughnutChartData = {
        labels: data.map(d => d.statut),
        datasets: [{
          data: data.map(d => d.count),
          // Muted slate for cancelled, indigo for confirmed, slate-300 for pending
          backgroundColor: ['#6366f1', '#94a3b8', '#cbd5e1'],
          hoverBackgroundColor: ['#4f46e5', '#64748b', '#94a3b8'],
          borderWidth: 0 // No borders for a clean look
        }]
      };
      this.forceUpdateAllCharts();
    });

    // 5. Par Mois (selon année)
    this.loadMois();
  }

  loadMois(): void {
    this.partnershipsService.getStatParMois(this.anneeSelectionnee).subscribe(data => {
      const nomMois = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
      this.lineChartData = {
        labels: data.map(d => nomMois[d.mois - 1]),
        datasets: [{
          data: data.map(d => d.count),
          label: 'Réservations',
          backgroundColor: 'rgba(99, 102, 241, 0.1)', // Very soft indigo fill
          borderColor: '#4f46e5', // Solid Indigo line
          pointBackgroundColor: '#ffffff',
          pointBorderColor: '#4f46e5',
          pointHoverBackgroundColor: '#4f46e5',
          pointHoverBorderColor: '#ffffff',
          pointRadius: 4,
          pointBorderWidth: 2,
          pointHoverRadius: 6,
          fill: 'origin',
          tension: 0.4, // Courbe smooth
          borderWidth: 3
        }]
      };
      this.forceUpdateAllCharts();
    });
  }

  onYearChange(): void {
    this.loadMois();
  }

  forceUpdateAllCharts(): void {
    if (this.charts) {
      this.charts.forEach(chart => chart.update());
    }
  }

  hasData(chartData: ChartData<any, any, any>): boolean {
    return chartData?.datasets?.length > 0 && chartData.datasets[0]?.data?.length > 0;
  }
}
