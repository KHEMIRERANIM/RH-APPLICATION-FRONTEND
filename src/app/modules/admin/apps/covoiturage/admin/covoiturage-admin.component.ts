import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { BusService, Bus, BusPackRequest } from '../bus.service';
import { CovoiturageService } from '../covoiturage.service';
import { forkJoin, of } from 'rxjs';
import { UserService } from '../../../../../services/user.service';
import { catchError } from 'rxjs/operators';
import { PredictionService } from '../services/prediction.service';
import { ReclamationService, Reclamation } from '../services/reclamation.service';
import { NotificationsService } from 'app/layout/common/notifications/notifications.service';
import { WalkingService } from '../services/walking.service';
import { ToastrService } from 'ngx-toastr';
import { FuseConfirmationService } from '@fuse/services/confirmation';

declare var L: any;

import {
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexDataLabels,
  ApexStroke,
  ApexYAxis,
  ApexTitleSubtitle,
  ApexLegend,
  ApexFill,
  ApexTooltip,
  ApexResponsive,
  ApexPlotOptions,
  ApexGrid
} from 'ng-apexcharts';

export type ChartOptions = {
  series: ApexAxisChartSeries | any;
  chart: ApexChart | any;
  xaxis: ApexXAxis | any;
  yaxis: ApexYAxis | any;
  dataLabels: ApexDataLabels | any;
  grid: ApexGrid | any;
  stroke: ApexStroke | any;
  title: ApexTitleSubtitle | any;
  legend: ApexLegend | any;
  fill: ApexFill | any;
  tooltip: ApexTooltip | any;
  responsive: ApexResponsive[] | any;
  plotOptions: ApexPlotOptions | any;
  colors: string[] | any;
  labels: string[] | any;
};

type AdminSection = 'statistiques' | 'navettes' | 'reservations' | 'cadeaux' | 'reclamations';
type ReservationType = 'navette' | 'covoiturage' | 'archive';

interface Reservation {
  id: number;
  employeNom: string;
  employePhoto: string;
  type: 'navette' | 'covoiturage';
  trajet: string;
  date: string;
  heure: string;
  statut: 'Confirmée' | 'En attente' | 'Annulée';
}

interface Cadeau {
  id: number;
  titre: string;
  description: string;
  points: number;
  stock: number;
  echanges: number;
  actif: boolean;
  image: string;
  icon: string;
}

interface PackBusEntry {
  statut: 'ACTIF' | 'INACTIF';
  capacite: number;
  marque: string;
  modele: string;
  immatriculation: string;
}

@Component({
  selector: 'app-covoiturage-admin',
  standalone: false,
  templateUrl: './covoiturage-admin.component.html',
  styleUrls: ['./covoiturage-admin.component.css']
})
export class CovoiturageAdminComponent implements OnInit {
  protected Math = Math;

  activeSection: AdminSection = 'statistiques';
  reservationType: ReservationType = 'covoiturage';
  archivedReservations: any[] = [];

  searchTerm = '';
  isLoading = false;
  errorMessage = '';
  showModal = false;
  isEditing = false;
  submitted = false;
  defaultPhotoUrl = 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400';

  createBusPack = false;
  packBusList: PackBusEntry[] = [];
  packDates: string[] = [];
  minDate: string = '';
  maxDate: string = '';
  arretInput = '';
  searchSuggestions: any[] = [];
  isSearching = false;
  private searchTimeout: any;
  busForm: Bus = this.emptyBus();

  navettes: Bus[] = [];
  reservationsNavette: any[] = [];
  employesMap: Map<string, string> = new Map();
  employeDetailsMap: Map<string, any> = new Map();
  notifications: any[] = [];

  typeCarburantOptions = ['DIESEL', 'ESSENCE', 'ELECTRIQUE', 'HYBRIDE'];
  statutOptions = ['ACTIF', 'INACTIF', 'EN_MAINTENANCE'];
  joursOptions = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  joursSelectionnes: string[] = [];
  ligneOptions = [
    '-',
    'Gare Centrale - Siège Social',
    'Métro Ligne 1 - Zone Industrielle',
    'Tunis Centre - Berges du Lac',
    'Place Barcelone - Ariana',
    'Bab Souika - Manouba'
  ];

  reservations: any[] = [];
  trajets: any[] = [];

  cadeaux: Cadeau[] = [];

  // ApexCharts
  chartMobility: Partial<ChartOptions>;
  chartEco: Partial<ChartOptions>;
  chartDaily: Partial<ChartOptions>;

  syncWithFleet: boolean = false;
  relatedBuses: Bus[] = [];

  co2Chart: any;
  departureZonesChart: any;
  departureZonesData: any[] = [];
  weeklyChart: any;
  fleetPerformanceChart: any;
  dateDistributionChart: any;

  // Météo
  currentWeather: any = {
    temp: 0,
    condition: 'Ensoleillé',
    icon: 'feather:sun',
    humidity: 45,
    wind: 12,
    location: 'Tunis, TN',
    date: ''
  };
  weatherForecast: any[] = [];

  // Heatmap & Reclamations
  reclamations: Reclamation[] = [];
  reclamationStats: any[] = [];
  employeUsageFreq: Map<string, number> = new Map();
  get maxReclamations(): number {
    if (!this.reclamationStats || this.reclamationStats.length === 0) return 1;
    return Math.max(...this.reclamationStats.map(s => s.count));
  }
  private heatmapMap: any;
  private heatmapLayer: any;
  private stopPickerMap: any;
  private stopPickerMarker: any;
  selectedLat: number | null = null;
  selectedLng: number | null = null;

  // Propriétés Prédiction
  weeklyPredictions: any[] = [];
  predictionTotal: number = 0;
  predictionAverage: number = 0;
  isLoadingPrediction: boolean = false;

  // Sunday Alert
  sundayAlertMessage: string = '🔔 Rappel : Pensez à activer les bus pour la semaine prochaine !';

  constructor(
    private busService: BusService,
    private covoiturageService: CovoiturageService,
    private userService: UserService,
    private predictionService: PredictionService,
    private reclamationService: ReclamationService,
    private notificationsService: NotificationsService,
    private _walkingService: WalkingService,
    private _changeDetectorRef: ChangeDetectorRef,
    private _toastrService: ToastrService,
    private _fuseConfirmationService: FuseConfirmationService
  ) { }

  private initSundayScheduler(): void {
    setInterval(() => {
      this.checkSundayCondition();
    }, 30000);
    this.checkSundayCondition();
  }

