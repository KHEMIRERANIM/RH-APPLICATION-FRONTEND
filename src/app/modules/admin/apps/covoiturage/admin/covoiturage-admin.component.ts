import { Component, OnInit } from '@angular/core';
import { BusService, Bus, BusPackRequest } from '../bus.service';
import { CovoiturageService } from '../covoiturage.service';
import { forkJoin, of } from 'rxjs';
import { UserService } from '../../../../../services/user.service';
import { catchError } from 'rxjs/operators';
import { PredictionService } from '../services/prediction.service';

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

type AdminSection = 'statistiques' | 'navettes' | 'reservations' | 'cadeaux';
type ReservationType = 'navette' | 'covoiturage';

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
  reservationType: ReservationType = 'navette';
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

  // Nouveaux graphiques pour le design user
  co2Chart: any;
  departureZonesChart: any;
  departureZonesData: any[] = [];
  weeklyChart: any;
  fleetPerformanceChart: any;
  dateDistributionChart: any;

  // Météo
  currentWeather: any = {
    temp: 24,
    condition: 'Ensoleillé',
    icon: 'feather:sun',
    humidity: 45,
    wind: 12,
    location: 'Tunis, TN'
  };
  weatherForecast: any[] = [];

  // Propriétés Prédiction
  weeklyPredictions: any[] = [];
  predictionTotal: number = 0;
  predictionAverage: number = 0;
  isLoadingPrediction: boolean = false;

  constructor(
    private busService: BusService,
    private covoiturageService: CovoiturageService,
    private userService: UserService,
    private predictionService: PredictionService
  ) { }

  ngOnInit(): void {
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
      resCovoit: this.covoiturageService.getAllReservations()
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

        // Extraire les packDates existants pour checkWaitlists
        const allPackDates: string[] = [];
        this.navettes.forEach(b => {
          if (b.packDates && b.packDates.length) {
            b.packDates.forEach(d => {
              if (!allPackDates.includes(d)) allPackDates.push(d);
            });
          }
        });
        this.packDates = allPackDates.sort();

        // 3. Fusionner les réservations pour l'onglet Admin
        const merged: any[] = [];

        // Navettes
        results.resNavette.forEach((rn: any) => {
          const bus = this.navettes.find(b => b.id === rn.busId);
          // Calcul de l'index du jour : 0=Dim, 1=Lun, ..., 6=Sam
          let dayIndex = -1;
          if (rn.date && rn.date.includes('-')) {
            dayIndex = new Date(rn.date).getDay();
          } else if (rn.joursSelectionnes && rn.joursSelectionnes.length > 0) {
            // Mapping si 0=Lun, 1=Mar... 6=Dim (Backend) vers 0=Dim, 1=Lun... (JS)
            dayIndex = (rn.joursSelectionnes[0] + 1) % 7;
          }

          merged.push({
            id: rn.id,
            employeId: rn.employeId,
            employeNom: this.getNomEmploye(rn.employeId),
            employePhoto: `https://ui-avatars.com/api/?name=${this.getNomEmploye(rn.employeId)}&background=random`,
            type: 'navette',
            trajet: bus ? (bus.ligne || `${bus.depart} -> ${bus.arrivee}`) : 'Navette',
            adresseDepart: bus ? (bus.depart || (bus.ligne ? bus.ligne.split(' - ')[0] : 'Inconnue')) : 'Inconnue',
            date: (rn.date && rn.date.includes('-')) ? rn.date : '—',
            dayIndex: dayIndex,
            heure: bus?.heureDepart || '—',
            statut: this.mapStatut(rn.statut),
            co2Economise: rn.co2EconomiseKg || 0,
            pointsEco: rn.pointsEco || 0
          });
        });

        // Covoiturage
        results.resCovoit.forEach((rc: any) => {
          const trajet = this.trajets.find(t => t.id === rc.trajetId);
          const dateStr = rc.dateReservation ? rc.dateReservation.split('T')[0] : '';
          merged.push({
            id: rc.id,
            employeId: rc.employeId,
            employeNom: this.getNomEmploye(rc.employeId),
            employePhoto: `https://ui-avatars.com/api/?name=${this.getNomEmploye(rc.employeId)}&background=random`,
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
        this.isLoading = false;
        this.initCharts();
        this.initNewCharts();
        this.initWeather(); // Initialisation de la météo
        this.checkWaitlists();
      },
      error: (err) => {
        console.error('Erreur chargement admin:', err);
        this.isLoading = false;
      }
    });
  }

  private initNewCharts(): void {
    const validRes = this.reservations.filter(r => r.date && r.date !== '—');

    // 1. Zones de Départ Réelles
    const zoneCounts = new Map<string, number>();
    this.reservations.forEach(r => {
      const z = r.adresseDepart || 'Inconnue';
      zoneCounts.set(z, (zoneCounts.get(z) || 0) + 1);
    });

    const colors = ['#6366F1', '#14B8A6', '#F59E0B', '#EF4444', '#8B5CF6'];
    this.departureZonesData = Array.from(zoneCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([name, value], i) => ({
        name,
        value,
        color: colors[i % colors.length],
        percentage: Math.round((value / this.reservations.length) * 100)
      }));

    // --- Logique Semaine Glissante ---
    const now = new Date();
    const day = now.getDay(); // 0 (Dim) à 6 (Sam)
    const diff = (day === 0 ? -6 : 1) - day; // Ajustement pour trouver le Lundi
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff);
    monday.setHours(0, 0, 0, 0);

    const currentWeekDates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      currentWeekDates.push(d.toISOString().split('T')[0]);
    }

    // 2. Distribution des réservations (Cette Semaine uniquement)
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

    // 3. Évolution CO2 Réelle (Cette Semaine uniquement)
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

    // 4. Graphique zones départ (Actualisé)
    this.departureZonesChart = {
      series: this.departureZonesData.map(d => d.value),
      chart: { type: 'donut', height: 240, toolbar: { show: false } },
      labels: this.departureZonesData.map(d => d.name),
      colors: this.departureZonesData.map(d => d.color),
      plotOptions: { pie: { donut: { size: '60%' } } },
      legend: { show: false },
      dataLabels: { enabled: false }
    };

    // 5. Usage Hebdomadaire Réel (Par jour de la semaine)
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

    // On réorganise pour commencer par Lun (JS: 0=Dim, 1=Lun...)
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

    // Graphique Performance Flotte
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
    if (st === 'CONFIRME' || st === 'CONFIRMÉE') return 'Confirmée';
    if (st === 'ANNULE' || st === 'ANNULÉE') return 'Annulée';
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
    return this.employesMap.get(String(id)) || `Employé ${String(id).slice(0, 8)}…`;
  }

  reservantsParJour(busId: string | undefined, date: string): { id: string; employeId: string; statut: string; isWaitlisted: boolean }[] {
    if (!busId || !this.reservationsNavette.length || !date) return [];

    const bus = this.navettes.find(b => b.id === busId);
    if (!bus) return [];

    const packId = bus.packId;
    const capacity = bus.capacite || 0;

    // Charger TOUTES les réservations du pack pour ce jour
    const packReservations = this.reservationsNavette
      .filter(r => {
        const rBus = this.navettes.find(b => b.id === r.busId);
        const st = String(r.statut || '').toUpperCase();
        return rBus?.packId === packId &&
          st !== 'ANNULE' &&
          (r.date === date || (r.joursSelectionnes && r.joursSelectionnes.includes(date)));
      })
      .sort((a, b) => new Date(a.dateCreation || 0).getTime() - new Date(b.dateCreation || 0).getTime());

    // Identifier les bus du pack (Ordre : ACTIF en premier, puis date de création)
    const packBuses = this.navettes
      .filter(b => b.packId === packId)
      .sort((a, b) => {
        if (a.statut === 'ACTIF' && b.statut !== 'ACTIF') return -1;
        if (a.statut !== 'ACTIF' && b.statut === 'ACTIF') return 1;
        return new Date(a.dateCreation || 0).getTime() - new Date(b.dateCreation || 0).getTime();
      });

    const distribution = new Map<string, any[]>();
    packBuses.forEach(b => distribution.set(b.id!, []));

    // Distribution finale avec application des statuts de groupe
    let currentBusIndex = 0;
    packReservations.forEach(r => {
      while (currentBusIndex < packBuses.length && distribution.get(packBuses[currentBusIndex].id!)!.length >= packBuses[currentBusIndex].capacite) {
        currentBusIndex++;
      }

      const targetBus = currentBusIndex < packBuses.length ? packBuses[currentBusIndex] : packBuses[packBuses.length - 1];
      const targetBusId = targetBus.id!;

      if (targetBusId) {
        // Règle de groupe : Le statut "isWaitlisted" dépend de l'activation du bus
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
    this.showModal = true;
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

  emptyBus(): Bus {
    return {
      marque: '', modele: '', immatriculation: '',
      capacite: 0, typeCarburant: 'DIESEL', ligne: '',
      depart: '', arrivee: '',
      heureDepart: '', dureeMinutes: 0,
      joursDisponibles: '',
      statut: 'ACTIF',
      placesRestantes: 0,
      photoUrl: this.defaultPhotoUrl
    };
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
        photoUrl: photoUrlValue
      };
      this.busService.update(this.busForm.id, busToUpdate).subscribe({
        next: () => {
          this.loadBus();
          this.closeModal();
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
          packDates: [...this.packDates]
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
        photoUrl: photoUrlValue
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

  deleteBus(id: string): void {
    if (confirm('Supprimer ce bus ?')) {
      this.busService.delete(id).subscribe({
        next: () => this.loadBus(),
        error: () => this.errorMessage = 'Erreur lors de la suppression'
      });
    }
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

  setActiveSection(section: AdminSection): void { this.activeSection = section; }
  setReservationType(type: ReservationType): void { this.reservationType = type; }

  get filteredNavettes(): Bus[] {
    if (!this.searchTerm) return this.navettes;
    return this.navettes.filter(n => n.ligne?.toLowerCase().includes(this.searchTerm.toLowerCase()) || n.marque?.toLowerCase().includes(this.searchTerm.toLowerCase()) || n.immatriculation?.toLowerCase().includes(this.searchTerm.toLowerCase()));
  }

  get filteredReservations(): any[] {
    return this.reservations.filter(r => r.type === this.reservationType);
  }
  get totalStock(): number { return this.cadeaux.reduce((sum, c) => sum + c.stock, 0); }

  get stats() {
    const resNavette = this.reservations.filter(r => r.type === 'navette');
    const resCovoit = this.reservations.filter(r => r.type === 'covoiturage');

    // SOMME RÉELLE DES DONNÉES SANS CALCULS FICTIFS
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
      totalNavettes: this.navettes.length
    };
  }

  private initCharts(): void {
    this.chartMobility = {
      series: [
        { name: "Covoiturages", data: [12, 18, 15, 25, 22, 30, 28] },
        { name: "Navettes", data: [10, 15, 20, 18, 30, 45, 42] }
      ],
      chart: { height: 300, type: "area", toolbar: { show: false }, fontFamily: 'inherit' },
      colors: ["#1D9E75", "#0F3460"],
      dataLabels: { enabled: false },
      stroke: { curve: "smooth", width: 3 },
      grid: { padding: { left: 0, right: 0 }, strokeDashArray: 4, yaxis: { lines: { show: true } } },
      xaxis: { type: "category", categories: ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"], labels: { style: { colors: "#64748B", fontSize: '12px' } } },
      yaxis: { labels: { style: { colors: "#64748B", fontSize: '12px' } } },
      fill: { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.1, stops: [0, 90, 100] } },
      legend: { position: "top", horizontalAlign: "right" }
    };

    this.chartEco = {
      series: [45, 30, 25],
      chart: { type: "donut", height: 280 },
      labels: ["CO2 Économisé", "Eco Points", "Utilisateurs Actifs"],
      colors: ["#1D9E75", "#F5A623", "#0F3460"],
      plotOptions: { pie: { donut: { size: '75%', labels: { show: true, total: { show: true, label: 'Global Impact', formatter: () => 'Top' } } } } },
      legend: { position: "bottom" },
      dataLabels: { enabled: false }
    };

    this.chartDaily = {
      series: [{ name: "Réservations", data: [44, 55, 41, 67, 22, 43, 21] }],
      chart: { height: 300, type: "bar", toolbar: { show: false } },
      plotOptions: { bar: { columnWidth: '45%', distributed: true, borderRadius: 8 } },
      colors: ["#1D9E75", "#F5A623", "#0F3460", "#E94560", "#1D9E75", "#F5A623", "#0F3460"],
      dataLabels: { enabled: false },
      legend: { show: false },
      xaxis: { categories: ["L", "M", "M", "J", "V", "S", "D"], labels: { style: { fontSize: '12px' } } }
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
            title: '⚡ Occupation Critique',
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

  activateBus(busId: string, date?: string): void {
    if (date && !confirm(`Confirmer l'activation de ce bus pour le ${new Date(date).toLocaleDateString()} ?`)) return;
    if (!date && !confirm(`Voulez-vous activer ce bus de manière permanente ?`)) return;

    this.isLoading = true;

    if (date) {
      this.busService.activateForDay(busId, date).subscribe({
        next: () => {
          const passengers = this.reservantsParJour(busId, date);
          const bus = this.navettes.find(b => b.id === busId);
          const busName = bus ? `${bus.marque} ${bus.modele}` : 'Navette';

          passengers.forEach(p => {
            const notification = {
              destinataireId: p.employeId,
              type: 'BUS_ACTIVE',
              contenu: `Bonne nouvelle ! Votre navette "${busName}" pour le ${new Date(date).toLocaleDateString()} a été activée.`,
              reservationId: p.id
            };
            this.covoiturageService.sendNotification(notification).subscribe({
              error: (err) => console.error('Erreur envoi notification app', err)
            });
          });

          this.loadAllData();
          this.notifications = this.notifications.filter(n => n.busId !== busId || n.date !== date);
          this.isLoading = false;
          alert(`✅ Bus activé et ${passengers.length} notifications envoyées pour le ${new Date(date).toLocaleDateString()}`);
        },
        error: (err) => {
          console.error('Erreur activation jour', err);
          this.isLoading = false;
          alert('❌ Erreur lors de l\'activation du bus pour cette date.');
        }
      });
    } else {
      this.busService.update(busId, { statut: 'ACTIF' }).subscribe({
        next: () => {
          this.loadAllData();
          this.notifications = this.notifications.filter(n => n.busId !== busId);
          this.isLoading = false;
          alert('✅ Bus activé de manière permanente.');
        },
        error: (err) => {
          console.error('Erreur activation bus', err);
          this.isLoading = false;
          alert('❌ Erreur lors de l\'activation permanente du bus.');
        }
      });
    }
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
        console.log('--- Debug Prédictions ---');
        console.log('Data reçue:', data);
        
        // Extraction robuste : on cherche le tableau de prédictions
        let list = [];
        if (Array.isArray(data)) {
          list = data;
        } else if (data && typeof data === 'object') {
          list = data.prédictions || data.predictions || data.data || [];
        }
        
        this.weeklyPredictions = list;
        
        // Extraction robuste du total
        this.predictionTotal = data?.total || list.reduce((acc: number, curr: any) => acc + (curr.prédit || curr.predicted || 0), 0);
        
        // Calcul/Extraction de la moyenne
        if (data?.average || data?.moyenne) {
          this.predictionAverage = data.average || data.moyenne;
        } else if (list.length > 0) {
          this.predictionAverage = Math.round(this.predictionTotal / list.length);
        } else {
          this.predictionAverage = 0;
        }
        
        console.log('Liste traitée:', this.weeklyPredictions);
        console.log('Total:', this.predictionTotal);
        console.log('------------------------');
        
        this.isLoadingPrediction = false;
      },
      error: (err) => {
        console.error('Erreur API Prédiction:', err);
        this.isLoadingPrediction = false;
        // Fallback vers météo en cas d'erreur réseau
        this.initWeather();
      }
    });
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
    if (!confirm('Voulez-vous vraiment annuler cette réservation ?')) return;

    this.isLoading = true;
    const obs = res.type === 'navette'
      ? this.covoiturageService.annulerReservationNavette(res.id)
      : this.covoiturageService.annulerReservation(res.id);

    obs.subscribe({
      next: () => {
        this.loadAllData();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erreur annulation:', err);
        this.isLoading = false;
      }
    });
  }
}