  archiveReservation(res: any): void {
    const dialogRef = this._fuseConfirmationService.open({
      title: 'Archiver la réservation',
      message: 'Voulez-vous archiver cette réservation ?',
      icon: { show: true, name: 'heroicons_outline:archive', color: 'primary' },
      actions: { confirm: { label: 'Archiver', color: 'primary' } }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result === 'confirmed') {
        const archived = { ...res, archivedAt: new Date().toISOString() };
        this.archivedReservations.push(archived);
        localStorage.setItem('archivedReservations', JSON.stringify(this.archivedReservations));
        this.reservations = this.reservations.filter(r => r.id !== res.id);
        this._toastrService.success('Réservation archivée');
        this._changeDetectorRef.detectChanges();
      }
    });
  }

  private checkSundayCondition(): void {
    const now = new Date();
    const isSunday = now.getDay() === 0;
    const isAfter17h = now.getHours() >= 17;

    if (isSunday && isAfter17h) {
      const todayKey = `sunday_alert_${now.getFullYear()}_${now.getMonth()}_${now.getDate()}`;
      const alreadyShown = localStorage.getItem(todayKey);

      if (!alreadyShown) {
        this.notificationsService.addLocalNotification({
          id: 'sunday-bus-activation',
          icon: 'heroicons_outline:truck',
          title: 'Activation des bus',
          description: this.sundayAlertMessage,
          time: now.toISOString(),
          read: false,
          type: 'ACTIVATION_BUS'
        });
        localStorage.setItem(todayKey, 'true');
        this.notificationsService.getAll().subscribe();
        this._changeDetectorRef.detectChanges();
      }
    }
  }

  dismissSundayAlert(): void { }

  ngOnInit(): void {
    const saved = localStorage.getItem('archivedReservations');
    if (saved) {
      this.archivedReservations = JSON.parse(saved);
    }
    const savedRec = localStorage.getItem('archivedReclamations');
    if (savedRec) {
      this.archivedReclamations = JSON.parse(savedRec);
    }
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' };
    this.currentWeather.date = now.toLocaleDateString('fr-FR', options);
    this.initSundayScheduler();
    this.initWeekBoundaries();
    this.loadAllData();
    this.loadWeeklyPrediction();
  }

  private loadAllData(): void {
    this.isLoading = true;
    forkJoin({
      employees: this.userService.getAllEmployees(),
      buses: this.busService.getAll(),
      trajets: this.covoiturageService.getAllTrajets(),
      resNavette: this.covoiturageService.getAllReservationsNavette(),
      resCovoit: this.covoiturageService.getAllReservations(),
      reclamations: this.reclamationService.getAll()
    }).subscribe({
      next: (results) => {
        // 1. Map Employés
        results.employees.forEach((u: any) => {
          const nom = `${u.prenom || u.firstName || ''} ${u.nom || u.lastName || ''}`.trim();
          const uid = String(u.id);
          this.employesMap.set(uid, nom || `Employé ${uid.slice(0, 5)}`);
          this.employeDetailsMap.set(uid, u);
        });

        // 2. Data
        this.navettes = results.buses || [];
        this.trajets = results.trajets || [];
        this.reservationsNavette = results.resNavette || [];
        this.reclamations = results.reclamations || [];

        this.calculateReclamationStats();

        if (this.activeSection === 'reclamations') {
          this.initHeatmap();
        }

        const allPackDates: string[] = [];
        this.navettes.forEach(b => {
          if (b.packDates && b.packDates.length) {
            b.packDates.forEach(d => {
              if (!allPackDates.includes(d)) allPackDates.push(d);
            });
          }
        });
        this.packDates = allPackDates.sort();

        // 3. Fusionner les réservations
        const merged: any[] = [];

        results.resNavette.forEach((rn: any) => {
          const bus = this.navettes.find(b =>
            String(b.id) === String(rn.busId || rn.trajetId || rn.shuttleId)
          );

          let dayIndex = -1;
          if (rn.date && rn.date.includes('-')) {
            dayIndex = new Date(rn.date).getDay();
          } else if (rn.joursSelectionnes && rn.joursSelectionnes.length > 0) {
            dayIndex = (rn.joursSelectionnes[0] + 1) % 7;
          }

          merged.push({
            id: rn.id,
            employeId: rn.employeId,
            employeNom: this.getNomEmploye(rn.employeId),
            employePhoto: `https://ui-avatars.com/api/?name=${this.getNomEmploye(rn.employeId)}&background=random`,
            type: 'navette',
            trajet: bus ? (bus.ligne || `${bus.depart} -> ${bus.arrivee}`) : 'Ligne introuvable (Bus supprimé)',
            busDetail: bus ? `${bus.marque} ${bus.modele}` : 'Données indisponibles',
            adresseDepart: bus ? (bus.depart || (bus.ligne ? bus.ligne.split(' - ')[0] : 'Inconnue')) : '—',
            date: (rn.date && rn.date.includes('-')) ? rn.date : (rn.dateReservation ? rn.dateReservation.split('T')[0] : '—'),
            dayIndex: dayIndex,
            heure: bus?.heureDepart || '—',
            statut: this.mapStatut(rn.statut),
            co2Economise: rn.co2EconomiseKg || 0,
            pointsEco: rn.pointsEco || 0
          });
        });

        results.resCovoit.forEach((rc: any) => {
          const trajet = this.trajets.find(t => t.id === rc.trajetId);
          const dateStr = rc.dateReservation ? rc.dateReservation.split('T')[0] : '';
          merged.push({
            id: rc.id,
            employeId: rc.employeId,
            employeNom: this.getNomEmploye(rc.employeId),
            employePhoto: `https://ui-avatars.com/api/?name=${this.getNomEmploye(rc.employeId)}&background=random`,
            conducteurNom: trajet ? this.getNomEmploye(trajet.employeId) : 'Conducteur Inconnu',
            type: 'covoiturage',
            trajet: trajet ? `${trajet.adresseDepart} -> ${trajet.adresseArrivee}` : 'Covoiturage',
            adresseDepart: trajet ? (trajet.adresseDepart || '—').split(',')[0] : 'Inconnue',
            date: dateStr || '—',
            dayIndex: dateStr ? new Date(dateStr).getDay() : -1,
            heure: trajet?.heureDepart || '—',
            statut: this.mapStatut(rc.statut),
            co2Economise: rc.co2EconomiseKg || 0,
            pointsEco: rc.pointsEco || 0
          });
        });

        this.reservations = merged;

        const archivedIds = this.archivedReservations.map(a => a.id);
        this.reservations = this.reservations.filter(r => !archivedIds.includes(r.id));

        this.employeUsageFreq.clear();
        this.reservations.forEach(r => {
          if (r.employeId) {
            const current = this.employeUsageFreq.get(String(r.employeId)) || 0;
            this.employeUsageFreq.set(String(r.employeId), current + 1);
          }
        });

        this.isLoading = false;
        this.initCharts();
        this.initNewCharts();
        this.initWeather();
        this.checkWaitlists();
      },
      error: (err) => {
        console.error('Erreur chargement admin:', err);
        this.isLoading = false;
      }
    });
  }

  private initNewCharts(): void {
    const zoneCounts = new Map<string, number>();
    this.reservations.forEach(r => {
      const z = r.adresseDepart || 'Inconnue';
      zoneCounts.set(z, (zoneCounts.get(z) || 0) + 1);
    });

    const unknownLabels = new Set(['inconnue', '—', '', '-', 'inconnu', 'unknown']);
    const colors = ['#6366F1', '#14B8A6', '#F59E0B', '#EF4444', '#8B5CF6'];
    const totalKnown = Array.from(zoneCounts.entries())
      .filter(([name]) => !unknownLabels.has(name.toLowerCase().trim()))
      .reduce((sum, [, v]) => sum + v, 0);

    this.departureZonesData = Array.from(zoneCounts.entries())
      .filter(([name]) => !unknownLabels.has(name.toLowerCase().trim()))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value], i) => ({
        name,
        value,
        color: colors[i % colors.length],
        percentage: totalKnown > 0 ? Math.round((value / totalKnown) * 100) : 0
      }));

    const now = new Date();
    const day = now.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff);
    monday.setHours(0, 0, 0, 0);

    const currentWeekDates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      currentWeekDates.push(d.toISOString().split('T')[0]);
    }

    const weekCounts = currentWeekDates.map(date => {
      return this.reservations.filter(r => r.date === date).length;
    });

    this.dateDistributionChart = {
      series: [{ name: 'Réservations', data: weekCounts }],
      chart: { type: 'bar', height: 280, toolbar: { show: false } },
      plotOptions: { bar: { borderRadius: 8, columnWidth: '50%' } },
      xaxis: { categories: currentWeekDates },
      colors: ['#1D9E75'],
      dataLabels: { enabled: true },
      tooltip: { theme: 'light' }
    };

    const weekCo2 = currentWeekDates.map(date => {
      const dailySum = this.reservations
        .filter(r => r.date === date)
        .reduce((sum, r) => sum + (r.co2Economise || 0), 0);
      return Math.round(dailySum);
    });

    this.co2Chart = {
      series: [{ name: 'CO2 économisé', data: weekCo2 }],
      chart: { type: 'area', height: 280, toolbar: { show: false }, background: 'transparent' },
      xaxis: { categories: currentWeekDates },
      stroke: { curve: 'smooth', width: 3, colors: ['#10B981'] },
      fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.1 } },
      colors: ['#10B981'],
      tooltip: { theme: 'light' },
      dataLabels: { enabled: false }
    };

    this.departureZonesChart = {
      series: this.departureZonesData.map(d => d.value),
      chart: { type: 'donut', height: 240, toolbar: { show: false } },
      labels: this.departureZonesData.map(d => d.name),
      colors: this.departureZonesData.map(d => d.color),
      plotOptions: { pie: { donut: { size: '60%' } } },
      legend: { show: false },
      dataLabels: { enabled: false }
    };

    const countsByType = {
      covoiturage: [0, 0, 0, 0, 0, 0, 0],
      navette: [0, 0, 0, 0, 0, 0, 0]
    };

    this.reservations.forEach(r => {
      if (r.dayIndex !== -1) {
        if (r.type === 'covoiturage') countsByType.covoiturage[r.dayIndex]++;
        else if (r.type === 'navette') countsByType.navette[r.dayIndex]++;
      }
    });

    const reorder = (arr: number[]) => [...arr.slice(1), arr[0]];
    const categoriesLabels = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

    this.weeklyChart = {
      series: [
        { name: 'Covoiturage', data: reorder(countsByType.covoiturage) },
        { name: 'Navette', data: reorder(countsByType.navette) }
      ],
      chart: { type: 'bar', height: 260, toolbar: { show: false }, background: 'transparent' },
      xaxis: { categories: categoriesLabels },
      plotOptions: { bar: { borderRadius: 8, columnWidth: '60%' } },
      colors: ['#6366F1', '#14B8A6'],
      dataLabels: { enabled: false },
      tooltip: { theme: 'light' }
    };

    this.fleetPerformanceChart = {
      series: [{
        name: 'Occupation',
        data: this.navettes.slice(0, 6).map(n => Math.round(((n.capacite - (n.placesRestantes || 0)) / n.capacite) * 100))
      }],
      chart: { type: 'bar', height: 250, toolbar: { show: false }, background: 'transparent' },
      plotOptions: { bar: { borderRadius: 4, horizontal: true, barHeight: '50%', distributed: true } },
      colors: ['#6366F1', '#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'],
      xaxis: {
        categories: this.navettes.slice(0, 6).map(n => n.marque + ' ' + n.modele),
        labels: { show: false }
      },
      dataLabels: {
        enabled: true,
        formatter: (val: any) => val + '%',
        style: { fontSize: '10px', fontWeight: 'bold' }
      },
      tooltip: { theme: 'light' },
      grid: { show: false }
    };
  }

  private mapStatut(s: string): string {
    const st = String(s || '').toUpperCase();
    if (st === 'CONFIRME') return 'Confirmée';
    if (st === 'ANNULE') return 'Annulée';
    if (st === 'EFFECTUE') return 'Effectuée';
    if (st === 'EN_ROUTE') return 'En Route';
    if (st === 'COMPLET') return 'Complet';
    return 'En attente';
  }

  private loadEmployes(): void {
    this.userService.getAllEmployees().subscribe({
      next: (users: any[]) => {
        users.forEach((u: any) => {
          const nom = `${u.prenom || u.firstName || ''} ${u.nom || u.lastName || ''}`.trim();
          this.employesMap.set(String(u.id), nom || `ID ${String(u.id).slice(0, 8)}`);
        });
      }
    });
  }

  loadReservationsNavette(): void {
    this.covoiturageService.getAllReservationsNavette().subscribe({
      next: (data) => {
        this.reservationsNavette = data || [];
        this.checkWaitlists();
      },
      error: () => this.reservationsNavette = []
    });
  }

  getNomEmploye(id: string | undefined): string {
    if (!id) return '—';
    return this.employesMap.get(String(id)) || `Employé ${String(id).slice(0, 8)}`;
  }

  reservantsParJour(busId: string | undefined, date: string): { id: string; employeId: string; statut: string; isWaitlisted: boolean }[] {
    if (!busId || !this.reservationsNavette.length || !date) return [];

    const bus = this.navettes.find(b => b.id === busId);
    if (!bus) return [];

    const packId = bus.packId;

    const packReservations = this.reservationsNavette
      .filter(r => {
        const rBus = this.navettes.find(b => b.id === r.busId);
        const st = String(r.statut || '').toUpperCase();
        return rBus?.packId === packId &&
          st !== 'ANNULE' &&
          (r.date === date || (r.joursSelectionnes && r.joursSelectionnes.includes(date)));
      })
      .sort((a, b) => new Date(a.dateCreation || 0).getTime() - new Date(b.dateCreation || 0).getTime());

    const packBuses = this.navettes
      .filter(b => b.packId === packId)
      .sort((a, b) => {
        if (a.statut === 'ACTIF' && b.statut !== 'ACTIF') return -1;
        if (a.statut !== 'ACTIF' && b.statut === 'ACTIF') return 1;
        return new Date(a.dateCreation || 0).getTime() - new Date(b.dateCreation || 0).getTime();
      });

    const distribution = new Map<string, any[]>();
    packBuses.forEach(b => distribution.set(b.id!, []));

    let currentBusIndex = 0;
    packReservations.forEach(r => {
      while (currentBusIndex < packBuses.length && distribution.get(packBuses[currentBusIndex].id!)!.length >= packBuses[currentBusIndex].capacite) {
        currentBusIndex++;
      }

      const targetBus = currentBusIndex < packBuses.length ? packBuses[currentBusIndex] : packBuses[packBuses.length - 1];
      const targetBusId = targetBus.id!;

      if (targetBusId) {
        const confirmedDays = Array.isArray(r.joursConfirmes)
          ? r.joursConfirmes
          : (r.joursConfirmes || '').split(',').map((d: any) => String(d).trim()).filter(Boolean);

        const isConfirmedByDay = confirmedDays.includes(date);
        const isWaitlisted = (targetBus.statut !== 'ACTIF' && !isConfirmedByDay);

        distribution.get(targetBusId)!.push({
          id: r.id,
          employeId: r.employeId,
          statut: String(r.statut),
          isWaitlisted: isWaitlisted
        });
      }
    });

    return distribution.get(busId) || [];
  }

  countConfirmesParJour(busId: string | undefined, date: string): number {
    return this.reservantsParJour(busId, date).filter(r => !r.isWaitlisted).length;
  }

  addPackDate(date: string): void {
    if (date && !this.packDates.includes(date)) {
      this.packDates.push(date);
      this.packDates.sort();
    }
  }

  removePackDate(index: number): void {
    this.packDates.splice(index, 1);
  }

  private initWeekBoundaries(): void {
    const now = new Date();
    const day = now.getDay();

    let monday = new Date(now);

    if (day === 0) {
      monday.setDate(now.getDate() + 1);
    } else {
      const diff = 1 - day;
      monday.setDate(now.getDate() + diff);
    }

    this.minDate = monday.toISOString().split('T')[0];

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    this.maxDate = sunday.toISOString().split('T')[0];
  }

  reservantsPourBus(busId: string | undefined): { employeId: string; statut: string }[] {
    if (!busId || !this.reservationsNavette.length) return [];
    return this.reservationsNavette
      .filter(r => r.busId === busId && r.statut && String(r.statut).toUpperCase() !== 'ANNULE')
      .map(r => ({ employeId: r.employeId, statut: String(r.statut) }));
  }

  loadBus(): void {
    this.isLoading = true;
    this.busService.getAll().subscribe({
      next: (data) => {
        this.navettes = data;
        this.isLoading = false;
        this.loadReservationsNavette();
      },
      error: () => { this.errorMessage = 'Erreur de chargement'; this.isLoading = false; }
    });
  }

  openModal(): void {
    this.isEditing = false;
    this.joursSelectionnes = [];
    this.busForm = this.emptyBus();
    this.createBusPack = false;
    this.packBusList = [];
    this.packDates = [];
    this.submitted = false;
    this.showModal = true;
    setTimeout(() => this.initStopPickerMap(), 100);
  }

  openEditModal(bus: Bus): void {
    this.isEditing = true;
    this.busForm = { ...bus };
    this.submitted = false;
    if (!this.busForm.photoUrl) this.busForm.photoUrl = this.defaultPhotoUrl;
    if (bus.ligne && bus.ligne.includes(' - ')) {
      const [depart, arrivee] = bus.ligne.split(' - ');
      this.busForm.depart = depart;
      this.busForm.arrivee = arrivee;
    } else {
      this.busForm.depart = bus.ligne || '';
      this.busForm.arrivee = '';
    }
    this.joursSelectionnes = bus.joursDisponibles ? bus.joursDisponibles.split(',').map(j => j.trim()) : [];

    this.relatedBuses = this.navettes.filter(b => b.ligne === bus.ligne && b.id !== bus.id);
    this.syncWithFleet = false;

    this.packDates = Array.isArray(bus.packDates) ? [...bus.packDates] : [];
    if (!this.busForm.arrets) this.busForm.arrets = [];
    this.showModal = true;
    setTimeout(() => this.initStopPickerMap(), 100);
  }

  toggleJour(jour: string): void {
    const index = this.joursSelectionnes.indexOf(jour);
    if (index > -1) this.joursSelectionnes.splice(index, 1);
    else this.joursSelectionnes.push(jour);
    this.busForm.joursDisponibles = this.joursSelectionnes.join(',');
  }

  isJourSelected(jour: string): boolean {
    return this.joursSelectionnes.includes(jour);
  }

  isFormValid(): boolean {
    const base = !!(this.busForm.depart?.trim() && this.busForm.arrivee?.trim() && this.busForm.heureDepart?.trim() && this.busForm.dureeMinutes > 0 && this.joursSelectionnes.length > 0);
    if (this.isEditing) {
      return base && !!(this.busForm.marque?.trim() && this.busForm.modele?.trim() && this.busForm.immatriculation?.trim() && this.busForm.capacite > 0);
    }
    if (this.createBusPack) {
      return base && this.packDates.length > 0 && this.packBusList.length >= 1 && this.packBusList.every(b => b.capacite > 0 && !!b.marque?.trim() && !!b.modele?.trim() && !!b.immatriculation?.trim()) && this.packBusList.some(b => b.statut === 'ACTIF');
    }
    return base && !!(this.busForm.marque?.trim() && this.busForm.modele?.trim() && this.busForm.immatriculation?.trim() && this.busForm.capacite > 0);
  }

  activateForDay(busId: string | undefined, date: string): void {
    if (!busId) return;
    this.busService.activateForDay(busId, date).subscribe({
      next: () => { this.loadBus(); },
      error: () => this._toastrService.error('Erreur lors de l\'activation du jour')
    });
  }

  emptyBus(): Bus {
    return {
      marque: '', modele: '', immatriculation: '',
      capacite: 0, typeCarburant: 'DIESEL', ligne: '',
      depart: '', arrivee: '',
      heureDepart: '', dureeMinutes: 0,
      joursDisponibles: '',
      statut: 'ACTIF',
      placesRestantes: 0,
      photoUrl: this.defaultPhotoUrl,
      arrets: []
    };
  }

  expandedItineraries: Set<string> = new Set();

  toggleItinerary(busId: string): void {
    if (this.expandedItineraries.has(busId)) {
      this.expandedItineraries.delete(busId);
    } else {
      this.expandedItineraries.add(busId);
    }
  }

  addArret(): void {
    if (this.arretInput?.trim()) {
      if (!this.busForm.arrets) this.busForm.arrets = [];

      const newArret = {
        name: this.arretInput.trim(),
        latitude: this.selectedLat || 36.8065,
        longitude: this.selectedLng || 10.1815
      };

      this.busForm.arrets.push(newArret);

      if (this.busForm.packId) {
        const packBuses = this.navettes.filter(
          b => b.packId === this.busForm.packId && b.id !== this.busForm.id
        );

        packBuses.forEach(bus => {
          if (!bus.arrets) bus.arrets = [];
          const alreadyExists = bus.arrets.some(
            a => a.name.toLowerCase() === newArret.name.toLowerCase()
          );
          if (!alreadyExists) {
            bus.arrets.push({ ...newArret });
          }
        });
      }

      this.arretInput = '';
      this.selectedLat = null;
      this.selectedLng = null;
      this.searchSuggestions = [];
      if (this.stopPickerMarker) {
        this.stopPickerMap.removeLayer(this.stopPickerMarker);
        this.stopPickerMarker = null;
      }
    }
  }

  onArretSearch(query: string): void {
    if (this.searchTimeout) clearTimeout(this.searchTimeout);

    if (!query || query.length < 3) {
      this.searchSuggestions = [];
      return;
    }

    this.searchTimeout = setTimeout(() => {
      this.fetchSuggestions(query);
    }, 500);
  }

  private fetchSuggestions(query: string): void {
    this.isSearching = true;
    this.searchSuggestions = [];

    const heatmapSuggestions = this.reclamationStats
      .filter(s => s.stopName && s.stopName.toLowerCase().includes(query.toLowerCase()))
      .map(s => {
        const original = this.reclamations.find(r => r.stopName === s.stopName);
        return {
          name: s.stopName,
          lat: original?.latitude,
          lng: original?.longitude,
          type: 'heatmap'
        };
      });

    this.searchSuggestions.push(...heatmapSuggestions);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=tn&accept-language=fr`,
      { signal: controller.signal }
    )
      .then(res => res.json())
      .then(data => {
        clearTimeout(timeoutId);
        const nominatimResults = data.map((item: any) => ({
          name: item.display_name.split(',')[0],
          fullName: item.display_name,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          type: 'address'
        }));

        const existingNames = new Set(this.searchSuggestions.map(s => s.name.toLowerCase()));
        nominatimResults.forEach((nr: any) => {
          if (!existingNames.has(nr.name.toLowerCase())) {
            this.searchSuggestions.push(nr);
          }
        });

        this.isSearching = false;
        this._changeDetectorRef.detectChanges();
      })
      .catch(err => {
        clearTimeout(timeoutId);
        if (err.name !== 'AbortError') {
          console.error('Erreur Nominatim:', err);
        }
        this.isSearching = false;
        this._changeDetectorRef.detectChanges();
      });
  }

  selectSuggestion(suggestion: any): void {
    this.arretInput = suggestion.name;
    this.selectedLat = suggestion.lat;
    this.selectedLng = suggestion.lng;
    this.searchSuggestions = [];

    if (this.stopPickerMap && suggestion.lat && suggestion.lng) {
      const latlng = [suggestion.lat, suggestion.lng];
      this.stopPickerMap.setView(latlng, 15);

      if (this.stopPickerMarker) {
        this.stopPickerMarker.setLatLng(latlng);
      } else {
        this.stopPickerMarker = L.marker(latlng).addTo(this.stopPickerMap);
      }
    }
    this._changeDetectorRef.detectChanges();
  }

  initStopPickerMap(): void {
    const mapDiv = document.getElementById('stopPickerMap');
    if (!mapDiv) {
      setTimeout(() => this.initStopPickerMap(), 200);
      return;
    }

    if (this.stopPickerMap) {
      this.stopPickerMap.off();
      this.stopPickerMap.remove();
      this.stopPickerMap = null;
      this.stopPickerMarker = null;
    }

    this.stopPickerMap = L.map('stopPickerMap').setView([36.8065, 10.1815], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(this.stopPickerMap);

    this.stopPickerMap.on('click', (e: any) => {
      this.selectedLat = e.latlng.lat;
      this.selectedLng = e.latlng.lng;
      if (this.stopPickerMarker) {
        this.stopPickerMarker.setLatLng(e.latlng);
      } else {
        this.stopPickerMarker = L.marker(e.latlng).addTo(this.stopPickerMap);
      }
    });

    setTimeout(() => {
      if (this.stopPickerMap) this.stopPickerMap.invalidateSize();
    }, 50);
  }

  private calculateHaversine(lat1: number, lon1: number, lat2: number, lon2: number): { distance: number, time: number } {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c;
    const distanceReelle = d * 1.3;
    const t = Math.round((distanceReelle / 6) * 60);
    return { distance: Math.round(distanceReelle * 100) / 100, time: t };
  }

  loadReclamations(): void {
    this.reclamationService.getAll().subscribe(data => {
      this.reclamations = data;
      this.calculateReclamationStats();
      if (this.activeSection === 'reclamations') {
        this.initHeatmap();
      }
    });
  }

  calculateReclamationStats(): void {
    const statsMap = new Map<string, {
      count: number;
      lat: number;
      lng: number;
      employeeIds: Set<string>;
      employees: Set<string>;
      totalDistance: number;
      totalTime: number;
    }>();

    this.reclamations.forEach(r => {
      const stopName = (r.stopName || 'Non spécifié').trim();
      const neighborhood = (r.neighborhood || 'Inconnu').trim();
      const key = `${stopName}|${neighborhood}`;

      if (r.latitude && r.longitude) {
        let effectiveDist = r.walkingDistance || 0;
        let effectiveTime = r.walkingTime || 0;

        if (effectiveDist === 0) {
          let stopCoords = { lat: 0, lng: 0 };
          for (const bus of this.navettes) {
            const s = bus.arrets?.find(a => a.name.trim().toLowerCase() === stopName.toLowerCase());
            if (s) {
              stopCoords = { lat: s.latitude, lng: s.longitude };
              break;
            }
          }
          if (stopCoords.lat !== 0) {
            const h = this.calculateHaversine(r.latitude, r.longitude, stopCoords.lat, stopCoords.lng);
            effectiveDist = h.distance;
            effectiveTime = h.time;
          }
        }

        if (!statsMap.has(key)) {
          statsMap.set(key, {
            count: 0,
            lat: r.latitude,
            lng: r.longitude,
            employeeIds: new Set([r.employeId]),
            employees: new Set([this.getNomEmploye(r.employeId)]),
            totalDistance: effectiveDist,
            totalTime: effectiveTime
          });
        } else {
          const entry = statsMap.get(key)!;
          entry.employeeIds.add(r.employeId);
          entry.employees.add(this.getNomEmploye(r.employeId));
          entry.totalDistance += effectiveDist;
          entry.totalTime += effectiveTime;
        }
      }
    });

    this.reclamationStats = Array.from(statsMap.entries()).map(([key, data]) => {
      const [stopName, neighborhood] = key.split('|');
      const uniquePeopleCount = data.employees.size;
      const count = data.employeeIds.size;
      const avgTime = Math.round(data.totalTime / count);
      const status = avgTime > 30 ? 'critical' : (avgTime >= 15 ? 'warning' : 'ok');

      const regularEmployees = Array.from(data.employeeIds).filter(id => {
        const isDetailPresent = this.employeDetailsMap.has(id);
        const freq = this.employeUsageFreq.get(id) || 0;
        return isDetailPresent && freq >= 3;
      });

      const regularEmployeesDetails = regularEmployees.map(id => ({
        name: this.getNomEmploye(id),
        freq: this.employeUsageFreq.get(id) || 0
      }));

      const targetBus = this.navettes.find(b =>
        (b.depart || '').toLowerCase().includes(stopName.toLowerCase()) ||
        (b.arrivee || '').toLowerCase().includes(stopName.toLowerCase()) ||
        b.arrets?.some(ar => ar.name.toLowerCase().includes(stopName.toLowerCase()))
      );

      return {
        stopName,
        neighborhood,
        count: uniquePeopleCount,
        regularCount: regularEmployees.length,
        latitude: data.lat,
        longitude: data.lng,
        avgDistance: Math.round((data.totalDistance / count) * 10) / 10,
        avgTime,
        employeeList: Array.from(data.employees).join(', '),
        status,
        isRecommended: regularEmployees.length >= 3 && status !== 'ok',
        regularEmployeesDetails,
        targetBusId: targetBus?.id,
        showDetails: false
      };
    }).sort((a, b) => b.avgTime - a.avgTime);

    this.fetchMissingRealMetrics();
  }

  private _pendingOrsUpdates = new Set<string>();

  private fetchMissingRealMetrics(): void {
    this.reclamations.forEach(r => {
      if ((!r.walkingTime || r.walkingTime === 0) && r.latitude && r.longitude) {
        const stopName = (r.stopName || '').trim();
        const neighborhood = (r.neighborhood || '').trim();
        const key = `${stopName}|${neighborhood}`;

        if (this._pendingOrsUpdates.has(key)) return;

        let stopCoords = { lat: 0, lng: 0 };
        for (const bus of this.navettes) {
          const s = bus.arrets?.find(a => a.name.trim().toLowerCase() === stopName.toLowerCase());
          if (s) {
            stopCoords = { lat: s.latitude, lng: s.longitude };
            break;
          }
        }

        if (stopCoords.lat !== 0) {
          this._pendingOrsUpdates.add(key);

          this._walkingService.getWalkingMetrics(r.latitude, r.longitude, stopCoords.lat, stopCoords.lng)
            .subscribe({
              next: (metrics) => {
                this.reclamations.forEach(rec => {
                  if (rec.stopName?.trim() === stopName && rec.neighborhood?.trim() === neighborhood) {
                    rec.walkingDistance = metrics.distance;
                    rec.walkingTime = metrics.time;
                  }
                });
                this._recalcStatsOnly();
                this._changeDetectorRef.detectChanges();
              },
              error: () => { }
            });
        }
      }
    });
  }

  private _recalcStatsOnly(): void {
    const statsMap = new Map<string, any>();

    this.reclamations.forEach(r => {
      const stopName = (r.stopName || 'Non spécifié').trim();
      const neighborhood = (r.neighborhood || 'Inconnu').trim();
      const key = `${stopName}|${neighborhood}`;

      if (r.latitude && r.longitude) {
        let effectiveDist = r.walkingDistance || 0;
        let effectiveTime = r.walkingTime || 0;

        if (effectiveDist === 0) {
          let stopCoords = { lat: 0, lng: 0 };
          for (const bus of this.navettes) {
            const s = bus.arrets?.find(a => a.name.trim().toLowerCase() === stopName.toLowerCase());
            if (s) { stopCoords = { lat: s.latitude, lng: s.longitude }; break; }
          }
          if (stopCoords.lat !== 0) {
            const h = this.calculateHaversine(r.latitude, r.longitude, stopCoords.lat, stopCoords.lng);
            effectiveDist = h.distance;
            effectiveTime = h.time;
          }
        }

        if (!statsMap.has(key)) {
          statsMap.set(key, {
            lat: r.latitude, lng: r.longitude,
            employeeIds: new Set([r.employeId]),
            employees: new Set([this.getNomEmploye(r.employeId)]),
            totalDistance: effectiveDist,
            totalTime: effectiveTime
          });
        } else {
          const entry = statsMap.get(key)!;
          entry.employeeIds.add(r.employeId);
          entry.employees.add(this.getNomEmploye(r.employeId));
          entry.totalDistance += effectiveDist;
          entry.totalTime += effectiveTime;
        }
      }
    });

    this.reclamationStats = Array.from(statsMap.entries()).map(([key, data]) => {
      const [stopName, neighborhood] = key.split('|');
      const count = data.employeeIds.size;
      const avgTime = Math.round(data.totalTime / count);
      const status = avgTime > 30 ? 'critical' : (avgTime >= 15 ? 'warning' : 'ok');

      const regularEmployees = Array.from(data.employeeIds).filter((id: string) =>
        this.employeDetailsMap.has(id) && (this.employeUsageFreq.get(id) || 0) >= 3
      );

      const targetBus = this.navettes.find(b =>
        b.arrets?.some(ar => ar.name.toLowerCase().includes(stopName.toLowerCase()))
      );

      return {
        stopName, neighborhood,
        count: data.employees.size,
        regularCount: regularEmployees.length,
        latitude: data.lat, longitude: data.lng,
        avgDistance: Math.round((data.totalDistance / count) * 10) / 10,
        avgTime, employeeList: Array.from(data.employees).join(', '),
        status,
        isRecommended: regularEmployees.length >= 3 && status !== 'ok',
        regularEmployeesDetails: regularEmployees.map((id: string) => ({
          name: this.getNomEmploye(id),
          freq: this.employeUsageFreq.get(id) || 0
        })),
        targetBusId: targetBus?.id,
        showDetails: false
      };
    }).sort((a, b) => b.avgTime - a.avgTime);
  }

  getMetrics(r: Reclamation): { time: number, dist: number } {
    if (r.walkingTime && r.walkingTime > 0) {
      return { time: r.walkingTime, dist: r.walkingDistance || 0 };
    }

    let stopCoords = { lat: 0, lng: 0 };
    const stopName = (r.stopName || '').trim().toLowerCase();

    for (const bus of this.navettes) {
      const s = bus.arrets?.find(a => a.name.trim().toLowerCase() === stopName);
      if (s) {
        stopCoords = { lat: s.latitude, lng: s.longitude };
        break;
      }
    }

    if (stopCoords.lat !== 0) {
      const h = this.calculateHaversine(r.latitude || 0, r.longitude || 0, stopCoords.lat, stopCoords.lng);
      return { time: h.time, dist: h.distance };
    }

    return { time: 0, dist: 0 };
  }

  getSeverityClass(time: number): string {
    if (time > 30) return 'bg-red-50 text-red-600 border-red-100';
    if (time >= 15) return 'bg-orange-50 text-orange-600 border-orange-100';
    return 'bg-emerald-50 text-emerald-600 border-emerald-100';
  }

  archivedReclamations: any[] = [];

  archiveReclamation(r: Reclamation): void {
    const archived = { ...r, archivedAt: new Date().toISOString() };
    this.archivedReclamations.push(archived);
    localStorage.setItem('archivedReclamations', JSON.stringify(this.archivedReclamations));
    this.reclamations = this.reclamations.filter(rec => rec.id !== r.id);
    this.calculateReclamationStats();
    this._toastrService.success('Réclamation archivée');
    this._changeDetectorRef.detectChanges();
  }

  deleteReclamation(id: string): void {
    const dialogRef = this._fuseConfirmationService.open({
      title: 'Confirmer la suppression',
      message: 'Voulez-vous vraiment supprimer cette réclamation ? Cette action est irréversible.',
      icon: { show: true, name: 'heroicons_outline:exclamation', color: 'warn' },
      actions: { confirm: { label: 'Supprimer', color: 'warn' } }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result === 'confirmed') {
        this.reclamationService.delete(id).subscribe({
          next: () => {
            this._toastrService.success('Réclamation supprimée');
            this.loadReclamations();
            this._changeDetectorRef.detectChanges();
          },
          error: () => this._toastrService.error('Erreur lors de la suppression')
        });
      }
    });
  }

  initHeatmap(): void {
    setTimeout(() => {
      const mapContainer = document.getElementById('heatmapMap');
      if (!mapContainer || mapContainer.clientWidth === 0) {
        console.warn('[Heatmap] Le conteneur map n\'est pas encore prêt ou est masqué.');
        return;
      }

      if (this.heatmapMap) {
        this.heatmapMap.remove();
      }

      this.heatmapMap = L.map('heatmapMap').setView([36.8065, 10.1815], 11);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
      }).addTo(this.heatmapMap);

      setTimeout(() => {
        if (this.heatmapMap) this.heatmapMap.invalidateSize();
      }, 100);

      const points = this.reclamations
        .filter(r => r.latitude && r.longitude)
        .map(r => [r.latitude, r.longitude, 0.5]);

      if (points.length > 0 && L.heatLayer) {
        L.heatLayer(points, { radius: 25, blur: 15, maxZoom: 17 }).addTo(this.heatmapMap);
      }

      const stopIcon = L.divIcon({
        html: `
          <div class="flex flex-col items-center">
            <div class="w-8 h-10 relative">
              <svg viewBox="0 0 384 512" class="w-full h-full drop-shadow-lg">
                <path fill="#3B82F6" d="M172.268 501.67C26.97 291.031 0 269.413 0 192 0 85.961 85.961 0 192 0s192 85.961 192 192c0 77.413-26.97 99.031-172.268 309.67-9.535 13.774-29.93 13.773-39.464 0z"></path>
                <circle cx="192" cy="192" r="64" fill="white"></circle>
              </svg>
            </div>
            <div class="bg-blue-600 text-white text-[8px] font-bold px-1.5 rounded-full mt-0.5 whitespace-nowrap shadow-sm border border-white">STOP</div>
          </div>`,
        className: 'custom-stop-icon',
        iconSize: [32, 45],
        iconAnchor: [16, 45]
      });

      const uniqueStops = new Map<string, { lat: number, lng: number, name: string }>();

      this.navettes.forEach(bus => {
        if (bus.arrets && Array.isArray(bus.arrets)) {
          bus.arrets.forEach((stop: any) => {
            const lat = parseFloat(stop.latitude);
            const lng = parseFloat(stop.longitude);
            if (!isNaN(lat) && !isNaN(lng) && lat !== 0) {
              const key = `${lat.toFixed(6)}|${lng.toFixed(6)}`;
              if (!uniqueStops.has(key)) {
                uniqueStops.set(key, { lat, lng, name: stop.name });
              }
            }
          });
        }
      });

      uniqueStops.forEach(stop => {
        L.marker([stop.lat, stop.lng], { icon: stopIcon })
          .bindPopup(`<div class="font-bold text-[#1A1A2E] uppercase text-[10px] tracking-wider mb-1 border-b pb-1">${stop.name}</div><div class="text-[9px] text-gray-500 italic">Point d'arrêt réseau RH</div>`)
          .addTo(this.heatmapMap);
      });

      const usedCoords = new Map<string, number>();

      this.reclamationStats.forEach(stat => {
        if (stat.latitude && stat.longitude) {
          const baseLat = parseFloat(stat.latitude.toString());
          const baseLng = parseFloat(stat.longitude.toString());
          const coordKey = `${baseLat.toFixed(5)}|${baseLng.toFixed(5)}`;

          const overlapCount = usedCoords.get(coordKey) || 0;
          usedCoords.set(coordKey, overlapCount + 1);

          const jitterLat = baseLat + (overlapCount > 0 ? (Math.sin(overlapCount) * 0.0006) : 0);
          const jitterLng = baseLng + (overlapCount > 0 ? (Math.cos(overlapCount) * 0.0006) : 0);

          const color = '#10B981';
          const pulsingColor = 'rgba(16, 185, 129, 0.3)';
          const size = Math.min(70, 35 + (stat.count * 3));

          const neighborhoodIcon = L.divIcon({
            html: `
              <div class="relative flex items-center justify-center">
                <div class="absolute w-full h-full rounded-full animate-ping" style="background-color: ${pulsingColor}"></div>
                <div class="relative flex items-center justify-center rounded-full text-white font-bold shadow-xl border-2 border-white transition-all duration-500 hover:scale-110"
                     style="background-color: ${color}; width: ${size}px; height: ${size}px; font-size: ${size / 3}px">
                  ${stat.count}
                </div>
              </div>`,
            className: 'custom-neighborhood-icon',
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2]
          });

          L.marker([jitterLat, jitterLng], { icon: neighborhoodIcon })
            .bindPopup(`
              <div class="p-3 max-w-[220px]">
                <div class="font-black text-[#1A1A2E] border-b pb-1.5 mb-2 uppercase text-[10px] tracking-wider flex justify-between items-center">
                  <span>${stat.neighborhood}</span>
                  <span class="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-[9px]">${stat.count} pers.</span>
                </div>
                <div class="text-[9px] text-gray-400 mb-2 italic">Destination : ${stat.stopName}</div>
                <div class="bg-blue-50/50 rounded-lg p-2 mb-3 border border-blue-100 flex items-center gap-3">
                  <div>
                    <div class="text-[10px] font-bold text-blue-900">${stat.avgTime} min de marche</div>
                    <div class="text-[9px] text-blue-700">${stat.avgDistance} km de distance</div>
                  </div>
                </div>
                <div class="space-y-2">
                  <div class="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Profils concernés :</div>
                  <div class="text-[10px] text-gray-600 leading-relaxed italic border-l-2 border-emerald-500 pl-2">
                    ${stat.employeeList}
                  </div>
                </div>
              </div>
            `)
            .addTo(this.heatmapMap);
        }
      });
    }, 500);
  }

  removeArret(index: number): void {
    if (this.busForm.arrets) {
      this.busForm.arrets.splice(index, 1);
    }
  }

  moveArret(index: number, direction: 'up' | 'down'): void {
    if (!this.busForm.arrets) return;
    const newIdx = direction === 'up' ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= this.busForm.arrets.length) return;
    const temp = this.busForm.arrets[index];
    this.busForm.arrets[index] = this.busForm.arrets[newIdx];
    this.busForm.arrets[newIdx] = temp;
  }

  saveBus(): void {
    this.submitted = true;
    if (!this.isFormValid()) return;

    const photoUrlValue = this.busForm.photoUrl?.trim() || this.defaultPhotoUrl;
    const fullLigne = `${this.busForm.depart} - ${this.busForm.arrivee}`;

    if (this.isEditing && this.busForm.id) {
      const occupiedCount = this.reservantsPourBus(this.busForm.id).length;
      const busToUpdate: Partial<Bus> = {
        marque: this.busForm.marque,
        modele: this.busForm.modele,
        immatriculation: this.busForm.immatriculation,
        capacite: this.busForm.capacite,
        typeCarburant: this.busForm.typeCarburant,
        ligne: fullLigne,
        heureDepart: this.busForm.heureDepart,
        dureeMinutes: this.busForm.dureeMinutes,
        joursDisponibles: this.joursSelectionnes.join(','),
        statut: this.busForm.statut,
        placesRestantes: this.busForm.capacite - occupiedCount,
        photoUrl: photoUrlValue,
        packDates: [...this.packDates],
        arrets: this.busForm.arrets || []
      };
      this.busService.update(this.busForm.id, busToUpdate).subscribe({
        next: () => {
          if (this.busForm.packId) {
            const packBuses = this.navettes.filter(
              b => b.packId === this.busForm.packId && b.id !== this.busForm.id
            );
            if (packBuses.length > 0) {
              const syncRequests = packBuses.map(rb => {
                const occupied = this.reservantsPourBus(rb.id).length;
                return this.busService.update(rb.id!, {
                  arrets: [...(busToUpdate.arrets || [])],
                  ...(this.syncWithFleet ? { ...busToUpdate, placesRestantes: rb.capacite - occupied } : {})
                });
              });
              forkJoin(syncRequests).subscribe(() => {
                this.loadBus();
                this.closeModal();
              });
              return;
            }
          }
          if (this.syncWithFleet && this.relatedBuses.length > 0) {
            const syncRequests = this.relatedBuses.map(rb => {
              const occupied = this.reservantsPourBus(rb.id).length;
              return this.busService.update(rb.id, {
                ...busToUpdate,
                placesRestantes: rb.capacite - occupied
              });
            });
            forkJoin(syncRequests).subscribe(() => {
              this.loadBus();
              this.closeModal();
            });
          } else {
            this.loadBus();
            this.closeModal();
          }
        },
        error: () => this.errorMessage = 'Erreur lors de la modification'
      });
    } else if (this.createBusPack && this.packBusList.length >= 1) {
      const packId = crypto.randomUUID();
      const requests = this.packBusList.map(packBus =>
        this.busService.create({
          marque: packBus.marque,
          modele: packBus.modele,
          immatriculation: packBus.immatriculation,
          capacite: packBus.capacite,
          placesRestantes: packBus.capacite,
          statut: packBus.statut,
          typeCarburant: this.busForm.typeCarburant,
          ligne: fullLigne,
          heureDepart: this.busForm.heureDepart,
          dureeMinutes: this.busForm.dureeMinutes,
          joursDisponibles: this.joursSelectionnes.join(','),
          photoUrl: photoUrlValue,
          packId: packId,
          packDates: [...this.packDates],
          arrets: this.busForm.arrets || []
        })
      );
      forkJoin(requests).subscribe({
        next: () => { this.loadBus(); this.closeModal(); },
        error: () => this.errorMessage = 'Erreur lors de la création du pack'
      });
    } else {
      const newBus: Partial<Bus> = {
        marque: this.busForm.marque,
        modele: this.busForm.modele,
        immatriculation: this.busForm.immatriculation,
        capacite: this.busForm.capacite,
        placesRestantes: this.busForm.capacite,
        typeCarburant: this.busForm.typeCarburant,
        ligne: fullLigne,
        heureDepart: this.busForm.heureDepart,
        dureeMinutes: this.busForm.dureeMinutes,
        joursDisponibles: this.joursSelectionnes.join(','),
        statut: this.busForm.statut,
        photoUrl: photoUrlValue,
        arrets: this.busForm.arrets || []
      };
      this.busService.create(newBus).subscribe({
        next: () => { this.loadBus(); this.closeModal(); },
        error: () => this.errorMessage = 'Erreur lors de la création'
      });
    }
  }

  get packBusActifCount(): number { return this.packBusList.filter(b => b.statut === 'ACTIF').length; }
  get packBusInactifCount(): number { return this.packBusList.filter(b => b.statut === 'INACTIF').length; }
  get busSansPack(): Bus[] { return this.filteredNavettes.filter(b => !b.packId); }

  get busParPack(): { packId: string; buses: Bus[] }[] {
    const map = new Map<string, Bus[]>();
    this.filteredNavettes.filter(b => !!b.packId).forEach(b => {
      const key = b.packId!;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(b);
    });
    return Array.from(map.entries()).map(([packId, buses]) => ({ packId, buses }));
  }

  countActifs(buses: Bus[]): number { return buses.filter(b => b.statut === 'ACTIF').length; }

  addPackBus(): void {
    this.packBusList.push({ statut: 'INACTIF', capacite: 0, marque: '', modele: '', immatriculation: '' });
  }

  removePackBus(index: number): void { this.packBusList.splice(index, 1); }

  applyStopRecommendation(stat: any): void {
    if (!stat.targetBusId) {
      this._toastrService.warning('Impossible de trouver un bus correspondant à cet arrêt.');
      return;
    }

    const bus = this.navettes.find(b => b.id === stat.targetBusId);
    if (!bus) return;

    this.openEditModal(bus);
    this.arretInput = stat.neighborhood;
    this.selectedLat = stat.latitude;
    this.selectedLng = stat.longitude;

    if (this.stopPickerMap && this.selectedLat && this.selectedLng) {
      if (this.stopPickerMarker) {
        this.stopPickerMap.removeLayer(this.stopPickerMarker);
      }
      this.stopPickerMarker = L.marker([this.selectedLat, this.selectedLng]).addTo(this.stopPickerMap);
      this.stopPickerMap.setView([this.selectedLat, this.selectedLng], 15);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  deleteBus(id: string): void {
    const dialogRef = this._fuseConfirmationService.open({
      title: 'Supprimer le bus',
      message: 'Êtes-vous sûr de vouloir supprimer ce bus ?',
      icon: { show: true, name: 'heroicons_outline:trash', color: 'warn' },
      actions: { confirm: { label: 'Supprimer', color: 'warn' } }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result === 'confirmed') {
        this.busService.delete(id).subscribe({
          next: () => {
            this._toastrService.success('Bus supprimé avec succès');
            this.loadBus();
          },
          error: () => this._toastrService.error('Erreur lors de la suppression du bus')
        });
      }
    });
  }

  formatLigne(event: any) {
    let value = event.target.value;
    if (value && !value.startsWith('- ')) {
      this.busForm.ligne = '- ' + value.replace(/^- /, '');
    } else if (!value) {
      this.busForm.ligne = '- ';
    }
  }

  closeModal(): void {
    this.showModal = false;
    this.joursSelectionnes = [];
    this.busForm = this.emptyBus();
    this.errorMessage = '';
    this.createBusPack = false;
    this.packBusList = [];
    this.submitted = false;
  }

  setActiveSection(section: AdminSection): void {
    this.activeSection = section;
    if (section === 'reclamations') {
      this.initHeatmap();
    }
  }

  setReservationType(type: ReservationType): void { this.reservationType = type; }

  get filteredNavettes(): Bus[] {
    if (!this.searchTerm) return this.navettes;
    return this.navettes.filter(n => n.ligne?.toLowerCase().includes(this.searchTerm.toLowerCase()) || n.marque?.toLowerCase().includes(this.searchTerm.toLowerCase()) || n.immatriculation?.toLowerCase().includes(this.searchTerm.toLowerCase()));
  }

  get filteredReservations(): any[] {
    if (this.reservationType === 'archive') {
      return this.archivedReservations;
    }
    return this.reservations.filter(r => r.type === this.reservationType);
  }

  get totalStock(): number { return this.cadeaux.reduce((sum, c) => sum + c.stock, 0); }

  get stats() {
    const resNavette = this.reservations.filter(r => r.type === 'navette');
    const resCovoit = this.reservations.filter(r => r.type === 'covoiturage');

    const sumField = (list: any[], field: string) => Math.round(list.reduce((sum, r) => sum + (r[field] || 0), 0));

    const co2Total = sumField(this.reservations, 'co2Economise');
    const pointsTotal = sumField(this.reservations, 'pointsEco');

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const lastMonthDate = new Date();
    lastMonthDate.setMonth(now.getMonth() - 1);
    const lastMonth = lastMonthDate.getMonth();
    const lastMonthYear = lastMonthDate.getFullYear();

    const filterByMonth = (list: any[], month: number, year: number) => {
      return list.filter(r => {
        if (!r.date || r.date === '—') return false;
        const d = new Date(r.date);
        return d.getMonth() === month && d.getFullYear() === year;
      });
    };

    const resNavetteCur = filterByMonth(resNavette, currentMonth, currentYear);
    const resNavetteLast = filterByMonth(resNavette, lastMonth, lastMonthYear);
    const resCovoitCur = filterByMonth(resCovoit, currentMonth, currentYear);
    const resCovoitLast = filterByMonth(resCovoit, lastMonth, lastMonthYear);

    const getTrend = (cur: number, last: number) => {
      if (last === 0) return 0;
      return Math.round(((cur - last) / last) * 100);
    };

    return {
      co2Value: co2Total,
      pointsValue: pointsTotal,
      covoitValue: resCovoit.length,
      navetteValue: resNavette.length,
      trends: {
        points: getTrend(resNavetteCur.length + resCovoitCur.length, resNavetteLast.length + resCovoitLast.length),
        covoit: getTrend(resCovoitCur.length, resCovoitLast.length),
        navette: getTrend(resNavetteCur.length, resNavetteLast.length)
      },
      totalNavettes: this.navettes.length,
      archiveValue: this.archivedReservations.length
    };
  }

  private initCharts(): void {
    this.chartMobility = {
      series: [
        { name: 'Covoiturages', data: [12, 18, 15, 25, 22, 30, 28] },
        { name: 'Navettes', data: [10, 15, 20, 18, 30, 45, 42] }
      ],
      chart: { height: 300, type: 'area', toolbar: { show: false }, fontFamily: 'inherit' },
      colors: ['#1D9E75', '#0F3460'],
      dataLabels: { enabled: false },
      stroke: { curve: 'smooth', width: 3 },
      grid: { padding: { left: 0, right: 0 }, strokeDashArray: 4, yaxis: { lines: { show: true } } },
      xaxis: { type: 'category', categories: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'], labels: { style: { colors: '#64748B', fontSize: '12px' } } },
      yaxis: { labels: { style: { colors: '#64748B', fontSize: '12px' } } },
      fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.1, stops: [0, 90, 100] } },
      legend: { position: 'top', horizontalAlign: 'right' }
    };

    this.chartEco = {
      series: [45, 30, 25],
      chart: { type: 'donut', height: 280 },
      labels: ['CO2 économisé', 'Eco Points', 'Utilisateurs Actifs'],
      colors: ['#1D9E75', '#F5A623', '#0F3460'],
      plotOptions: { pie: { donut: { size: '75%', labels: { show: true, total: { show: true, label: 'Global Impact', formatter: () => 'Top' } } } } },
      legend: { position: 'bottom' },
      dataLabels: { enabled: false }
    };

    this.chartDaily = {
      series: [{ name: 'Réservations', data: [44, 55, 41, 67, 22, 43, 21] }],
      chart: { height: 300, type: 'bar', toolbar: { show: false } },
      plotOptions: { bar: { columnWidth: '45%', distributed: true, borderRadius: 8 } },
      colors: ['#1D9E75', '#F5A623', '#0F3460', '#E94560', '#1D9E75', '#F5A623', '#0F3460'],
      dataLabels: { enabled: false },
      legend: { show: false },
      xaxis: { categories: ['L', 'M', 'M', 'J', 'V', 'S', 'D'], labels: { style: { fontSize: '12px' } } }
    };
  }

  private checkWaitlists(): void {
    const reserveBuses = this.navettes.filter(b => b.statut === 'INACTIF' && !!b.packId);

    reserveBuses.forEach(bus => {
      this.packDates.forEach(date => {
        const waitlistForDay = this.reservantsParJour(bus.id, date).filter(r => r.isWaitlisted);
        const ratio = bus.capacite > 0 ? (waitlistForDay.length / bus.capacite) : 0;

        if (ratio >= 0.5) {
          this.addNotification({
            id: `notif-${bus.id}-${date}`,
            type: 'warning',
            title: '⚠️ Occupation Critique',
            message: `Le jour ${new Date(date).toLocaleDateString()} a atteint ${Math.round(ratio * 100)}% de la capacité sur ${bus.marque}.`,
            busId: bus.id,
            date: date,
            actionLabel: 'Activer maintenant'
          });
        }
      });
    });
  }

  private addNotification(notif: any): void {
    if (!this.notifications.some(n => n.busId === notif.busId)) {
      this.notifications.push(notif);
    }
  }

  dismissNotification(id: any): void {
    this.notifications = this.notifications.filter(n => n.id !== id);
  }

  confirmActivation(date: string | null, busId: string): void {
    const isPermanent = !date;
    const dialogRef = this._fuseConfirmationService.open({
      title: isPermanent ? 'Activation permanente' : 'Activation ponctuelle',
      message: isPermanent
        ? 'Voulez-vous activer ce bus de manière permanente ?'
        : `Confirmer l'activation de ce bus pour le ${new Date(date!).toLocaleDateString()} ?`,
      icon: { show: true, name: 'heroicons_outline:check-circle', color: 'success' },
      actions: { confirm: { label: 'Confirmer', color: 'primary' } }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result === 'confirmed') {
        this.executeActivation(date, busId);
      }
    });
  }

  private executeActivation(date: string | null, busId: string): void {
    if (date) {
      this.busService.activateForDay(busId, date).subscribe({
        next: () => {
          this._toastrService.success(`Bus activé pour le ${new Date(date).toLocaleDateString()}`);
          this.loadBus();
        },
        error: () => this._toastrService.error('Erreur lors de l\'activation du bus pour cette date.')
      });
    } else {
      this.busService.update(busId, { statut: 'ACTIF' }).subscribe({
        next: () => {
          this._toastrService.success('Bus activé de manière permanente.');
          this.loadBus();
        },
        error: () => this._toastrService.error('Erreur lors de l\'activation permanente du bus.')
      });
    }
  }

  activateBus(busId: string, date?: string): void {
    this.confirmActivation(date || null, busId);
  }

  private initWeather(): void {
    const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    const conditions = ['Ensoleillé', 'Nuageux', 'Pluie', 'Ensoleillé', 'Nuageux', 'Orage', 'Dégagé'];
    const icons = ['feather:sun', 'feather:cloud', 'feather:cloud-rain', 'feather:sun', 'feather:cloud', 'feather:zap', 'feather:sun'];

    this.weatherForecast = days.map((day, i) => ({
      day,
      temp: 20 + Math.floor(Math.random() * 8),
      condition: conditions[i],
      icon: icons[i]
    }));
  }

  loadWeeklyPrediction() {
    this.isLoadingPrediction = true;
    this.predictionService.getWeeklyPrediction().subscribe({
      next: (data) => {
        let predictionsRaw = [];
        let todayRaw = null;
        let totalVal = 0;
        let avgVal = 0;

        if (Array.isArray(data)) {
          predictionsRaw = data;
        } else if (data) {
          predictionsRaw = data.predictions || data['prédictions'] || [];
          todayRaw = data.today || null;
          totalVal = data.total || 0;
          avgVal = data.average || data['moyenne'] || 0;
        }

        if (todayRaw) {
          this.currentWeather = {
            temp: Math.round(todayRaw.temp || 24),
            condition: todayRaw.weather || 'Ensoleillé',
            icon: this.getWeatherIcon(todayRaw.weather),
            humidity: todayRaw.humidity || 45,
            wind: todayRaw.wind || 12,
            location: 'Live: ' + (todayRaw.location || 'Tunis') + ', TN',
            date: todayRaw.date ? new Date(todayRaw.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) : this.currentWeather.date
          };
        }

        const daysOrder = ['LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI', 'DIMANCHE'];
        const conditions = ['Ensoleillé', 'Nuageux', 'Beau temps', 'Nuageux', 'Ensoleillé', 'Pluie', 'Beau temps'];

        const now = new Date();
        const currentDay = now.getDay();
        const diff = (currentDay === 0 ? -6 : 1) - currentDay;
        const monday = new Date(now);
        monday.setDate(now.getDate() + diff);

        this.weeklyPredictions = predictionsRaw.map((p: any, i: number) => {
          const itemDay = (p.jour || '').toUpperCase();
          let dayIdx = daysOrder.indexOf(itemDay);
          if (dayIdx === -1) dayIdx = i;

          const d = new Date(monday);
          d.setDate(monday.getDate() + dayIdx);

          return {
            ...p,
            predicted: p.predicted || p['prédit'] || 0,
            jour: (p.jour || daysOrder[i]).substring(0, 3).toUpperCase(),
            date: d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
            temp: p.temp || (20 + Math.floor(Math.random() * 8)),
            meteo: p.meteo || conditions[dayIdx]
          };
        });

        const total = totalVal || this.weeklyPredictions.reduce((sum, p) => sum + (p.predicted || 0), 0);
        this.predictionAverage = avgVal || (this.weeklyPredictions.length > 0 ? Math.round(total / this.weeklyPredictions.length) : 0);
        this.predictionTotal = total;

        if (this.weeklyPredictions && this.weeklyPredictions.length > 0) {
          const pToday = this.weeklyPredictions[0];
          if (!todayRaw || this.currentWeather.temp <= 0 || this.currentWeather.temp === 24) {
            this.currentWeather.temp = Math.round(Number(pToday.temp) || 28);
            this.currentWeather.condition = pToday.meteo || 'Ensoleillé';
            this.currentWeather.icon = this.getWeatherIcon(pToday.meteo);
            this.currentWeather.location = 'Tunis, TN';
          }
        }

        this.isLoadingPrediction = false;
        this._changeDetectorRef.detectChanges();
      },
      error: (err) => {
        console.error('Erreur:', err);
        this.isLoadingPrediction = false;
      }
    });
  }

  getWeatherIcon(condition: string): string {
    const c = (condition || '').toLowerCase();
    if (c.includes('soleil') || c.includes('ensoleillé') || c.includes('dégagé') || c.includes('clair') || c.includes('beau')) return 'feather:sun';
    if (c.includes('nuage')) return 'feather:cloud';
    if (c.includes('pluie') || c.includes('bruine')) return 'feather:cloud-rain';
    if (c.includes('orage') || c.includes('éclair') || c.includes('zap')) return 'feather:zap';
    return 'feather:sun';
  }

  confirmReservation(res: any): void {
    const update = { statut: 'CONFIRME' };
    this.isLoading = true;

    const obs = res.type === 'navette'
      ? this.covoiturageService.updateReservationStatusNavette(res.id, update)
      : this.covoiturageService.updateReservationStatus(res.id, update);

    obs.subscribe({
      next: () => {
        this.loadAllData();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erreur confirmation:', err);
        this.isLoading = false;
      }
    });
  }

  cancelReservation(res: any): void {
    const dialogRef = this._fuseConfirmationService.open({
      title: 'Annuler la réservation',
      message: 'Voulez-vous vraiment annuler cette réservation ?',
      icon: { show: true, name: 'heroicons_outline:exclamation', color: 'warn' },
      actions: { confirm: { label: 'Annuler', color: 'warn' } }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result === 'confirmed') {
        this.isLoading = true;
        const obs = res.type === 'navette'
          ? this.covoiturageService.annulerReservationNavette(res.id)
          : this.covoiturageService.annulerReservation(res.id);

        obs.subscribe({
          next: () => {
            this.loadAllData();
            this.isLoading = false;
            this._toastrService.success('Réservation annulée');
          },
          error: (err) => {
            console.error('Erreur annulation:', err);
            this.isLoading = false;
            this._toastrService.error('Erreur lors de l\'annulation');
          }
        });
      }
    });
  }
}