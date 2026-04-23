import { Component, OnInit, AfterViewInit, OnDestroy, ElementRef, Renderer2, ViewChild, ChangeDetectorRef, NgZone, ApplicationRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CovoiturageService, Vehicule, Trajet, ReservationResponse, ReservationRequest } from '../covoiturage.service';
import { UserService, Employee } from '../../../../../services/user.service';
import { EmailService } from '../../../../../services/email.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { getWsTrackingSockJsUrl as getWsTrackingSockJsUrlFromEnv } from '../../../../../../environments/environment';
import { forkJoin, of, firstValueFrom } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { PaiementService } from '../services/paiement.service';
import { loadStripe } from '@stripe/stripe-js';
import { ReclamationService, Reclamation } from '../services/reclamation.service';
import { WalkingService } from '../services/walking.service';

// Leaflet loaded via CDN
declare var L: any;


@Component({
  selector: 'app-covoiturage-user',
  standalone: false,
  templateUrl: './covoiturage-user.component.html',
})
export class CovoiturageUserComponent implements OnInit, AfterViewInit, OnDestroy {

  // Données
  carpoolOptions = [
    {
      id: 1,
      name: "Fatma Ben Ali",
      avatar: "https://images.unsplash.com/photo-1689600944138-da3b150d9cb8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjB3b21hbiUyMGhlYWRzaG90JTIwYnVzaW5lc3N8ZW58MXx8fHwxNzc0MTY5Mjk1fDA&ixlib=rb-4.1.0&q=80&w=200",
      departure: "Ariana",
      arrival: "Centre-ville Tunis",
      time: "08:00",
      seats: 3,
      reliable: true,
    },
    {
      id: 2,
      name: "Ahmed Mansour",
      avatar: "https://images.unsplash.com/photo-1629507208649-70919ca33793?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBtYW4lMjBidXNpbmVzcyUyMHBvcnRyYWl0fGVufDF8fHx8MTc3NDE1ODE0OHww&ixlib=rb-4.1.0&q=80&w=200",
      departure: "La Marsa",
      arrival: "Lac 2",
      time: "07:45",
      seats: 2,
      reliable: true,
    },
    {
      id: 3,
      name: "Mohamed Kacem",
      avatar: "https://images.unsplash.com/photo-1644269444230-c6d1f2722e10?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb3Jwb3JhdGUlMjBlbXBsb3llZSUyMHBvcnRyYWl0JTIwbWFufGVufDF8fHx8MTc3NDE2OTI5Nnww&ixlib=rb-4.1.0&q=80&w=200",
      departure: "Ben Arous",
      arrival: "Centre-ville Tunis",
      time: "08:15",
      seats: 1,
      reliable: false,
    }
  ];

  days = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

  myUsedTransports = [
    {
      id: 1,
      type: "covoiturage",
      driver: "Fatma Ben Ali",
      avatar: "https://images.unsplash.com/photo-1689600944138-da3b150d9cb8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjB3b21hbiUyMGhlYWRzaG90JTIwYnVzaW5lc3N8ZW58MXx8fHwxNzc0MTY5Mjk1fDA&ixlib=rb-4.1.0&q=80&w=200",
      departure: "Ariana",
      arrival: "Centre-ville Tunis",
      time: "08:00",
      seats: 3,
      daysUsed: ["Lun", "Mar", "Mer", "Jeu", "Ven"]
    },
    {
      id: 2,
      type: "navette",
      name: "Navette Entreprise",
      departure: "Lac 1",
      arrival: "Lac 2",
      time: "07:30",
      daysUsed: ["Lun", "Ven"],
      driver: null,
      avatar: null
    }
  ];

  myShuttleReservations: any[] = [];
  allShuttleReservations: any[] = [];
  navetteTrackingId: string = '';

  availableShuttles = [
    {
      id: 1,
      name: 'Navette Ligne A',
      route: 'Gare Centrale → Siège Social',
      stops: ['Gare Centrale', 'République', 'Avenue Bourguiba', 'Siège Social'],
      schedule: 'Toutes les 30 min',
      firstDeparture: '06:30',
      lastDeparture: '20:00',
      capacity: 25,
      available: 18,
      busNumber: 'BUS-101',
      image: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=400'
    },
    {
      id: 2,
      name: 'Navette Zone Industrielle',
      route: 'Métro Ligne 1 → Zone Industrielle',
      stops: ['Métro République', 'Centre Ville', 'Rond-Point Ghazela', 'Zone Industrielle'],
      schedule: 'Toutes les 45 min',
      firstDeparture: '06:00',
      lastDeparture: '22:00',
      capacity: 30,
      available: 22,
      busNumber: 'BUS-205',
      image: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400'
    },
    {
      id: 3,
      name: 'Navette Express Lac',
      route: 'Tunis Centre → Berges du Lac',
      stops: ['Place Barcelone', 'Passage', 'Lac 1', 'Lac 2', 'Berges du Lac'],
      schedule: 'Toutes les 20 min',
      firstDeparture: '07:00',
      lastDeparture: '19:00',
      capacity: 40,
      available: 35,
      busNumber: 'BUS-310',
      image: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400'
    },
    {
      id: 4,
      name: 'Navette Aéroport-Bureau',
      route: 'Aéroport Tunis-Carthage → Siège',
      stops: ['Aéroport Terminal 1', 'Aéroport Terminal 2', 'Centre Urbain Nord', 'Siège Social'],
      schedule: 'Toutes les 60 min',
      firstDeparture: '05:30',
      lastDeparture: '21:30',
      capacity: 20,
      available: 15,
      busNumber: 'BUS-401',
      image: 'https://images.unsplash.com/photo-1557223562-6c77ef16210f?w=400'
    }
  ];

  myProposedTransports = [
    {
      id: 1,
      driver: "Vous",
      departure: "Ben Arous",
      arrival: "Centre-ville Tunis",
      time: "07:45",
      seats: 2,
      bookedSeats: 1,
      daysActive: ["Lun", "Mar", "Mer", "Jeu", "Ven"],
      passengers: [
        {
          name: "Sarah Mansour",
          avatar: "https://images.unsplash.com/photo-1689600944138-da3b150d9cb8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjB3b21hbiUyMGhlYWRzaG90JTIwYnVzaW5lc3N8ZW58MXx8fHwxNzc0MTY5Mjk1fDA&ixlib=rb-4.1.0&q=80&w=200",
        },
      ],
    },
  ];

  // États
  selectedTab: string = 'covoiturage';
  selectedDays: string[] = ["Lun", "Mar", "Mer", "Jeu", "Ven"];
  showChat = false;
  activeSection: 'utilises' | 'proposes' | 'recompenses' | 'archives' = 'utilises';
  showGiftModal = false;
  isEditingTrajet = false;
  editingTrajetId: string | null = null;

  /** Filtre statut actif dans "Mes trajets" */
  trajetFilter: string = 'TOUS';

  /** Afficher/masquer la section archive des trajets */
  showTrajetArchive: boolean = false;

  // ─── Modale Revenus Gagnés ──────────────────────────────────────────────────
  showEarningsModal: boolean = false;
  earningsSelectedTab: 'overview' | 'byDay' | 'byPassenger' = 'overview';

  /** Ouvrir la modale des revenus */
  openEarningsModal() {
    this.earningsSelectedTab = 'overview';
    this.showEarningsModal = true;
  }

  /** Revenus totaux calculés sur les trajets effectués avec réservations confirmées/effectuées */
  get totalRevenus(): number {
    let total = 0;
    for (const t of this.backendTrajets) {
      const prix = t.prix ?? 0;
      const confirmedCount = (t.reservations || []).filter(
        r => ['CONFIRME', 'EFFECTUE'].includes(String(r.statut || '').toUpperCase())
      ).length;
      total += prix * confirmedCount;
    }
    return total;
  }

  /** Nombre total de trajets effectués (statut EFFECTUE) */
  get totalTrajetsEffectues(): number {
    return this.backendTrajets.filter(t => String(t.statut || '').toUpperCase() === 'EFFECTUE').length;
  }

  /** Nombre total de passagers transportés (réservations confirmées/effectuées) */
  get totalPassagers(): number {
    let total = 0;
    for (const t of this.backendTrajets) {
      total += (t.reservations || []).filter(
        r => ['CONFIRME', 'EFFECTUE'].includes(String(r.statut || '').toUpperCase())
      ).length;
    }
    return total;
  }

  /** Revenu moyen par trajet effectué */
  get revenuMoyenParTrajet(): number {
    const effectues = this.backendTrajets.filter(t => String(t.statut || '').toUpperCase() === 'EFFECTUE');
    if (effectues.length === 0) return 0;
    let total = 0;
    for (const t of effectues) {
      const prix = t.prix ?? 0;
      const n = (t.reservations || []).filter(
        r => ['CONFIRME', 'EFFECTUE'].includes(String(r.statut || '').toUpperCase())
      ).length;
      total += prix * n;
    }
    return Math.round((total / effectues.length) * 100) / 100;
  }

  /** Revenus par jour de la semaine */
  get revenuParJour(): { jour: string; revenu: number; trajets: number }[] {
    const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    const mapRevenu: Record<string, { revenu: number; trajets: number }> = {};
    JOURS.forEach(j => { mapRevenu[j] = { revenu: 0, trajets: 0 }; });
    for (const t of this.backendTrajets) {
      const prix = t.prix ?? 0;
      const passagers = (t.reservations || []).filter(
        r => ['CONFIRME', 'EFFECTUE'].includes(String(r.statut || '').toUpperCase())
      ).length;
      const jours = (t.joursDisponibles || '').split(',').map(j => j.trim().substring(0, 3));
      for (const j of jours) {
        const key = JOURS.find(k => k.toLowerCase() === j.toLowerCase());
        if (key && passagers > 0) {
          mapRevenu[key].revenu += prix * passagers;
          mapRevenu[key].trajets += 1;
        }
      }
    }
    return JOURS.map(j => ({ jour: j, revenu: mapRevenu[j].revenu, trajets: mapRevenu[j].trajets }));
  }

  /** Valeur max pour le graphique en barres des jours */
  get maxRevenuJour(): number {
    return Math.max(...this.revenuParJour.map(r => r.revenu), 1);
  }

  /** Revenus par trajet (détail) */
  get revenuParTrajet(): { trajet: any; revenu: number; passagers: number }[] {
    return this.backendTrajets
      .map(t => {
        const prix = t.prix ?? 0;
        const passagers = (t.reservations || []).filter(
          r => ['CONFIRME', 'EFFECTUE'].includes(String(r.statut || '').toUpperCase())
        ).length;
        return { trajet: t, revenu: prix * passagers, passagers };
      })
      .filter(x => x.revenu > 0)
      .sort((a, b) => b.revenu - a.revenu)
      .slice(0, 10);
  }

  /** Valeur max pour le graphique barres par trajet */
  get maxRevenuTrajet(): number {
    return Math.max(...this.revenuParTrajet.map(r => r.revenu), 1);
  }

  /** Revenus par passager */
  get revenuParPassager(): { nom: string; revenu: number; trajets: number }[] {
    const map: Record<string, { revenu: number; trajets: number }> = {};
    for (const t of this.backendTrajets) {
      const prix = t.prix ?? 0;
      const confirmed = (t.reservations || []).filter(
        r => ['CONFIRME', 'EFFECTUE'].includes(String(r.statut || '').toUpperCase())
      );
      for (const r of confirmed) {
        const nom = this.getEmployeeName(r.employeId) || r.employeId || 'Inconnu';
        if (!map[nom]) map[nom] = { revenu: 0, trajets: 0 };
        map[nom].revenu += prix;
        map[nom].trajets += 1;
      }
    }
    return Object.entries(map)
      .map(([nom, v]) => ({ nom, ...v }))
      .sort((a, b) => b.revenu - a.revenu)
      .slice(0, 8);
  }

  /** Valeur max pour le graphique par passager */
  get maxRevenuPassager(): number {
    return Math.max(...this.revenuParPassager.map(r => r.revenu), 1);
  }

  /** Jour avec le revenu le plus élevé */
  get bestEarningDay(): { jour: string; revenu: number } {
    const best = this.revenuParJour.reduce(
      (acc, cur) => cur.revenu > acc.revenu ? cur : acc,
      { jour: '-', revenu: 0, trajets: 0 }
    );
    return best;
  }

  /** Nombre de jours avec revenus > 0 */
  get activeDaysCount(): number {
    return this.revenuParJour.filter(r => r.revenu > 0).length;
  }

  /** Faire défiler vers la section archive après l'ouverture */
  scrollToArchive() {
    setTimeout(() => {
      const el = document.getElementById('trajet-archive-section');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }

  /** Statuts disponibles pour le filtre */
  readonly trajetStatuts = [
    { key: 'TOUS', label: 'Tous', cls: 'bg-gray-100 text-gray-600' },
    { key: 'ACTIF', label: 'Actif', cls: 'bg-green-100 text-green-700' },
    { key: 'EN_ROUTE', label: 'En cours', cls: 'bg-blue-100 text-blue-700' },
    { key: 'COMPLET', label: 'Complet', cls: 'bg-purple-100 text-purple-700' },
    { key: 'INACTIF', label: 'Inactif', cls: 'bg-orange-100 text-orange-700' },
    { key: 'EFFECTUE', label: 'Effectué', cls: 'bg-gray-200 text-gray-600' },
    { key: 'ANNULE', label: 'Annulé', cls: 'bg-red-100 text-red-700' },
  ];

  // ─── Archive persistée dans localStorage ───────────────────────────────────
  private readonly LS_TRAJET_KEY = 'archive_trajet_ids';
  private readonly LS_RES_KEY = 'archive_res_ids';

  /** IDs des trajets archivés (persistés) */
  archivedTrajetIds: Set<string> = new Set(
    JSON.parse(localStorage.getItem('archive_trajet_ids') || '[]')
  );

  /** IDs des réservations archivées (persistées) */
  archivedResIds: Set<string> = new Set(
    JSON.parse(localStorage.getItem('archive_res_ids') || '[]')
  );

  /** Archiver un trajet et sauvegarder */
  archiverTrajet(id: string) {
    this.archivedTrajetIds.add(id);
    localStorage.setItem(this.LS_TRAJET_KEY, JSON.stringify([...this.archivedTrajetIds]));
  }

  /** Désarchiver un trajet et sauvegarder */
  desarchiverTrajet(id: string) {
    this.archivedTrajetIds.delete(id);
    localStorage.setItem(this.LS_TRAJET_KEY, JSON.stringify([...this.archivedTrajetIds]));
  }

  /** Archiver une réservation et sauvegarder */
  archiverReservation(id: string) {
    this.archivedResIds.add(id);
    localStorage.setItem(this.LS_RES_KEY, JSON.stringify([...this.archivedResIds]));
  }

  /** Désarchiver une réservation et sauvegarder */
  desarchiverReservation(id: string) {
    this.archivedResIds.delete(id);
    localStorage.setItem(this.LS_RES_KEY, JSON.stringify([...this.archivedResIds]));
  }

  /** Trajets filtrés (hors archivés) */
  get filteredBackendTrajets(): any[] {
    const visible = this.backendTrajets.filter(t => !this.archivedTrajetIds.has(t.id));
    if (this.trajetFilter === 'TOUS') return visible;
    return visible.filter(t => String(t.statut || '').toUpperCase() === this.trajetFilter);
  }

  /** Liste des trajets archivés */
  get archivedTrajetsList(): any[] {
    return this.backendTrajets.filter(t => this.archivedTrajetIds.has(t.id));
  }

  /** Compte les trajets par statut (utilisé pour le filtre déroulant) */
  countTrajetsByStatut(statut: string): number {
    if (statut === 'TOUS') return this.backendTrajets.filter(t => !this.archivedTrajetIds.has(t.id)).length;
    return this.backendTrajets.filter(t =>
      !this.archivedTrajetIds.has(t.id) && String(t.statut || '').toUpperCase() === statut
    ).length;
  }

  // Onglet actif dans la section "Mes réservations" (employé)
  activeResTab: 'covoiturage' | 'navette' | 'archive' = 'covoiturage';

  /** Statuts à masquer de la liste active (vont dans l'archive automatiquement) */
private readonly STATUTS_MASQUES = new Set(['INACTIF']);

  /** Covoiturage : actives seulement (hors annulées, inactives, effectuées, archivées) */
  get visibleCovReservations(): ReservationResponse[] {
    return this.mesReservations.filter(r =>
      !this.archivedResIds.has(r.id!) &&
      !this.STATUTS_MASQUES.has(String(r.statut || '').toUpperCase())
    );
  }

  /** Navette : actives seulement (hors annulées, inactives, effectuées, archivées) */
  get visibleNavReservations(): any[] {
    return this.myShuttleReservations.filter(r =>
      !this.archivedResIds.has(r.id) &&
      !this.STATUTS_MASQUES.has(String(r.statut || '').toUpperCase())
    );
  }

  /** Archive : réservations annulées/effectuées + archivées manuellement */
// APRÈS ✅
get archiveReservations(): { type: 'cov' | 'nav'; data: any }[] {
  const covArchive = this.mesReservations
    .filter(r => this.archivedResIds.has(r.id!))
    .map(r => ({ type: 'cov' as const, data: r }));

  const navArchive = this.myShuttleReservations
    .filter(r => this.archivedResIds.has(r.id))
    .map(r => ({ type: 'nav' as const, data: r }));

  return [...covArchive, ...navArchive];
}

  userLevel: string = 'OR';
  totalPointsEco: number = 425;
  totalCo2Economise: number = 0;
  pointsToNextLevel: number = 150;
  nextLevel: string = 'PLATINE';
  progressPercentage: number = 85;

  // Tracking Modal State
  isTrackingModalOpen: boolean = false;
  trackingVehiculeId: string = '';
  isVoitureTracking: boolean = false;
  trackingAdresseDepart: string = '';
  trackingAdresseArrivee: string = '';
  openTracking(vehiculeId: string, isVoiture: boolean = false, adresseDepart: string = '', adresseArrivee: string = '') {
    if (!vehiculeId) {
      this.showToast('❌ Erreur', 'ID de véhicule introuvable.', 'error');
      return;
    }
    this.trackingVehiculeId = vehiculeId;
    this.isVoitureTracking = isVoiture;
    this.trackingAdresseDepart = adresseDepart;
    this.trackingAdresseArrivee = adresseArrivee;
    this.isTrackingModalOpen = true;
  }

  closeTracking() {
    this.isTrackingModalOpen = false;
    this.trackingVehiculeId = '';
  }

  getShuttleAdresse(busId: string, type: 'depart' | 'arrivee'): string {
    const bus = this.shuttles.find(s => s.id === busId);
    return type === 'depart' ? (bus?.adresseDepart || '') : (bus?.adresseArrivee || '');
  }
  annulerEtNotifierPassagers(id?: string): void {
    if (!id) return;

    // Récupérer les réservations pour gérer les remboursements
    this.covoiturageService.getReservationsByTrajet(id).subscribe({
      next: (reservations) => {
        const paidReservations = (reservations || []).filter(r => r.statut === 'CONFIRME');

        this.covoiturageService.annulerTrajetConducteur(id).subscribe({
          next: () => {
            // Initier les remboursements pour les réservations payées
            paidReservations.forEach(res => {
              this.paiementService.refundPayment(res.id).subscribe({
                next: () => console.log(`Remboursement initié pour la réservation ${res.id}`),
                error: (err) => console.error(`Erreur remboursement pour ${res.id}`, err)
              });
            });

            this.loadTrajets();
            this.loadAllTrajets();
              this.loadMesReservations(); // ← AJOUTER ICI

            this.showToast('✅ Trajet annulé', 'Passagers notifiés et remboursés !', 'success');
            this.cdr.detectChanges();
          },
          error: (err) => {
            console.error('Erreur annulation', err);
            this.showToast('❌ Erreur', 'Erreur lors de l\'annulation', 'error');
          }
        });
      },
      error: (err) => {
        console.error('Erreur récupération réservations pour remboursement', err);
        this.showToast('❌ Erreur', 'Erreur lors de la récupération des réservations', 'error');
      }
    });
  }

  // Conduite (Chauffeur) Modal State
  isConduiteModalOpen: boolean = false;
  conduiteVehiculeId: string = '';
  conduiteTrajetId: string = '';

  openConduiteModal(vehiculeId: string, trajetId: string) {
    if (!vehiculeId) return;
    this.conduiteVehiculeId = vehiculeId;
    this.conduiteTrajetId = trajetId || '';
    this.isConduiteModalOpen = true;
  }

  closeConduiteModal() {
    this.isConduiteModalOpen = false;
    this.conduiteVehiculeId = '';
    this.conduiteTrajetId = '';
  }

  // Map États et Statistiques
  departureLocation: string = '';
  destinationLocation: string = '';
  routeDistance: string = '-';
  routeDuration: string = '-';
  routeCo2: string = '-';
  isMapExpanded: boolean = false;

  shuttles: any[] = [];
  isLoadingShuttles = false;
  shuttleError = '';
  shuttleSearchTerm = '';
  shuttleFilterDepart: string = '';
  shuttleFilterArrivee: string = '';
  shuttleFilterHeure: string = '';
  selectedNavetteDays: { [shuttleId: string]: string[] } = {};
  alternatives: any[] = [];
  trajetAnnuleRef: Trajet | null = null;
  remplacerEnCours = false;
  showAlternativesModal: boolean = false;
  showNotificationAnnulation: boolean = false;
  notificationAnnulation: any = null;
  reservationAnnuleeId: string = '';
  trajetAnnuleId: string = '';
  isLoadingAlternatives: boolean = false;
  private notifStompClient!: any;

  get shuttleDeparts(): string[] {
    return [...new Set(this.shuttles.map(s => s.adresseDepart).filter(Boolean))];
  }

  get shuttleArrivees(): string[] {
    return [...new Set(this.shuttles.map(s => s.adresseArrivee).filter(Boolean))];
  }

  // Mode de saisie (Carte / Manuel)
  inputMode: 'map' | 'manual' = 'map';
  manualDeparture: string = '';
  manualAllStartPoints: string = '';
  manualDestination: string = '';

  // Recherche
  searchQuery: string = '';
  searchTime: string = '';
  searchPrice: number | null = null;
  searchSuggestions: any[] = [];

  private searchTimeout: any;

  reclamationSearchQuery: string = '';
  reclamationSearchSuggestions: any[] = [];
  private reclamationSearchTimeout: any;

  pubSearchQuery: string = '';
  pubSearchSuggestions: any[] = [];
  private pubSearchTimeout: any;

  @ViewChild('mapElement') mapDiv!: ElementRef;
  @ViewChild('publishMapElement') publishMapDiv!: ElementRef;
  @ViewChild('reclamationMapElement') reclamationMapDiv!: ElementRef;

  private map: any;
  private publishMap: any;

  private departureMarker: any;
  private destinationMarker: any;
  private pubDepMarker: any;
  private pubDestMarker: any;

  private currentLocationMarker: any;
  private pubCurrentLocationMarker: any;

  private searchMarker: any;
  private polyline: any;
  private routeTooltip: any;

  public isPubMapExpanded: boolean = false;

  // Gestion Backend
  trajetForm: FormGroup;
  vehicules: Vehicule[] = [];
  employeId: string = '';
  backendTrajets: Trajet[] = [];

  // Vehicle Modal State
  showVehicleModal: boolean = false;
  allTrajets: Trajet[] = [];
  lookupTrajets: Trajet[] = []; // Full list for reservation details lookup
  employesMap: Map<string, string> = new Map();
  employesPhoneMap: Map<string, string> = new Map(); // Store employee phones
  expandedItineraries: Set<string> = new Set();

  toggleItinerary(busId: string): void {
    if (this.expandedItineraries.has(busId)) {
      this.expandedItineraries.delete(busId);
    } else {
      this.expandedItineraries.add(busId);
    }
  }
  displayedTrajets: Trajet[] = [];
  mesReservations: ReservationResponse[] = [];
  reservationEnCours: boolean = false;
  reservingTrajetId: string | null = null;
  isVerifyingAddresses: boolean = false;
  expandedResIds: Set<string> = new Set<string>();

  toggleReservationDetails(reservationId: string): void {
    if (this.expandedResIds.has(reservationId)) {
      this.expandedResIds.delete(reservationId);
    } else {
      this.expandedResIds.add(reservationId);
    }
  }


  // Cache employés (already declared above)

  // ----- NOUVELLE PAGE RÉCOMPENSES (REWARDS) -----
  userPointsReward: number = 370;
  userLevelReward: string = 'Or';
  nextLevelReward: string = 'Platine';
  pointsForNextLevelReward: number = 500;

  get rewardProgressPercentage(): number {
    return (this.userPointsReward / this.pointsForNextLevelReward) * 100;
  }

  rewardsGifts = [
    { id: 1, title: 'Café gratuit', description: 'Un café premium au choix', points: 50, icon: '☕', available: true, image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400' },
    { id: 2, title: 'Repas gratuit', description: 'Un repas au restaurant d\'entreprise', points: 150, icon: '🍽️', available: true, image: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400' },
    { id: 3, title: 'Bon 20 DT', description: 'Bon d\'achat valable en magasin', points: 300, icon: '🎁', available: true, image: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=400' },
    { id: 4, title: 'Jour de congé', description: 'Un jour de congé supplémentaire', points: 500, icon: '🌴', available: false, image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400' },
    { id: 5, title: 'Parking 1 mois', description: 'Place de parking réservée pendant 1 mois', points: 800, icon: '🅿️', available: false, image: 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=400' },
    { id: 6, title: 'Bon 50 DT', description: 'Bon d\'achat premium', points: 1000, icon: '🎉', available: false, image: 'https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?w=400' }
  ];

  rewardsHistory = [
    { id: 1, type: 'earn', title: 'Covoiturage Tunis-Ariana', points: 52, date: '24 Mars 2026', icon: '🚗' },
    { id: 2, type: 'redeem', title: 'Repas gratuit', points: -150, date: '20 Mars 2026', status: 'Livré', icon: '🎁', image: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=100' },
    { id: 3, type: 'earn', title: 'Covoiturage La Marsa-Lac', points: 45, date: '18 Mars 2026', icon: '🚗' },
    { id: 4, type: 'redeem', title: 'Bon 20 DT', points: -300, date: '15 Mars 2026', status: 'En attente', icon: '🎁', image: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=100' },
    { id: 5, type: 'earn', title: 'Covoiturage Menzah-Centre', points: 38, date: '12 Mars 2026', icon: '🚗' }
  ];

  // Réclamation Form
  reclamationBusId: string | null = null;
  reclamationStop: string = '';
  reclamationNeighborhood: string = '';
  reclamationSuccess: boolean = false;
  reclamationError: string = '';

  // Leaflet Map for Reclamation
  private reclamationMap: any;
  private reclamationMarker: any;
  public selectedLat: number | null = null;
  public selectedLng: number | null = null;

  constructor(
    private renderer: Renderer2,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private appRef: ApplicationRef,
    private fb: FormBuilder,
    private covoiturageService: CovoiturageService,
    private userService: UserService,
    private emailService: EmailService,
    private route: ActivatedRoute,
    private router: Router,
    private paiementService: PaiementService,
    private reclamationService: ReclamationService,
    private _walkingService: WalkingService
  ) {
    this.trajetForm = this.fb.group({
      vehiculeId: ['', Validators.required],
      categorie: ['COVOITURAGE', Validators.required],
      adresseDepart: ['', Validators.required],
      adresseArrivee: ['', Validators.required],
      heureDepart: ['', Validators.required],
      placesDisponibles: ['', Validators.required],
      prix: [0, [Validators.required, Validators.min(0)]],
    });
  }

  ngOnInit() {
    const localUserStr = localStorage.getItem('currentUser');
    if (localUserStr) {
      try {
        const localUser = JSON.parse(localUserStr);
        this.employeId = localUser.id;
        this.ecouterNotifications();

        this.loadEmployees();
        this.loadVehicules();
        this.loadTrajets();
        this.loadAllTrajets();
        this.loadMesReservations();
        this.loadTotalPoints();
        this.loadShuttles();
        this.loadMyShuttleReservations();

        // Vérification périodique des paiements expirés
        setInterval(() => this.checkPaiementsExpire(), 60000);

        this.route.queryParams.subscribe(params => {
          const tid = params['annulationTrajetId'];
          if (tid) {
            this.trajetAnnuleId = tid;
            this.reservationAnnuleeId = params['reservationId'] || '';
            this.notificationAnnulation = {
              titre: 'Trajet annulé',
              message: 'Votre conducteur a annulé le trajet. Consultez les alternatives disponibles.',
              trajetAnnuleId: tid
            };
            this.showNotificationAnnulation = true;
          }
          if (params['paymentSuccess']) {
            this.showToast('✅ Paiement réussi !', 'Votre réservation a été confirmée avec succès.');
          }
          if (params['paymentError']) {
            this.showToast('❌ Erreur de paiement', 'Une erreur est survenue lors de la confirmation du paiement.');
          }
        });
      } catch (e) {
        console.error("Erreur parsing currentUser", e);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  // NOTIFICATIONS WEBSOCKET
  // ─────────────────────────────────────────────────────────────

  ecouterNotifications() {
    const wsUrl = getWsTrackingSockJsUrlFromEnv();
    const token = localStorage.getItem('accessToken');
    const sockJsUrl = token
      ? `${wsUrl}?access_token=${encodeURIComponent(token)}`
      : wsUrl;

    this.notifStompClient = new Client({
      webSocketFactory: () => new SockJS(sockJsUrl) as any,
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      reconnectDelay: 4000,
      onConnect: () => {
        this.notifStompClient.subscribe(
          `/topic/notifications/${this.employeId}`,
          (message: any) => {
            const notif = JSON.parse(message.body);
            const rawType = notif?.type;
            const notifType = String(
              typeof rawType === 'string' ? rawType : (rawType as any)?.name || rawType || ''
            ).toUpperCase();

            if (notifType === 'ALTERNATIVES_DISPONIBLES' || notifType === 'ANNULATION_TRAJET') {
              this.notificationAnnulation = {
                ...notif,
                titre: notif?.titre || 'Trajet annulé',
                message: notif?.message || notif?.contenu || 'Le conducteur a annulé son trajet.',
                trajetAnnuleId: notif?.trajetAnnuleId || notif?.trajetId || ''
              };
              this.showNotificationAnnulation = true;
              this.trajetAnnuleId = this.notificationAnnulation.trajetAnnuleId;
              this.reservationAnnuleeId = notif?.reservationId || this.getReservationIdByTrajetId(this.trajetAnnuleId);
              // APRÈS
              if (this.trajetAnnuleId) {
                // Rien — le banner s'affiche, l'utilisateur clique quand il veut
              }
              this.loadMesReservations();
              this.cdr.detectChanges();
            } else if (notifType === 'CONFIRMATION_ALTERNATIVE') {
              this.loadMesReservations();
              this.cdr.detectChanges();
            } else if (notifType === 'BUS_ACTIVE') {
              this.showToast('✅ Bus activé !', notif.message || 'Votre réservation est maintenant confirmée');
              this.loadMyShuttleReservations();
              this.loadShuttles();
              this.cdr.detectChanges();
            }
          }
        );
      }
    });
    this.notifStompClient.activate();
  }

  // ─────────────────────────────────────────────────────────────
  // ALTERNATIVES
  // ─────────────────────────────────────────────────────────────

  loadingStep: string = '';

  chercherAlternatives(trajetId: string) {
    this.isLoadingAlternatives = true;
    this.showAlternativesModal = true;
    this.loadingStep = 'covoiturage';
    this.alternatives = [];
    this.trajetAnnuleRef = null;
    this.cdr.detectChanges();

    setTimeout(() => {
      this.covoiturageService.getTrajetById(trajetId).subscribe({
        next: (trajet) => {
          this.trajetAnnuleRef = trajet;
          this.chargerAlternativesApresRef(trajetId);
        },
        error: () => {
          this.trajetAnnuleRef = this.getTrajetInfo(trajetId) || null;
          this.chargerAlternativesApresRef(trajetId);
        }
      });
    }, 400);
  }

  private chargerAlternativesApresRef(trajetId: string): void {
    const ref = this.trajetAnnuleRef;
    const driverId = ref?.employeId;

    forkJoin({
      apiAlts: this.covoiturageService.getAlternatives(trajetId, this.employeId).pipe(
        catchError(() => of([] as any[]))
      ),
      driverTrajets: driverId
        ? this.covoiturageService.getTrajetsByEmployeId(driverId).pipe(
          catchError(() => of([] as Trajet[]))
        )
        : of([] as Trajet[])
    }).subscribe({
      next: ({ apiAlts, driverTrajets }) => {
        const merged = this.fusionnerAlternativesEtTrajetsConducteur(
          apiAlts || [],
          driverTrajets || [],
          trajetId,
          ref
        );
        const list = this.filtrerAlternativesConformesUniquement(merged, ref);

        if (list.length === 0) {
          this.alternatives = [];
          this.showAlternativesModal = false;
          this.showNotificationAnnulation = false;
          this.isLoadingAlternatives = false;
          this.cdr.detectChanges();
          return;
        }

        const covoiturages = list.filter(a => a.type === 'COVOITURAGE');
        const busOnly = list.filter(a => a.type !== 'COVOITURAGE');
        const hasCovoit = covoiturages.length > 0;

        if (!hasCovoit && busOnly.length > 0) {
          this.loadingStep = 'bus';
          setTimeout(() => {
            this.alternatives = this.trierAlternativesAuto(list);
            this.isLoadingAlternatives = false;
            this.cdr.detectChanges();
          }, 600);
        } else {
          this.alternatives = this.trierAlternativesAuto(list);
          this.isLoadingAlternatives = false;
          this.cdr.detectChanges();
        }
      },
      error: () => {
        this.isLoadingAlternatives = false;
        this.showAlternativesModal = false;
        this.cdr.detectChanges();
      }
    });
  }

  private fusionnerAlternativesEtTrajetsConducteur(
    apiAlts: any[],
    driverTrajets: Trajet[],
    trajetAnnuleId: string,
    ref: Trajet | null
  ): any[] {
    const STATUTS_EXCLUS = new Set(['ANNULE', 'INACTIF', 'EFFECTUE']);
    const out = [...(apiAlts || [])].filter(a => {
      // Priorité : vérifier le statut réel depuis allTrajets/lookupTrajets (source de vérité)
      const localTrajet = this.allTrajets.find(t => t.id === a.id)
                       || this.lookupTrajets.find(t => t.id === a.id);
      const st = String(
        localTrajet?.statut || a.statut || a.statut_trajet || ''
      ).toUpperCase();
      const places = (a.placesRestantes ?? a.places_restantes ?? localTrajet?.placesRestantes ?? 0);
      // Exclure les trajets annulés/inactifs/effectués et sans places
      if (STATUTS_EXCLUS.has(st)) return false;
      return places > 0;
    });
    const ids = new Set(out.map(a => a.id));

    if (!ref?.employeId) return out;

    for (const t of driverTrajets) {
      if (!t.id || t.id === trajetAnnuleId) continue;
      const st = String(t.statut || '').toUpperCase();
      if (st !== 'ACTIF') continue;
      if ((t.placesRestantes ?? 0) <= 0) continue;
      if (ids.has(t.id)) continue;

      const dto = this.trajetVersAlternativeDto(t);
      out.push(dto);
      ids.add(t.id);
    }
    return out;
  }

  private trajetVersAlternativeDto(t: Trajet): any {
    const hd =
      typeof t.heureDepart === 'string'
        ? t.heureDepart
        : (t as any).heureDepart != null
          ? String((t as any).heureDepart)
          : '';
    return {
      id: t.id,
      type: 'COVOITURAGE',
      adresseDepart: t.adresseDepart,
      adresseArrivee: t.adresseArrivee,
      heureDepart: hd,
      placesRestantes: t.placesRestantes,
      priorite: 0,
      conducteurNom: t.employeId ? this.getEmployeeName(t.employeId) : undefined,
      _memeConducteur: true
    };
  }

  private filtrerAlternativesConformesUniquement(alts: any[], ref: Trajet | null): any[] {
    if (!ref) {
      return [];
    }
    return alts.filter(a => this.alternativeStrictementConforme(a, ref));
  }

  private alternativeStrictementConforme(alt: any, ref: Trajet): boolean {
    if ((alt.placesRestantes ?? 0) <= 0) return false;

    const refDep = this.normaliserTexte(ref.adresseDepart);
    const refArr = this.normaliserTexte(ref.adresseArrivee);
    const refMin = this.heureDepartEnMinutes(ref.heureDepart);

    if (!refDep || !refArr) return false;

    // ── Vérification du jour de la semaine ──────────────────────────
    // Le trajet annulé avait des jours disponibles ; l'alternative doit
    // couvrir au moins l'un des jours du trajet référence.
    const joursRef   = this.normaliserJours(ref.joursDisponibles);
    const joursAlt   = this.normaliserJours(alt.joursDisponibles || alt.jours_disponibles || '');
    // Si les deux ont des jours renseignés → vérifier l'intersection
    if (joursRef.length > 0 && joursAlt.length > 0) {
      const intersection = joursRef.filter(j => joursAlt.includes(j));
      if (intersection.length === 0) return false;
    }
    // Si l'un des deux n'a pas de jours renseignés → on ne filtre pas

    if (alt.type === 'COVOITURAGE') {
      const depOk = this.lieuCommeReference(String(alt.adresseDepart || ''), refDep);
      const arrOk = this.lieuCommeReference(String(alt.adresseArrivee || ''), refArr);
      const hOk = this.heureNeDepassePasSouhaitee(alt.heureDepart, refMin);
      return depOk && arrOk && hOk;
    }

    const ligne = this.normaliserTexte(String(alt.adresseDepart || ''));
    const busRouteOk = this.ligneBusCouvreTrajet(ligne, refDep, refArr);
    const hOk = this.heureNeDepassePasSouhaitee(alt.heureDepart, refMin);
    return busRouteOk && hOk;
  }

  /** Normalise les jours disponibles en tableau de clés courtes minuscules (ex: ['lun','mer','ven']) */
  private normaliserJours(jours: string): string[] {
    if (!jours) return [];
    const MAP: Record<string, string> = {
      'lundi': 'lun', 'monday': 'lun', 'mon': 'lun', 'lun': 'lun',
      'mardi': 'mar', 'tuesday': 'mar', 'tue': 'mar', 'mar': 'mar',
      'mercredi': 'mer', 'wednesday': 'mer', 'wed': 'mer', 'mer': 'mer',
      'jeudi': 'jeu', 'thursday': 'jeu', 'thu': 'jeu', 'jeu': 'jeu',
      'vendredi': 'ven', 'friday': 'ven', 'fri': 'ven', 'ven': 'ven',
      'samedi': 'sam', 'saturday': 'sam', 'sat': 'sam', 'sam': 'sam',
      'dimanche': 'dim', 'sunday': 'dim', 'sun': 'dim', 'dim': 'dim'
    };
    return jours
      .split(/[,;\/\s]+/)
      .map(j => j.trim().toLowerCase())
      .map(j => MAP[j] || j)
      .filter(Boolean);
  }

  private lieuCommeReference(altTexte: string, refNormalise: string): boolean {
    return this.texteProcheStrict(altTexte, refNormalise);
  }

  private ligneBusCouvreTrajet(ligneNormalisee: string, refDep: string, refArr: string): boolean {
    if (!ligneNormalisee) return false;
    const depDansLigne = this.texteProcheStrict(ligneNormalisee, refDep);
    const arrDansLigne = this.texteProcheStrict(ligneNormalisee, refArr);
    return depDansLigne && arrDansLigne;
  }

  private normaliserTexte(s: string): string {
    return (s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /** Mots administratifs/génériques à ignorer dans la comparaison des adresses */
  private readonly STOPWORDS_ADRESSE = new Set([
    // Termes administratifs tunisiens
    'gouvernorat', 'delegation', 'municipalite', 'commune', 'cite', 'quartier',
    'immeuble', 'residence', 'lotissement', 'zone', 'nouvelle', 'nouveau',
    // Articles et prépositions françaises
    'du', 'de', 'des', 'la', 'le', 'les', 'un', 'une', 'au', 'aux',
    'et', 'en', 'sur', 'sous', 'par', 'pour', 'avec', 'dans', 'chez',
    // Termes géographiques génériques
    'ville', 'nord', 'sud', 'est', 'ouest', 'vieux', 'vieille',
    'rue', 'avenue', 'boulevard', 'route', 'chemin', 'impasse'
  ]);

  /** Extrait les tokens significatifs d'une adresse (sans stopwords, min 3 chars) */
  private extraireTokensAdresse(texte: string): string[] {
    return this.normaliserTexte(texte)
      .split(/[\s,.\-\/()]+/)
      .map(t => t.trim())
      .filter(t => t.length >= 3 && !this.STOPWORDS_ADRESSE.has(t));
  }

  private texteProcheStrict(a: string, ref: string): boolean {
    if (!ref) return true;
    const na = this.normaliserTexte(a);
    const nr = this.normaliserTexte(ref);
    if (!na || !nr) return true;

    // Test 1 : l'un contient l'autre entièrement (match parfait)
    if (na.includes(nr) || nr.includes(na)) return true;

    // Test 2 : intersection sur tokens significatifs (sans stopwords)
    const tokA   = this.extraireTokensAdresse(a);
    const tokRef = this.extraireTokensAdresse(ref);

    // Si l'une des adresses n'a pas de token significatif → données insuffisantes
    if (tokA.length === 0 || tokRef.length === 0) return false;

    const setRef  = new Set(tokRef);
    const communs = tokA.filter(t => setRef.has(t));

    // Exige au moins 2 tokens communs si les deux adresses sont "riches"
    // Sinon (address courte ≤ 2 tokens) → 1 token commun suffit
    const minCommuns = (tokA.length >= 3 && tokRef.length >= 3) ? 2 : 1;
    return communs.length >= minCommuns;
  }

  private heureDepartEnMinutes(h: string | undefined): number | null {
    if (!h) return null;
    const m = String(h).match(/(\d{1,2}):(\d{2})/);
    if (!m) return null;
    return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  }

  private heureNeDepassePasSouhaitee(altHeure: string | undefined, refMin: number | null): boolean {
    if (refMin === null) return false;
    const a = this.heureDepartEnMinutes(altHeure);
    if (a === null) return false;
    if (a > refMin) return false;
    const maxEarlyMin = 150;
    if (a < refMin - maxEarlyMin) return false;
    return true;
  }

  private trierAlternativesAuto(items: any[]): any[] {
    const ref = this.trajetAnnuleRef;
    const refMin = ref ? this.heureDepartEnMinutes(ref.heureDepart) : null;
    const copy = [...items];
    copy.sort((x, y) => {
      const mx = x._memeConducteur ? 0 : 1;
      const my = y._memeConducteur ? 0 : 1;
      if (mx !== my) return mx - my;

      const p = (x.priorite ?? 99) - (y.priorite ?? 99);
      if (p !== 0) return p;
      if (refMin !== null) {
        const dx = this.heureDepartEnMinutes(x.heureDepart);
        const dy = this.heureDepartEnMinutes(y.heureDepart);
        if (dx !== null && dy !== null) {
          const d = Math.abs(dx - refMin) - Math.abs(dy - refMin);
          if (d !== 0) return d;
        }
      }
      return (y.placesRestantes || 0) - (x.placesRestantes || 0);
    });
    return copy;
  }

  get alternativesCovoit(): any[] {
    return this.alternatives.filter(a => a.type === 'COVOITURAGE');
  }

  get alternativesBus(): any[] {
    return this.alternatives.filter(a => a.type !== 'COVOITURAGE');
  }

  choisirAlternative(alternative: any, event?: Event) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    if (this.remplacerEnCours) return;

    if (!this.reservationAnnuleeId && this.trajetAnnuleId) {
      this.reservationAnnuleeId = this.getReservationIdByTrajetId(this.trajetAnnuleId);
    }

    if (!this.reservationAnnuleeId || !alternative?.id) {
      this.showToast('❌ Erreur', 'Impossible de remplacer la réservation : données manquantes.', 'error');
      return;
    }

    const typeAlt = alternative.type === 'COVOITURAGE' ? 'COVOITURAGE' : 'BUS';
    this.remplacerEnCours = true;

    if (typeAlt === 'COVOITURAGE') {
      void this.executerChoixCovoiturageAvecDemandeConducteur(alternative);
      return;
    }

    this.covoiturageService.remplacerReservation({
      ancienneReservationId: this.reservationAnnuleeId,
      nouvelleAlternativeId: alternative.id,
      typeAlternative: 'BUS',
      employeId: this.employeId
    }).subscribe({
      next: () => {
        this.remplacerEnCours = false;
        this.showAlternativesModal = false;
        this.showNotificationAnnulation = false;
        this.showToast('✅ Confirmée', 'Votre ancienne réservation a été remplacée.', 'success');
        this.loadMesReservations();
        this.loadTotalPoints();
        this.loadAllTrajets();
        this.loadMyShuttleReservations();
        this.alternatives = [];
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.remplacerEnCours = false;
        this.showToast('❌ Erreur', err.error?.message || err.message || 'Erreur réservation', 'error');
        this.cdr.detectChanges();
      }
    });
  }

  private async executerChoixCovoiturageAvecDemandeConducteur(alternative: any): Promise<void> {
    const distanceKm = await this.calculerDistanceKmPourTrajetId(String(alternative.id));
    this.covoiturageService
      .demanderRemplacementCovoiturage({
        ancienneReservationId: this.reservationAnnuleeId,
        nouveauTrajetId: String(alternative.id),
        employeId: this.employeId,
        distanceKm
      })
      .subscribe({
        next: () => {
          this.remplacerEnCours = false;
          this.showAlternativesModal = false;
          this.showNotificationAnnulation = false;
          this.showToast('📨 Demande envoyée', 'Votre réservation sera remplacée dès acceptation du conducteur.', 'success');
          this.loadMesReservations();
          this.loadTotalPoints();
          this.loadAllTrajets();
          this.alternatives = [];
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.remplacerEnCours = false;
          this.showToast('❌ Erreur', err.error?.message || err.message || 'Erreur demande', 'error');
          this.cdr.detectChanges();
        }
      });
  }

  private async calculerDistanceKmPourTrajetId(trajetId: string): Promise<number> {
    let trajet = this.allTrajets.find(t => t.id === trajetId);
    if (!trajet) {
      try {
        trajet = await firstValueFrom(this.covoiturageService.getTrajetById(trajetId));
      } catch {
        // ignore
      }
    }
    let distanceKm = 25.0;
    if (trajet) {
      try {
        const depRes = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(trajet.adresseDepart)}&limit=1&countrycodes=tn`
        );
        const depData = await depRes.json();
        const arrRes = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(trajet.adresseArrivee)}&limit=1&countrycodes=tn`
        );
        const arrData = await arrRes.json();
        if (depData[0] && arrData[0]) {
          const osrmRes = await fetch(
            `https://router.project-osrm.org/route/v1/driving/${depData[0].lon},${depData[0].lat};${arrData[0].lon},${arrData[0].lat}?overview=false`
          );
          const osrmData = await osrmRes.json();
          if (osrmData.routes && osrmData.routes[0]) {
            distanceKm = osrmData.routes[0].distance / 1000;
          }
        }
      } catch (e) {
        console.warn('Erreur calcul distance', e);
      }
    }
    return Math.round(distanceKm * 10) / 10;
  }

  // ─────────────────────────────────────────────────────────────
  // TRAJETS CONDUCTEUR
  // ─────────────────────────────────────────────────────────────

  deleteTrajet(id?: string): void {
    if (!id) return;

    this.covoiturageService.annulerTrajetConducteur(id).subscribe({
      next: () => {
        this.loadTrajets();
        this.showToast('✅ Trajet annulé', 'Passagers notifiés !', 'success');
      },
      error: (err) => {
        console.error('Erreur annulation', err);
        this.showToast('❌ Erreur', 'Erreur lors de l\'annulation du trajet', 'error');
      }
    });
  }
  loadEmployees(): void {
    this.userService.getAllEmployees().subscribe({
      next: (users) => {
        users.forEach((user: any) => {
          this.employesMap.set(
            String(user.id),
            `${user.prenom || user.firstName || ''} ${user.nom || user.lastName || ''}`.trim()
          );
          // Stocker aussi le téléphone si disponible
          const phone = user.phone || user.telephone || user.tel || '';
          if (phone) {
            this.employesPhoneMap.set(String(user.id), phone);
          }
        });
        this.cdr.detectChanges();
      },
      error: (err) => console.error("Erreur", err)
    });
  }

  getEmployeeName(id: string): string {
    return this.employesMap.get(String(id)) || `Employé Inconnu`;
  }

  /** Déduplique les réservations par employeId.
   *  Si un employé a plusieurs entrées (ex: ANNULE + CONFIRME),
   *  on garde uniquement la plus "active" (CONFIRME > EN_ATTENTE > EN_ATTENTE_PAIEMENT > ANNULE).
   */
  getUniqueReservations(reservations: any[]): any[] {
    if (!reservations?.length) return [];
    const priority: Record<string, number> = {
      'CONFIRME': 5, 'EN_ROUTE': 4, 'EN_ATTENTE_PAIEMENT': 3,
      'EN_ATTENTE': 2, 'EFFECTUE': 1, 'ANNULE': 0
    };
    const map = new Map<string, any>();
    for (const res of reservations) {
      const key = String(res.employeId);
      const existing = map.get(key);
      if (!existing) {
        map.set(key, res);
      } else {
        const pNew = priority[res.statut] ?? 0;
        const pOld = priority[existing.statut] ?? 0;
        if (pNew > pOld) map.set(key, res);
      }
    }
    return Array.from(map.values());
  }


  getEmployeePhone(id: string): string {
    return this.employesPhoneMap.get(String(id)) || 'N/A';
  }

  getTrajetInfo(trajetId: string | undefined): Trajet | undefined {
    if (!trajetId) return undefined;
    return this.lookupTrajets.find(t => t.id === trajetId);
  }

  loadVehicules() {
    if (!this.employeId) return;
    this.covoiturageService.getVehiculesByEmployeId(this.employeId).subscribe({
      next: (res) => this.vehicules = res,
      error: (err) => console.error("Erreur chargement véhicules", err)
    });
  }

  loadTrajets() {
    if (!this.employeId) return;
    this.covoiturageService.getTrajetsByEmployeId(this.employeId).subscribe({
      next: (res) => {
        // Filtrer les trajets INACTIFS mais UNIQUEMENT s'ils sont complets (véhicule et adresses renseignés)
        this.backendTrajets = (res || []).filter(t =>
          (t.statut === 'ACTIF' || t.statut === 'EN_ROUTE' || t.statut === 'COMPLET' || t.statut === 'INACTIF' || t.statut === 'EFFECTUE') &&
          t.vehiculeId && t.adresseDepart && t.adresseArrivee
        );

        this.backendTrajets.forEach(trajet => {
          if (trajet.id) {
            this.covoiturageService.getReservationsByTrajet(trajet.id).subscribe({
              next: (reserves) => {
                trajet.reservations = reserves; // Garder TOUTES les réservations, y compris annulées
                this.cdr.detectChanges();
              }
            });
          }
        });
        this.cdr.detectChanges();
      },
      error: (err) => console.error("Erreur chargement trajets", err)
    });
  }

  getVehicleName(vehiculeId?: string): string {
    if (!vehiculeId) return 'Véhicule inconnu';
    const v = this.vehicules.find(veh => veh.id === vehiculeId);
    return v ? `${v.marque} ${v.modele}` : 'Véhicule inconnu';
  }

  editTrajet(trajet: any) {
    this.isEditingTrajet = true;
    this.editingTrajetId = trajet.id;

    // Patch form values
    this.trajetForm.patchValue({
      categorie: trajet.categorie,
      vehiculeId: trajet.vehiculeId,
      adresseDepart: trajet.adresseDepart,
      adresseArrivee: trajet.adresseArrivee,
      heureDepart: trajet.heureDepart ? trajet.heureDepart.substring(0, 5) : '',
      placesDisponibles: trajet.placesDisponibles,
      prix: trajet.prix
    });

    // Patch selected days
    if (trajet.joursDisponibles) {
      this.selectedDays = trajet.joursDisponibles.split(',').map((d: string) => d.trim());
    }

    // Scroll to form
    const formElement = document.querySelector('form');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
    }
  }

  annulerModification() {
    this.isEditingTrajet = false;
    this.editingTrajetId = null;
    this.trajetForm.reset({ categorie: 'COVOITURAGE', vehiculeId: '' });
    this.selectedDays = ["Lun", "Mar", "Mer", "Jeu", "Ven"];
  }

  publierTrajet() {
    if (this.trajetForm.invalid || !this.employeId || this.selectedDays.length === 0) {
      this.trajetForm.markAllAsTouched();
      let errorMsg = "Veuillez corriger le formulaire : ";
      if (!this.trajetForm.get('vehiculeId')?.value) errorMsg += "\n- Véhicule manquant";
      if (this.selectedDays.length === 0) errorMsg += "\n- Jours manquants";
      if (this.trajetForm.get('adresseDepart')?.invalid) errorMsg += "\n- Adresse de départ manquante";
      if (this.trajetForm.get('adresseArrivee')?.invalid) errorMsg += "\n- Adresse d'arrivée manquante";
      if (this.trajetForm.get('heureDepart')?.invalid) errorMsg += "\n- Heure de départ manquante";
      if (this.trajetForm.get('placesDisponibles')?.invalid) errorMsg += "\n- Places manquantes";
      this.showToast('⚠️ Formulaire incomplet', errorMsg, 'error');
      return;
    }

    const formValues = this.trajetForm.value;
    const jours = this.selectedDays.join(', ');

    const trajetData: any = {
      employeId: this.employeId,
      vehiculeId: formValues.vehiculeId,
      categorie: formValues.categorie,
      adresseDepart: formValues.adresseDepart,
      adresseArrivee: formValues.adresseArrivee,
      heureDepart: formValues.heureDepart + (formValues.heureDepart.length === 5 ? ':00' : ''),
      joursDisponibles: jours,
      placesDisponibles: formValues.placesDisponibles,
      placesRestantes: this.isEditingTrajet ? undefined : formValues.placesDisponibles,
      prix: formValues.prix,
      statut: 'ACTIF'
    };

    const obs = this.isEditingTrajet && this.editingTrajetId
      ? this.covoiturageService.updateTrajet(this.editingTrajetId, trajetData)
      : this.covoiturageService.creerTrajet(trajetData);

    obs.subscribe({
      next: () => {
        this.loadTrajets();
        this.annulerModification();
        if (this.publishMap) {
          if (this.pubDepMarker) this.publishMap.removeLayer(this.pubDepMarker);
          if (this.pubDestMarker) this.publishMap.removeLayer(this.pubDestMarker);
          this.pubDepMarker = null;
          this.pubDestMarker = null;
        }
        this.showToast('✅ Succès', this.isEditingTrajet ? 'Trajet modifié avec succès !' : 'Trajet publié avec succès !', 'success');
        this.cdr.detectChanges();
      },
      error: (err) => console.error("Erreur action trajet", err)
    });
  }

  openVehicleModal() {
    this.showVehicleModal = true;
  }

  closeVehicleModal() {
    this.showVehicleModal = false;
  }

  loadAllTrajets(): void {
    this.covoiturageService.getAllTrajets().subscribe({
      next: (res) => {
        // Sauvegarde de la liste complète pour la recherche de détails (getTrajetInfo)
        this.lookupTrajets = res || [];

        // IDs pour exclusion (normalisés en string)
        const myId = String(this.employeId || '').trim().toLowerCase();

        // On récupère les trajets actifs en excluant ceux de l'utilisateur actuel et ceux qui sont complets
        this.allTrajets = this.lookupTrajets.filter(t => {
          const tEmpId = String(t.employeId || '').trim().toLowerCase();
          const isMe = tEmpId === myId;
          // Un trajet ne s'affiche que s'il est ACTIF, a des places disponibles et n'appartient pas à l'utilisateur actuel
          const isAvailable = t.statut === 'ACTIF' && (t.placesRestantes || 0) > 0;
          return isAvailable && !isMe;
        });

        this.displayedTrajets = [...this.allTrajets];
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Erreur chargement tous les trajets', err)
    });
  }

  loadMesReservations(): void {
    if (!this.employeId) return;
    this.covoiturageService.getReservationsByEmploye(this.employeId).subscribe({
      next: (res) => {
        this.mesReservations = res;

        // Calcul du CO2 total économisé
        this.totalCo2Economise = this.mesReservations
          .filter(r => r.statut === 'EFFECTUE')
          .reduce((acc, r) => acc + (r.co2EconomiseKg || 0), 0);
        this.totalCo2Economise = Math.round(this.totalCo2Economise * 10) / 10;

        if (!this.reservationAnnuleeId && this.trajetAnnuleId) {
          this.reservationAnnuleeId = this.getReservationIdByTrajetId(this.trajetAnnuleId);
        }
        this.loadTotalPoints();
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Erreur chargement réservations', err)
    });
  }

 
// APRÈS ✅
private getReservationIdByTrajetId(trajetId: string): string {
  if (!trajetId) return '';
  // Cherche d'abord une réservation non annulée
  const active = this.mesReservations.find(
    r => r.trajetId === trajetId && r.statut !== 'ANNULE'
  );
  if (active) return active.id;
  // Sinon accepte aussi l'annulée (cas annulation conducteur)
  const annulee = this.mesReservations.find(
    r => r.trajetId === trajetId
  );
  return annulee?.id || '';
}

  loadTotalPoints(): void {
    if (!this.employeId) return;
    this.covoiturageService.getTotalPointsEco(this.employeId).subscribe({
      next: (points) => { this.totalPointsEco = points; this.cdr.detectChanges(); },
      error: (err) => console.error('Erreur points', err)
    });
  }

  async reserverTrajet(trajetId: string): Promise<void> {
    if (!this.employeId || this.reservationEnCours) return;

    // Safety check: Don't allow reserving own trip
    const trajet = this.allTrajets.find(t => t.id === trajetId);
    if (trajet && String(trajet.employeId).trim().toLowerCase() === String(this.employeId).trim().toLowerCase()) {
      this.showToast('⛔ Interdit', 'Vous ne pouvez pas réserver votre propre trajet.', 'error');
      return;
    }

    if (this.estDejaReserve(trajetId)) return;
    this.reservationEnCours = true;
    this.reservingTrajetId = trajetId;
    this.isVerifyingAddresses = true;

    let distanceKm = 25.0;

    if (trajet) {
      try {
        const depRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(trajet.adresseDepart)}&limit=1&countrycodes=tn`);
        const depData = await depRes.json();
        const arrRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(trajet.adresseArrivee)}&limit=1&countrycodes=tn`);
        const arrData = await arrRes.json();

        if (depData[0] && arrData[0]) {
          const osrmRes = await fetch(`https://router.project-osrm.org/route/v1/driving/${depData[0].lon},${depData[0].lat};${arrData[0].lon},${arrData[0].lat}?overview=false`);
          const osrmData = await osrmRes.json();
          if (osrmData.routes && osrmData.routes[0]) {
            distanceKm = osrmData.routes[0].distance / 1000;
          }
        }
      } catch (e) {
        console.warn('Erreur calcul distance', e);
      }
    }

    const request: ReservationRequest = {
      trajetId,
      employeId: this.employeId,
      statut: 'EN_ATTENTE',
      distanceKm: Math.round(distanceKm * 10) / 10
    };

    this.covoiturageService.creerReservation(request).subscribe({
      next: () => {
        this.reservationEnCours = false;
        this.reservingTrajetId = null;
        this.isVerifyingAddresses = false;
        this.loadMesReservations();
        this.loadTotalPoints();
        this.loadAllTrajets();
      },
      error: (err) => {
        this.reservationEnCours = false;
        this.reservingTrajetId = null;
        this.isVerifyingAddresses = false;
        console.error('Erreur réservation', err);
      }
    });
  }

  annulerReservation(reservationId: string): void {
    const res = this.mesReservations.find(r => r.id === reservationId);
    if (!res) return;

    const isPaid = res.statut === 'CONFIRME';
    const message = isPaid
      ? 'Annuler cette réservation ? Un remboursement sera effectué car vous avez déjà payé.'
      : 'Annuler cette réservation ?';

this.showToast('ℹ️ Info', message, 'info');
    const update: Partial<ReservationRequest> = { statut: 'ANNULE' };
    this.covoiturageService.updateReservationStatus(reservationId, update).subscribe({
      next: () => {
        if (isPaid) {
          this.paiementService.refundPayment(reservationId).subscribe({
            next: () => console.log('Remboursement initié'),
            error: (err) => console.error('Erreur remboursement', err)
          });
        }
        this.loadMesReservations();
        this.loadTotalPoints();
        this.loadAllTrajets();
      },
      error: (err) => console.error('Erreur annulation', err)
    });
  }

  accepterReservation(reservationId: string): void {
    const update: Partial<ReservationRequest> = {
      statut: 'EN_ATTENTE_PAIEMENT',
      dateAcceptation: new Date().toISOString()
    };
    this.covoiturageService.updateReservationStatus(reservationId, update).subscribe({
      next: () => {
        this.loadTrajets();
        this.showToast('✅ Acceptée', 'Le passager a 15 minutes pour payer.', 'success');
      },
      error: (err) => console.error('Erreur acceptation', err)
    });
  }

  refuserReservation(reservationId: string): void {
    const update = { statut: 'ANNULE' };
    this.covoiturageService.updateReservationStatus(reservationId, update as any).subscribe({
      next: () => {
        this.loadTrajets();
        this.showToast('ℹ️ Refusée', 'Réservation refusée.', 'info');
      },
      error: (err) => {
        console.error('Erreur refus', err);
        this.showToast('❌ Erreur', 'Erreur lors du refus de la réservation', 'error');
      }
    });
  }

  getTempsRestantPaiement(dateAcceptation?: string, dateReservation?: string): string {
    const referenceTime = dateAcceptation || dateReservation;
    if (!referenceTime) return '15:00';
    const acceptTime = new Date(referenceTime).getTime();
    const now = new Date().getTime();
    const diff = 15 * 60 * 1000 - (now - acceptTime);

    if (diff <= 0) return 'Expiré';

    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }

  isPaiementExpire(res: any): boolean {
    const referenceTime = res.dateAcceptation || res.dateReservation;
    if (!referenceTime) return false;
    const startTime = new Date(referenceTime).getTime();
    const now = new Date().getTime();
    return (now - startTime) > (15 * 60 * 1000);
  }

  // Vérification périodique des expirations
  checkPaiementsExpire() {
    this.mesReservations.forEach(res => {
      if (res.statut === 'EN_ATTENTE_PAIEMENT') {
        const referenceTime = res.dateAcceptation || res.dateReservation;
        if (referenceTime) {
          const startTime = new Date(referenceTime).getTime();
          const now = new Date().getTime();
          const diff = 15 * 60 * 1000 - (now - startTime);
          if (diff <= 0) {
            this.annulerReservationAutomatique(res);
          }
        }
      }
    });
  }

  annulerReservationAutomatique(res: any) {
    this.covoiturageService.updateReservationStatus(res.id, { statut: 'ANNULE' } as any).subscribe({
      next: () => {
        this.loadMesReservations();
        this.loadTrajets();

        // Notification pour le passager
        this.covoiturageService.sendNotification({
          destinataireId: res.employeId,
          type: 'RESERVATION_EXPIREE',
          contenu: 'Délai dépassé : Votre réservation a été annulée car le paiement n\'a pas été effectué dans les 15 minutes.'
        }).subscribe();

        // Notification pour le chauffeur (propriétaire du trajet)
        const trajet = this.getTrajetInfo(res.trajetId);
        if (trajet && trajet.employeId) {
          this.covoiturageService.sendNotification({
            destinataireId: trajet.employeId,
            type: 'PLACE_LIBEREE',
            contenu: `Une place s'est libérée : La réservation de ${this.getEmployeeName(res.employeId)} a expiré.`
          }).subscribe();
        }

        this.showToast('ℹ️ Réservation expirée', 'Le délai de paiement de 15 minutes est dépassé.');
      }
    });
  }

  payerReservation(reservation: any): void {
    if (this.isPaiementExpire(reservation)) {
      this.showToast('⏱️ Délai dépassé', 'La réservation va être annulée.', 'error');
      this.loadMesReservations();
      return;
    }

    // Chercher le trajet dans les deux sources disponibles
    const trajet = this.getTrajetInfo(reservation.trajetId)
      || this.allTrajets.find(t => t.id === reservation.trajetId)
      || null;

    if (!trajet) {
      this.showToast('❌ Erreur', 'Informations du trajet introuvables. Veuillez rafraîchir la page.', 'error');
      return;
    }

    const prix = trajet.prix ?? reservation.price ?? 0;

    this.router.navigate(
      ['/paiement-checkout'],
      { state: { reservation: { ...reservation, price: prix }, trajet } }
    );
  }

  estDejaReserve(trajetId: string): boolean {
    return this.mesReservations.some(r => r.trajetId === trajetId && r.statut !== 'ANNULE');
  }

  // ─────────────────────────────────────────────────────────────
  // NAVETTES
  // ─────────────────────────────────────────────────────────────

  /** Détermine quel bus du pack est assigné à l'utilisateur pour un jour donné (Logique identique à l'admin) */
  private getBusForUserAndDay(packId: string, employeId: string, day: string): any | undefined {
    if (!packId || !employeId || !day) return undefined;

    // Charger TOUTES les réservations du pack pour ce jour
    const packReservations = this.allShuttleReservations
      .filter(r => {
        const rBus = this.shuttles.find(b => b.id === r.busId);
        const st = String(r.statut || '').toUpperCase();
        const days = (r.joursSelectionnes || '').split(',').map((d: string) => d.trim()).filter(Boolean);
        return rBus?.packId === packId &&
          st !== 'ANNULE' &&
          days.includes(day);
      })
      .sort((a, b) => new Date(a.dateCreation || 0).getTime() - new Date(b.dateCreation || 0).getTime());

    // Identifier les bus du pack (Ordre : ACTIF en premier, puis date de création)
    const packBuses = this.shuttles
      .filter(b => b.packId === packId)
      .sort((a, b) => {
        if (a.statut === 'ACTIF' && b.statut !== 'ACTIF') return -1;
        if (a.statut !== 'ACTIF' && b.statut === 'ACTIF') return 1;
        return new Date(a.dateCreation || 0).getTime() - new Date(b.dateCreation || 0).getTime();
      });

    if (packBuses.length === 0) return undefined;

    // Distribution
    let currentBusIndex = 0;
    const busOccupancy = new Map<string, number>();
    packBuses.forEach(b => busOccupancy.set(b.id!, 0));

    for (const r of packReservations) {
      while (currentBusIndex < packBuses.length && (busOccupancy.get(packBuses[currentBusIndex].id!) || 0) >= (packBuses[currentBusIndex].capacite || 0)) {
        currentBusIndex++;
      }

      const targetBus = currentBusIndex < packBuses.length ? packBuses[currentBusIndex] : packBuses[packBuses.length - 1];
      if (String(r.employeId) === String(employeId)) {
        return targetBus;
      }

      busOccupancy.set(targetBus.id!, (busOccupancy.get(targetBus.id!) || 0) + 1);
    }

    return undefined;
  }

  getDisplayStatus(reservation: any): string {
    if (!reservation) return 'EN_ATTENTE';
    const statut = String(reservation.statut || '').toUpperCase();
    if (statut === 'ANNULE' || statut === 'ANNULÉE') return 'ANNULE';

    // PRIORITÉ 1 : Données réelles du backend (Après activation par date)
    if (reservation.joursConfirmes && (reservation.joursConfirmes.length > 0)) return 'CONFIRME';

    const bus = this.shuttles.find(s => s.id === reservation.busId);
    if (!bus) return statut;

    const packId = bus.packId;
    if (packId) {
      if (bus.statut !== 'ACTIF') {
        // Bus de réserve : vérifier si au moins un jour est confirmé
        // via activation du bus de réserve
        const days = (reservation.joursSelectionnes || '').split(',')
          .map((d: string) => d.trim()).filter(Boolean);
        const hasConfirmed = days.some((day: string) => {
          const targetBus = this.getBusForUserAndDay(packId, reservation.employeId, day);
          return targetBus?.statut === 'ACTIF';
        });
        if (hasConfirmed) return 'CONFIRME';
        return 'EN_ATTENTE_ACTIVATION';
      }
      // Bus principal ACTIF
      const days = (reservation.joursSelectionnes || '').split(',')
        .map((d: string) => d.trim()).filter(Boolean);
      const hasConfirmed = days.some((day: string) => {
        const targetBus = this.getBusForUserAndDay(packId, reservation.employeId, day);
        return targetBus?.statut === 'ACTIF';
      });
      if (hasConfirmed) return 'CONFIRME';
      return 'EN_ATTENTE_ACTIVATION';
    }

    return statut;
  }

  loadMyShuttleReservations() {
    if (!this.employeId) return;

    forkJoin({
      all: this.covoiturageService.getAllReservationsNavette(),
      mine: this.covoiturageService.getReservationsNavetteByEmploye(this.employeId)
    }).subscribe({
      next: (res) => {
        this.allShuttleReservations = res.all || [];
        this.myShuttleReservations = (res.mine || []).map((r: any) => {
          const bus = this.shuttles.find(s => s.id === r.busId);
          return {
            ...r,
            shuttleId: r.busId,
            shuttleName: bus ? `${bus.marque} ${bus.modele}` : (r.ligne || 'Navette'),
            route: bus?.ligne || r.ligne,
            days: (r.joursSelectionnes || '').split(',').map((d: string) => d.trim()).filter(Boolean)
          };
        });
        this.initAutoReclamation();
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Erreur chargement réservations navette:', err)
    });
  }

  initAutoReclamation(): void {
    const assignedBus = this.getActiveShuttleInfo();
    if (assignedBus) {
      this.reclamationBusId = assignedBus.id;
      this.cdr.detectChanges();
    }
  }

  getDayStatus(reservation: any, day: string): 'confirmed' | 'waiting' | 'none' {
    if (!reservation || !day) return 'none';
    if (!reservation.days || !reservation.days.includes(day)) return 'none';

    const statut = String(reservation.statut || '').toUpperCase();
    if (statut === 'ANNULE' || statut === 'ANNULÉE') return 'none';

    // PRIORITÉ 1: Manuel / Activé par date (Source de vérité absolue)
    if (reservation.joursConfirmes?.includes(day)) return 'confirmed';

    const bus = this.shuttles.find(s => s.id === reservation.busId);
    if (!bus) return 'none';

    const packId = bus.packId;
    if (packId) {
      if (bus.statut !== 'ACTIF') {
        // Bus de réserve : confirmé seulement si l'admin a activé CE jour
        // via joursConfirmes OU si le bus de réserve lui-même est devenu ACTIF
        // On vérifie si l'admin a activé ce jour spécifiquement
        const targetBus = this.getBusForUserAndDay(packId, reservation.employeId, day);
        if (targetBus?.statut === 'ACTIF') return 'confirmed';
        return 'waiting';
      }
      // Bus principal ACTIF → simulation normale
      const targetBus = this.getBusForUserAndDay(packId, reservation.employeId, day);
      if (targetBus) {
        return targetBus.statut === 'ACTIF' ? 'confirmed' : 'waiting';
      }
    }
    // PRIORITÉ 3: Fallback sur les listes d'attente du serveur
    if (reservation.joursEnAttente?.includes(day)) return 'waiting';

    // Fallback final
    if (statut === 'EN_ATTENTE_ACTIVATION') return 'waiting';
    return statut === 'CONFIRME' ? 'confirmed' : 'waiting';
  }

  loadShuttles() {
    this.isLoadingShuttles = true;
    this.covoiturageService.getShuttles().subscribe({
      next: (data) => {
        this.shuttles = data;
        this.isLoadingShuttles = false;
        this.loadMyShuttleReservations();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erreur', err);
        this.shuttleError = 'Erreur de chargement des navettes';
        this.isLoadingShuttles = false;
      }
    });
  }

  get filteredShuttles() {
    const filteredBase = this.shuttles.filter(s => {
      const matchSearch = !this.shuttleSearchTerm ||
        s.ligne?.toLowerCase().includes(this.shuttleSearchTerm.toLowerCase()) ||
        s.marque?.toLowerCase().includes(this.shuttleSearchTerm.toLowerCase()) ||
        s.immatriculation?.toLowerCase().includes(this.shuttleSearchTerm.toLowerCase());

      const matchDepart = !this.shuttleFilterDepart ||
        s.adresseDepart?.toLowerCase().includes(this.shuttleFilterDepart.toLowerCase());

      const matchArrivee = !this.shuttleFilterArrivee ||
        s.adresseArrivee?.toLowerCase().includes(this.shuttleFilterArrivee.toLowerCase());

      const matchHeure = !this.shuttleFilterHeure ||
        s.heureDepart?.startsWith(this.shuttleFilterHeure);

      return matchSearch && matchDepart && matchArrivee && matchHeure;
    });

    return filteredBase.filter(s => {
      const packBuses = this.shuttles.filter(b =>
        (s.packId && b.packId === s.packId) ||
        (!s.packId && b.ligne === s.ligne)
      );

      if (packBuses.length <= 1) return true;

      const activeBus = packBuses.find(b => b.statut === 'ACTIF');

      if (activeBus) {
        const isActiveFull = (activeBus.placesRestantes || 0) === 0;
        if (isActiveFull) {
          return s.statut === 'INACTIF';
        } else {
          return s.statut === 'ACTIF';
        }
      }

      return true;
    });
  }

  rechercherNavettes() {
    this.cdr.detectChanges();
  }

  // ─────────────────────────────────────────────────────────────
  // HELPERS JOURS LIBRES (réutilisés dans les 3 méthodes)
  // ─────────────────────────────────────────────────────────────

  /** Retourne le nombre de places restantes pour un bus à une date précise */
  disponibiliteParJour(shuttle: any, date: string): number {
    if (!shuttle || !date) return 0;

    const capacity = shuttle.capacite || 0;

    // Si l'objet a une map dailyOccupancy (venant de l'API), on l'utilise directement
    if (shuttle.dailyOccupancy && shuttle.dailyOccupancy[date] !== undefined) {
      return Math.max(0, capacity - shuttle.dailyOccupancy[date]);
    }

    // Sinon, on simule à partir des réservations locales connues
    const occupantCount = this.myShuttleReservations.filter(r =>
      r.busId === shuttle.id &&
      r.statut &&
      String(r.statut).toUpperCase() !== 'ANNULE' &&
      r.days && r.days.includes(date)
    ).length;

    return Math.max(0, capacity - occupantCount);
  }

  selectAllWeek(shuttleId: string, dates: string[] | undefined): void {
    if (!dates || dates.length === 0) return;
    this.selectedNavetteDays[shuttleId] = [...dates];
  }

  /** Retourne les jours sélectionnés pour ce shuttle qui ne sont PAS encore réservés */
  private getJoursLibres(shuttleId: string): string[] {
    const shuttle = this.shuttles.find(s => s.id === shuttleId);
    const packId = shuttle?.packId;
    const ligne = shuttle?.ligne;
    const jours = this.selectedNavetteDays[shuttleId] || [];

    return jours.filter(jour =>
      !this.myShuttleReservations.some(
        r => {
          // Si le bus fait partie d'un pack, on vérifie si l'employé a déjà une réservation 
          // pour ce même jour dans n'importe quel bus du même pack ou de la même ligne.
          const resBus = this.shuttles.find(s => s.id === (r.busId || r.shuttleId));
          const samePack = packId && resBus?.packId === packId;
          const sameLine = ligne && resBus?.ligne === ligne;

          return (samePack || sameLine) &&
            r.days && r.days.includes(jour) &&
            String(r.statut || '').toUpperCase() !== 'ANNULE';
        }
      )
    );
  }

  // ─────────────────────────────────────────────────────────────
  // MÉTHODES NAVETTE (version corrigée, une seule déclaration chacune)
  // ─────────────────────────────────────────────────────────────

  /**
   * Renvoie true si le jour passé est déjà réservé pour ce shuttle.
   * Sans argument joursAVerifier : vérifie si AU MOINS une réservation active existe.
   */
  estDejaReserveNavette(shuttleId: string, joursAVerifier?: string[]): boolean {
    const jours = joursAVerifier || this.selectedNavetteDays[shuttleId] || [];

    if (jours.length === 0) {
      // Aucun jour sélectionné → true si au moins une réservation active existe
      return this.myShuttleReservations.some(
        r => r.shuttleId === shuttleId &&
          String(r.statut || '').toUpperCase() !== 'ANNULE'
      );
    }

    // true seulement si TOUS les jours sélectionnés sont déjà réservés
    return jours.every(jour =>
      this.myShuttleReservations.some(
        r => r.shuttleId === shuttleId &&
          r.days && r.days.includes(jour) &&
          String(r.statut || '').toUpperCase() !== 'ANNULE'
      )
    );
  }

  /** Désactive le bouton si aucun jour libre n'est sélectionné ou si le bus est indisponible */
  navetteReserveDisabled(shuttle: any): boolean {
    const jours = this.selectedNavetteDays[shuttle.id] || [];
    const joursLibres = this.getJoursLibres(shuttle.id);

    // Aucun jour sélectionné ou tous déjà réservés → désactivé
    if (jours.length === 0 || joursLibres.length === 0) return true;

    // INACTIF dans un pack → cliquable (liste d'attente possible)
    if (shuttle.statut === 'INACTIF') {
      return !this.estDansUnPack(shuttle);
    }

    if (shuttle.statut !== 'ACTIF') return true;

    // ACTIF complet dans un pack → cliquable (liste d'attente possible)
    // Mais on vérifie par jour sélectionné maintenant
    const joursSelectionnes = this.selectedNavetteDays[shuttle.id] || [];
    if (joursSelectionnes.length > 0) {
      const tousComplets = joursSelectionnes.every(d => this.disponibiliteParJour(shuttle, d) === 0);
      if (tousComplets && !this.estDansUnPack(shuttle)) return true;
    }

    return false;
  }

  /** Libellé dynamique du bouton selon les jours sélectionnés et l'état du bus */
  navetteReserveLabel(shuttle: any): string {
    const jours = this.selectedNavetteDays[shuttle.id] || [];

    if (jours.length === 0) return 'Choisir des jours';

    const joursLibres = this.getJoursLibres(shuttle.id);

    if (joursLibres.length === 0) return 'Déjà réservé';

    const dejaPris = jours.length - joursLibres.length;
    if (dejaPris > 0) {
      return `Réserver (${joursLibres.length} jour${joursLibres.length > 1 ? 's' : ''})`;
    }

    // INACTIF dans un pack → "Réserver"
    if (shuttle.statut === 'INACTIF' && this.estDansUnPack(shuttle)) return 'Réserver';

    if (shuttle.statut !== 'ACTIF') return 'Indisponible';

    // ACTIF complet dans un pack → liste d'attente
    if ((shuttle.placesRestantes ?? 0) === 0 && this.estDansUnPack(shuttle)) return 'Liste d\'attente';

    if ((shuttle.placesRestantes ?? 0) === 0) return 'Complet';

    return 'Réserver';
  }

  private aUnBusDeReserve(shuttle: any): boolean {
    return this.shuttles.some(s =>
      s.packId === shuttle.packId &&
      s.statut === 'INACTIF'
    );
  }

  /** Méthode pour savoir si un bus fait partie d'un pack */
  estDansUnPack(shuttle: any): boolean {
    return !!shuttle.packId;
  }

  /** N'envoie au backend que les jours non encore réservés */
  reserverNavette(shuttle: any) {
    const tousJours = this.selectedNavetteDays[shuttle.id] || [];

    if (tousJours.length === 0) {
      this.showToast('ℹ️ Attention', 'Veuillez sélectionner au moins un jour.', 'info'); return;
    }

    // On ne réserve que les jours libres
    const joursLibres = this.getJoursLibres(shuttle.id);

    if (joursLibres.length === 0) {
      this.showToast('ℹ️ Déjà réservé', 'Tous les jours sélectionnés sont déjà réservés.', 'info'); return;
    }

    const joursSelectionnes = joursLibres.join(',');

    const daysArray = joursLibres;
    // On vérifie le statut pour CHAQUE jour.
    const isFull = daysArray.some(d => this.disponibiliteParJour(shuttle, d) <= 0);
    const hasReserve = this.aUnBusDeReserve(shuttle);

    // On ne permet la liste d'attente "activation" QUE s'il reste un bus inactif dans le pack
    // OU si l'on réserve DIRECTEMENT sur un bus de réserve (INACTIF)
    const isInactiveBus = shuttle.statut !== 'ACTIF';
    const canWaitlist = isInactiveBus || (isFull && this.estDansUnPack(shuttle) && hasReserve);

    const reservation = {
      busId: shuttle.id,
      employeId: this.employeId,
      joursSelectionnes: joursSelectionnes,
      statut: canWaitlist ? 'EN_ATTENTE_ACTIVATION' : 'EN_ATTENTE'
    };

    this.covoiturageService.reserverNavette(reservation).subscribe({
      next: (res: any) => {
        // Recharger d'abord
        this.loadMyShuttleReservations();

        // Vérifier le seuil de 50% sur le bus de réserve
        this.covoiturageService.getShuttles().subscribe(updatedShuttles => {
          this.shuttles = updatedShuttles;
          const currentBus = updatedShuttles.find(s => s.id === shuttle.id);
          if (currentBus && currentBus.statut !== 'ACTIF') {
            daysArray.forEach(day => {
              const occ = currentBus.dailyOccupancy ? (currentBus.dailyOccupancy[day] || 0) : 0;
              if (occ === (currentBus.capacite || 0) / 2) {
                this.emailService.sendThresholdNotification(currentBus.ligne || 'Navette', day, occ, currentBus.capacite).subscribe({
                  next: () => { },
                  error: (err) => console.error('✗ Erreur envoi email notification', err)
                });
              }
            });
          }
          this.cdr.detectChanges();
        });

        this.selectedNavetteDays[shuttle.id] = [];
        const st = typeof res?.statut === 'string' ? res.statut : res?.statut?.name;

        const conf = res.joursConfirmes || [];
        const wait = res.joursEnAttente || [];

        let msg = '';
        if (wait.length === 0) {
          msg = `✅ Réservation confirmée avec succès pour tous les jours sélectionnés !`;
        } else {
          const confStr = conf.length > 0 ? `Certains jours sont confirmés : ${conf.join(', ')}.\n` : '';
          const waitStr = `⚠️ Jours en liste d'attente : ${wait.join(', ')}.\n\n`;

          const packBuses = this.shuttles.filter(b => b.packId === shuttle.packId);
          const reserveBus = packBuses.find(b => b.statut === 'INACTIF');
          const reserveCap = reserveBus?.capacite || 15;
          const seuil = Math.max(1, reserveCap / 2);

          // On pourrait calculer le nombre exact en attente ici pour le message, 
          // mais informons déjà l'utilisateur du principe du seuil de 50%.
          const thresholdMsg = `ℹ️ Note: Un bus de réserve sera automatiquement activé dès que la liste d'attente globale atteindra ${seuil} personnes (50% de sa capacité).`;

          msg = `${confStr}${waitStr}${thresholdMsg}`;
        }
        this.showToast(
          wait.length === 0 ? '✅ Réservation confirmée' : '⚠️ Liste d\'attente',
          msg,
          wait.length === 0 ? 'success' : 'info'
        ); this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erreur réservation', err);
        const body = err?.error;
        const msg = typeof body === 'string' ? body : (body?.message || err?.message || 'Erreur inconnue');
        this.showToast('❌ Erreur', msg, 'error');
      }
    });
  }

  toggleNavetteDay(shuttleId: string, day: string) {
    if (!this.selectedNavetteDays[shuttleId]) {
      this.selectedNavetteDays[shuttleId] = [];
    }
    if (this.selectedNavetteDays[shuttleId].includes(day)) {
      this.selectedNavetteDays[shuttleId] = this.selectedNavetteDays[shuttleId].filter(d => d !== day);
    } else {
      this.selectedNavetteDays[shuttleId] = [...this.selectedNavetteDays[shuttleId], day];
    }
  }

  annulerReservationNavette(reservationId: string) {
    this.covoiturageService.annulerReservationNavette(reservationId).subscribe({
      next: () => {
        this.myShuttleReservations = this.myShuttleReservations.filter(r => r.id !== reservationId);
        this.showToast('✅ Annulée', 'Réservation navette annulée.', 'success');
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erreur annulation', err);
        this.showToast('❌ Erreur', 'Erreur lors de l\'annulation.', 'error');
      }
    });
  }
  // ─────────────────────────────────────────────────────────────
  // SAISIE MANUELLE
  // ─────────────────────────────────────────────────────────────

  setInputMode(mode: 'map' | 'manual') {
    this.inputMode = mode;
    if (mode === 'map') {
      this.manualDeparture = '';
      this.manualDestination = '';
    } else {
      this.manualDeparture = this.departureLocation || 'Ariana, Tunis';
      this.manualDestination = this.destinationLocation || 'Centre-ville, Tunis';
      this.updateRouteFromManual();
    }
  }

  onManualInputChange() {
    if (this.inputMode === 'manual') {
      this.updateRouteFromManual();
    }
  }

  updateRouteFromManual() {
    if (this.manualDeparture && this.manualDestination) {
      this.departureLocation = this.manualDeparture;
      this.destinationLocation = this.manualDestination;
      const distanceKm = Math.random() * 20 + 5;
      const durationMn = Math.round((distanceKm / 40) * 60);
      const co2Saved = distanceKm * 0.12;
      this.routeDistance = distanceKm.toFixed(1) + ' km';
      this.routeDuration = durationMn.toString() + ' min';
      this.routeCo2 = co2Saved.toFixed(2) + ' kg';
    }
  }

  // ─────────────────────────────────────────────────────────────
  // RECHERCHE CARTE
  // ─────────────────────────────────────────────────────────────

  onSearchInput() {
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    if (this.searchQuery.length < 3) {
      this.searchSuggestions = [];
      return;
    }
    this.searchTimeout = setTimeout(() => {
      this.getSuggestions();
    }, 500);
  }

  async getSuggestions() {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(this.searchQuery)}&limit=5&addressdetails=1&countrycodes=tn&accept-language=fr`
      );
      this.searchSuggestions = await response.json();
    } catch (error) {
      console.error('Erreur suggestions:', error);
      this.searchSuggestions = [];
    }
  }

  async searchLocation() {
    if (!this.searchQuery.trim()) return;
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(this.searchQuery)}&limit=1&addressdetails=1&countrycodes=tn&accept-language=fr`
      );
      const data = await response.json();
      if (data && data.length > 0) {
        this.selectSuggestion(data[0]);
      } else {
        this.showToast('🔍 Introuvable', `Aucun lieu trouvé pour "${this.searchQuery}"`, 'info');
      }
    } catch (error) {
      console.error('Erreur recherche:', error);
      this.showToast('❌ Erreur', 'Erreur lors de la recherche.', 'error');
    }
  }

  selectSuggestion(lieu: any) {
    const lat = parseFloat(lieu.lat);
    const lng = parseFloat(lieu.lon);
    const nomLieu = lieu.display_name.split(',')[0];

    this.map.setView([lat, lng], 15);

    if (this.searchMarker) {
      this.map.removeLayer(this.searchMarker);
    }

    const searchIcon = L.divIcon({
      className: 'search-marker',
      html: `
        <div class="relative">
          <div class="w-10 h-10 bg-white rounded-full shadow-xl flex items-center justify-center border-2 border-[#1D9E75] animate-bounce">
            <div class="w-3 h-3 bg-[#1D9E75] rounded-full"></div>
          </div>
          <div class="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-3 py-1 rounded text-xs whitespace-nowrap font-bold shadow-lg">
            ${nomLieu}
          </div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -20]
    });

    this.searchMarker = L.marker([lat, lng], { icon: searchIcon }).addTo(this.map);
    this.searchQuery = lieu.display_name;
    this.searchSuggestions = [];
    this.cdr.detectChanges();
  }

  // ─────────────────────────────────────────────────────────────
  // RECLAMATION SEARCH
  // ─────────────────────────────────────────────────────────────

  onReclamationSearchInput() {
    if (this.reclamationSearchTimeout) clearTimeout(this.reclamationSearchTimeout);
    if (!this.reclamationSearchQuery || this.reclamationSearchQuery.length < 3) {
      this.reclamationSearchSuggestions = [];
      return;
    }

    this.reclamationSearchTimeout = setTimeout(() => {
      fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(this.reclamationSearchQuery + ', Tunisie')}&limit=5&countrycodes=tn`)
        .then(res => res.json())
        .then(data => {
          this.ngZone.run(() => {
            this.reclamationSearchSuggestions = data;
            this.cdr.detectChanges();
          });
        });
    }, 500);
  }

  async searchReclamationLocation() {
    if (!this.reclamationSearchQuery) return;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(this.reclamationSearchQuery + ', Tunisie')}&limit=1&countrycodes=tn`);
      const data = await res.json();
      if (data && data.length > 0) {
        this.selectReclamationSuggestion(data[0]);
      }
    } catch (e) {
      console.error("Reclamation Search Error:", e);
    }
  }

  selectReclamationSuggestion(lieu: any) {
    if (!lieu) return;
    this.reclamationSearchQuery = lieu.display_name.split(',')[0] + ', ' + lieu.display_name.split(',').slice(1, 3).join(', ');
    this.reclamationSearchSuggestions = [];

    const lat = parseFloat(lieu.lat);
    const lng = parseFloat(lieu.lon);

    if (this.reclamationMap) {
      this.reclamationMap.setView([lat, lng], 15);
    }
  }

  centerOnMyLocation() {
    if (!navigator.geolocation) {
      this.showToast('❌ Erreur', 'Géolocalisation non supportée par votre navigateur.', 'error');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        this.map.setView([lat, lng], 15);

        const pulseIcon = L.divIcon({
          className: 'pulse-marker',
          html: `
            <div class="relative">
              <div class="absolute w-8 h-8 bg-[#1D9E75] rounded-full opacity-75 animate-ping"></div>
              <div style="background-color: #1D9E75; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 0 2px rgba(29,158,117,0.3);"></div>
            </div>
          `,
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });

        if (this.currentLocationMarker) {
          this.map.removeLayer(this.currentLocationMarker);
        }

        this.currentLocationMarker = L.marker([lat, lng], { icon: pulseIcon })
          .addTo(this.map)
          .bindPopup('<b>📍 Vous êtes ici</b>')
          .openPopup();

        setTimeout(() => {
          if (this.currentLocationMarker) {
            this.map.removeLayer(this.currentLocationMarker);
            this.currentLocationMarker = null;
          }
        }, 5000);
      },
      (error) => {
        let message = 'Erreur de géolocalisation';
        switch (error.code) {
          case error.PERMISSION_DENIED: message = 'Permission refusée'; break;
          case error.POSITION_UNAVAILABLE: message = 'Position non disponible'; break;
          case error.TIMEOUT: message = 'Délai dépassé'; break;
        }
        this.showToast('❌ Géolocalisation', message, 'error');
      },
      { enableHighAccuracy: false, maximumAge: Infinity, timeout: 15000 }
    );
  }

  // ─────────────────────────────────────────────────────────────
  // CARTE PUBLICATION
  // ─────────────────────────────────────────────────────────────

  togglePubMapSize() {
    this.isPubMapExpanded = !this.isPubMapExpanded;
    setTimeout(() => {
      if (this.publishMap) {
        this.publishMap.invalidateSize();
      }
    }, 400);
  }

  getAdresseDepartPourTracking(): string {
    const trajet = this.allTrajets.find(t => t.vehiculeId === this.trackingVehiculeId);
    return trajet?.adresseDepart || '';
  }

  getAdresseArriveePourTracking(): string {
    const trajet = this.allTrajets.find(t => t.vehiculeId === this.trackingVehiculeId);
    return trajet?.adresseArrivee || '';
  }

  onPubSearchInput() {
    if (this.pubSearchTimeout) clearTimeout(this.pubSearchTimeout);
    if (this.pubSearchQuery.length < 3) {
      this.pubSearchSuggestions = [];
      return;
    }
    this.pubSearchTimeout = setTimeout(() => {
      this.getPubSuggestions();
    }, 500);
  }

  async getPubSuggestions() {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(this.pubSearchQuery)}&limit=5&addressdetails=1&countrycodes=tn&accept-language=fr`
      );
      this.pubSearchSuggestions = await response.json();
    } catch (error) {
      console.error('Erreur suggestions:', error);
      this.pubSearchSuggestions = [];
    }
  }

  async searchPubLocation() {
    if (!this.pubSearchQuery.trim()) return;
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(this.pubSearchQuery)}&limit=1&addressdetails=1&countrycodes=tn&accept-language=fr`
      );
      const data = await response.json();
      if (data && data.length > 0) {
        this.selectPubSuggestion(data[0]);
      }
    } catch (error) {
      console.error('Erreur recherche:', error);
    }
  }

  selectPubSuggestion(lieu: any) {
    const lat = parseFloat(lieu.lat);
    const lng = parseFloat(lieu.lon);
    const nomLieu = lieu.display_name.split(',')[0];

    this.publishMap.setView([lat, lng], 15);
    this.publishMap.fire('click', { latlng: L.latLng(lat, lng) });

    this.pubSearchSuggestions = [];
    this.pubSearchQuery = nomLieu;
  }

  centerOnPublishMapLocation() {
    if (!navigator.geolocation) {
      alert('Géolocalisation non supportée');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        this.publishMap.setView([lat, lng], 15);

        const pulseIcon = L.divIcon({
          className: 'pulse-marker',
          html: `
            <div class="relative">
              <div class="absolute w-8 h-8 bg-[#1D9E75] rounded-full opacity-75 animate-ping"></div>
              <div style="background-color: #1D9E75; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 0 2px rgba(29,158,117,0.3);"></div>
            </div>
          `,
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });

        if (this.pubCurrentLocationMarker) {
          this.publishMap.removeLayer(this.pubCurrentLocationMarker);
        }

        this.pubCurrentLocationMarker = L.marker([lat, lng], { icon: pulseIcon })
          .addTo(this.publishMap)
          .bindPopup('<b>📍 Vous êtes ici</b>')
          .openPopup();

        setTimeout(() => {
          if (this.pubCurrentLocationMarker) {
            this.publishMap.removeLayer(this.pubCurrentLocationMarker);
            this.pubCurrentLocationMarker = null;
          }
        }, 5000);
      },
      (error) => {
        alert('Erreur de géolocalisation');
      }
    );
  }

  rechercherCovoitureurs() {
    // 1. Récupération & Normalisation des inputs
    // Priorité à manualAllStartPoints s'il est rempli en mode manuel
    const departInput = (this.inputMode === 'manual'
      ? (this.manualAllStartPoints || this.manualDeparture)
      : this.departureLocation);
    const arriveeInput = (this.inputMode === 'manual' ? this.manualDestination : this.destinationLocation);

    const depart = departInput?.toLowerCase().trim();
    const arrivee = arriveeInput?.toLowerCase().trim();
    const targetTime = this.searchTime?.trim();
    const selectedDaysNorm = (this.selectedDays || []).map(d => d.toLowerCase().trim());

    // 2. Validation minimale
    const hasActiveFilters = !!(depart || arrivee || targetTime || selectedDaysNorm.length > 0 || this.searchPrice !== null);

    if (!hasActiveFilters) {
      this.showToast('ℹ️ Critères manquants', 'Veuillez renseigner au moins un critère de recherche.', 'info');
      return;
    }

    console.log('--- DEBUT RECHERCHE ---');
    console.log('Filtres:', { depart, arrivee, targetTime, selectedDaysNorm });

    // 3. Filtrage dynamique
    const trajetsFiltres = this.allTrajets.filter(trajet => {
      // Normalisation des champs du trajet
      const trajetDep = (trajet.adresseDepart || '').toLowerCase().trim();
      const trajetArr = (trajet.adresseArrivee || '').toLowerCase().trim();
      const trajetJours = (trajet.joursDisponibles || '').toLowerCase();
      const trajetHeure = (trajet.heureDepart || '').trim();

      // IDs pour exclusion (normalisés en string)
      const tId = String(trajet.employeId || '').trim().toLowerCase();
      const myId = String(this.employeId || '').trim().toLowerCase();

      // a. Jours (OR logic: if trajet has ANY of the selected days)
      const joursMatch = selectedDaysNorm.length === 0 ||
        selectedDaysNorm.some(day => trajetJours.includes(day));

      // b. Départ (Substring match)
      const departMatch = !depart || trajetDep.includes(depart);

      // c. Arrivée (Substring match)
      const arriveeMatch = !arrivee || trajetArr.includes(arrivee);

      // d. Heure (Prefix match)
      const timeMatch = !targetTime || trajetHeure.startsWith(targetTime);

      // e. Prix (Si renseigné)
      const searchPriceActive = this.searchPrice !== null && this.searchPrice !== undefined && (this.searchPrice as any) !== '';
      const prixMatch = !searchPriceActive || (trajet.prix !== undefined && (trajet.prix || 0) <= (this.searchPrice || 0));

      // f. Exclusion de soi-même
      const isNotMe = tId !== myId;

      return joursMatch && departMatch && arriveeMatch && timeMatch && isNotMe && prixMatch;
    });

    console.log(`Résultats: ${trajetsFiltres.length} trouvé(s)`);
    console.log('--- FIN RECHERCHE ---');

    // 4. Mise à jour de l'affichage
    if (trajetsFiltres.length === 0) {
      this.showToast('🔍 Aucun résultat', 'Aucun covoiturage trouvé pour ces critères.', 'info');
      this.displayedTrajets = [];
    } else {
      this.displayedTrajets = trajetsFiltres;
    }

    this.cdr.detectChanges();
  }

  // ─────────────────────────────────────────────────────────────
  // LIFECYCLE
  // ─────────────────────────────────────────────────────────────

  ngAfterViewInit() {
    if (this.activeSection === 'utilises') {
      setTimeout(() => {
        this.initLeaflet();
        this.initReclamationMap();
      }, 100);
    }
  }

  toastTitle: string = '';
  toastMessage: string = '';
  toastType: 'success' | 'error' | 'info' = 'success';
  toastVisible: boolean = false;

  showToast(title: string, message: string, type: 'success' | 'error' | 'info' = 'success') {
    this.toastTitle = title;
    this.toastMessage = message;
    this.toastType = type;
    this.toastVisible = true;
    this.cdr.detectChanges();
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
    }
    if (this.publishMap) {
      this.publishMap.remove();
    }
    if (this.notifStompClient) this.notifStompClient.deactivate();
  }

  switchSection(section: 'utilises' | 'proposes' | 'recompenses') {
    this.activeSection = section;
    this.cdr.detectChanges();

    // Si on switch vers UTILISES, on initialise la carte de réclamation si besoin (si on est déjà sur l'onglet navette)
    if (section === 'utilises' && this.selectedTab === 'navette') {
      setTimeout(() => this.initReclamationMap(), 200);
    }

    if (section === 'proposes') {
      setTimeout(() => {
        if (this.publishMap) {
          this.publishMap.invalidateSize();
        } else {
          if (typeof L !== 'undefined') this.initPublishMap();
        }
      }, 300);
    } else if (section === 'utilises') {
      setTimeout(() => {
        if (!this.map && typeof L !== 'undefined') {
          this.initMap();
        } else if (this.map) {
          this.map.invalidateSize();
        }
      }, 300);
    }
  }

  switchTab(tab: string) {
    this.selectedTab = tab;
    this.cdr.detectChanges();

    if (tab === 'navette' && this.activeSection === 'utilises') {
      setTimeout(() => {
        this.initReclamationMap();
      }, 200);
    }
  }

  initReclamationMap() {
    // Si la carte existe déjà ou si l'élément n'est pas dans le DOM, on arrête
    if (!this.reclamationMapDiv || this.reclamationMap) {
      if (this.reclamationMap) {
        setTimeout(() => this.reclamationMap.invalidateSize(), 100);
      }
      return;
    }

    this.reclamationMap = L.map(this.reclamationMapDiv.nativeElement, {
      zoomControl: true,
      attributionControl: false
    }).setView([36.8065, 10.1815], 11); // Centré sur Tunis

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(this.reclamationMap);

    this.reclamationMap.on('click', (e: any) => {
      this.onReclamationMapClick(e.latlng.lat, e.latlng.lng);
    });

    // Ajouter les arrêts de bus existants pour aider l'employé
    this.ajouterArretsSurCarteReclamation();
  }

  private ajouterArretsSurCarteReclamation() {
    if (!this.reclamationMap || !this.shuttles) return;

    this.shuttles.forEach(bus => {
      if (bus.arrets) {
        bus.arrets.forEach((stop: any) => {
          L.circleMarker([stop.latitude, stop.longitude], {
            radius: 4,
            fillColor: "#1D9E75",
            color: "#fff",
            weight: 1,
            opacity: 1,
            fillOpacity: 0.8
          }).addTo(this.reclamationMap)
            .bindPopup(`Arrêt: ${stop.name} (${bus.ligne || bus.route})`);
        });
      }
    });
  }

  onReclamationMapClick(lat: number, lng: number) {
    this.selectedLat = lat;
    this.selectedLng = lng;

    if (this.reclamationMarker) {
      this.reclamationMarker.setLatLng([lat, lng]);
    } else {
      const redIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });
      this.reclamationMarker = L.marker([lat, lng], { icon: redIcon, draggable: true }).addTo(this.reclamationMap)
        .bindPopup('Ma position précise').openPopup();

      this.reclamationMarker.on('dragend', (event: any) => {
        const marker = event.target;
        const position = marker.getLatLng();
        this.onReclamationMapClick(position.lat, position.lng);
      });
    }

    // Reverse Geocoding pour remplir le champ neighborhood
    this.reverseGeocode(lat, lng);
    this.cdr.detectChanges();
  }

  private async reverseGeocode(lat: number, lng: number) {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
      const data = await res.json();
      if (data && data.display_name) {
        const addr = data.address;
        const neighborhood = addr.suburb || addr.neighbourhood || addr.city_district || addr.town || addr.village;
        if (neighborhood) {
          this.reclamationNeighborhood = neighborhood;
        } else {
          this.reclamationNeighborhood = data.display_name.split(',').slice(0, 2).join(',');
        }
        this.cdr.detectChanges();
      }
    } catch (e) {
      console.warn("Reverse geocoding error", e);
    }
  }

  toggleDay(day: string) {
    if (this.selectedDays.includes(day)) {
      this.selectedDays = this.selectedDays.filter(d => d !== day);
    } else {
      this.selectedDays = [...this.selectedDays, day];
    }
  }

  toggleChat() {
    this.showChat = !this.showChat;
  }

  toggleMapSize() {
    this.isMapExpanded = !this.isMapExpanded;
    setTimeout(() => {
      if (this.map) {
        this.map.invalidateSize();
      }
    }, 400);
  }

  async getAddressFromCoords(lat: number, lng: number): Promise<string> {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
      const data = await response.json();
      if (data && data.display_name) {
        const parts = data.display_name.split(', ');
        return parts.slice(0, 3).join(', ');
      }
      return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    } catch {
      return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // LEAFLET INIT
  // ─────────────────────────────────────────────────────────────

  private initLeaflet() {
    if (typeof L !== 'undefined') {
      this.initMap();
      this.initPublishMap();
      this.initReclamationMap();
      return;
    }

    const link = this.renderer.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    this.renderer.appendChild(document.head, link);

    const script = this.renderer.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => {
      this.initMap();
      this.initPublishMap();
      this.initReclamationMap();
    };
    this.renderer.appendChild(document.body, script);
  }

  private initMap() {
    if (!this.mapDiv) return;
    if (this.map) return;

    this.map = L.map(this.mapDiv.nativeElement).setView([36.8065, 10.1815], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          this.map.setView([lat, lng], 14);

          this.currentLocationMarker = L.circleMarker([lat, lng], {
            radius: 8,
            fillColor: "#1D9E75",
            color: "#ffffff",
            weight: 2,
            opacity: 1,
            fillOpacity: 1
          }).addTo(this.map).bindPopup("<b>Votre position</b>").openPopup();
        },
        (error) => {
          console.warn("Géolocalisation bloquée ou introuvable : ", error);
        },
        { enableHighAccuracy: false, maximumAge: Infinity, timeout: 15000 }
      );
    }

    this.map.on('click', (e: any) => {
      this.ngZone.run(() => {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;

        if (!this.departureMarker) {
          this.departureLocation = "Recherche de l'adresse...";
          this.cdr.detectChanges();

          const customIcon = L.divIcon({
            className: 'custom-icon',
            html: `<div style="background-color: #1D9E75; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.4);"></div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          });
          this.departureMarker = L.marker([lat, lng], { icon: customIcon }).addTo(this.map).bindPopup("Départ").openPopup();

          this.getAddressFromCoords(lat, lng).then(addr => {
            this.ngZone.run(() => {
              this.departureLocation = addr;
            });
          });

        } else if (!this.destinationMarker) {
          this.destinationLocation = "Recherche de l'adresse...";
          this.cdr.detectChanges();

          const customIcon = L.divIcon({
            className: 'custom-icon',
            html: `<div style="background-color: #E94560; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.4);"></div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          });
          this.destinationMarker = L.marker([lat, lng], { icon: customIcon }).addTo(this.map).bindPopup("Arrivée").openPopup();

          const startLat = this.departureMarker.getLatLng().lat;
          const startLng = this.departureMarker.getLatLng().lng;

          const distanceMts = this.departureMarker.getLatLng().distanceTo(this.destinationMarker.getLatLng());
          const distanceKm = distanceMts / 1000;
          const durationMn = Math.round((distanceKm / 40) * 60);
          const co2Saved = distanceKm * 0.12;

          this.ngZone.run(() => {
            this.routeDistance = distanceKm.toFixed(1) + ' km';
            this.routeDuration = durationMn.toString() + ' min';
            this.routeCo2 = co2Saved.toFixed(2) + ' kg';
            this.cdr.markForCheck();
            this.cdr.detectChanges();
            setTimeout(() => this.appRef.tick(), 10);
          });

          fetch(`https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${lng},${lat}?overview=full&geometries=geojson`)
            .then(res => res.json())
            .then(data => {
              if (data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                const coords = route.geometry.coordinates.map((c: any) => [c[1], c[0]]);

                this.ngZone.run(() => {
                  this.polyline = L.polyline(coords, {
                    color: '#3B82F6',
                    weight: 5,
                    opacity: 0.9
                  }).addTo(this.map);

                  this.map.fitBounds(this.polyline.getBounds(), { padding: [50, 50] });

                  const realDistanceKm = route.distance / 1000;
                  const realDurationMn = Math.round(route.duration / 60);
                  const realCo2Saved = realDistanceKm * 0.12;

                  this.routeDistance = realDistanceKm.toFixed(1) + ' km';
                  this.routeDuration = realDurationMn.toString() + ' min';
                  this.routeCo2 = realCo2Saved.toFixed(2) + ' kg';

                  const midPoint = coords[Math.floor(coords.length / 2)];
                  const tooltipHtml = `<div style="text-align:center; font-family:sans-serif;">
                    <span style="font-weight:900; font-size:14px; color:#1A1A2E;">${realDurationMn} min</span><br>
                    <span style="font-size:12px; color:#6b7280; font-weight:600;">${realDistanceKm.toFixed(1)} km</span>
                  </div>`;

                  this.routeTooltip = L.tooltip({ permanent: true, direction: 'center', className: 'bg-white rounded-xl shadow-lg border-0' })
                    .setLatLng(midPoint)
                    .setContent(tooltipHtml)
                    .addTo(this.map);

                  this.cdr.markForCheck();
                  this.cdr.detectChanges();
                  setTimeout(() => this.appRef.tick(), 10);
                });
              }
            })
            .catch(err => console.error("OSRM Error:", err));

          this.getAddressFromCoords(lat, lng).then(addr => {
            this.ngZone.run(() => {
              this.destinationLocation = addr;
            });
          });

        } else {
          this.map.removeLayer(this.departureMarker);
          this.map.removeLayer(this.destinationMarker);
          if (this.polyline) {
            this.map.removeLayer(this.polyline);
          }
          if (this.routeTooltip) {
            this.map.removeLayer(this.routeTooltip);
          }

          this.routeDistance = '-';
          this.routeDuration = '-';
          this.routeCo2 = '-';

          this.departureLocation = "Recherche de l'adresse...";
          this.destinationLocation = '';
          this.cdr.detectChanges();

          const customIcon = L.divIcon({
            className: 'custom-icon',
            html: `<div style="background-color: #1D9E75; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.4);"></div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          });
          this.departureMarker = L.marker([lat, lng], { icon: customIcon }).addTo(this.map).bindPopup("Départ").openPopup();
          this.destinationMarker = null;
          this.polyline = null;

          this.getAddressFromCoords(lat, lng).then(addr => {
            this.ngZone.run(() => {
              this.departureLocation = addr;
            });
          });
        }
      });
    });

    setTimeout(() => {
      this.map.invalidateSize();
    }, 400);
  }

  private initPublishMap() {
    if (!this.publishMapDiv) return;
    if (this.publishMap) {
      setTimeout(() => this.publishMap.invalidateSize(), 500);
      return;
    }

    this.publishMap = L.map(this.publishMapDiv.nativeElement).setView([36.8065, 10.1815], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.publishMap);

    this.publishMap.on('click', (e: any) => {
      this.ngZone.run(() => {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;

        if (!this.pubDepMarker) {
          this.trajetForm.get('adresseDepart')?.setValue("Recherche...");

          const customIcon = L.divIcon({
            className: 'custom-icon',
            html: `<div style="background-color: #1D9E75; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.4);"></div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          });
          this.pubDepMarker = L.marker([lat, lng], { icon: customIcon }).addTo(this.publishMap).bindPopup("Départ").openPopup();

          this.getAddressFromCoords(lat, lng).then(addr => {
            this.ngZone.run(() => {
              this.trajetForm.get('adresseDepart')?.setValue(addr);
              this.cdr.detectChanges();
            });
          });

        } else if (!this.pubDestMarker) {
          this.trajetForm.get('adresseArrivee')?.setValue("Recherche...");
          this.cdr.detectChanges();

          const customIcon = L.divIcon({
            className: 'custom-icon',
            html: `<div style="background-color: #E94560; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.4);"></div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          });
          this.pubDestMarker = L.marker([lat, lng], { icon: customIcon }).addTo(this.publishMap).bindPopup("Arrivée").openPopup();

          this.getAddressFromCoords(lat, lng).then(addr => {
            this.ngZone.run(() => {
              this.trajetForm.get('adresseArrivee')?.setValue(addr);
              this.cdr.detectChanges();
            });

            const group = new L.featureGroup([this.pubDepMarker, this.pubDestMarker]);
            this.publishMap.fitBounds(group.getBounds(), { padding: [50, 50] });
          });

        } else {
          this.publishMap.removeLayer(this.pubDepMarker);
          this.publishMap.removeLayer(this.pubDestMarker);
          this.pubDepMarker = null;
          this.pubDestMarker = null;

          this.trajetForm.get('adresseDepart')?.setValue('');
          this.trajetForm.get('adresseArrivee')?.setValue('');
          this.cdr.detectChanges();
        }
      });
    });
  }

  getActiveShuttleInfo(): any {
    if (this.myShuttleReservations && this.myShuttleReservations.length > 0) {
      // Find the first confirmed or active reservation
      const lastRes = this.myShuttleReservations.find(r =>
        ['CONFIRME', 'EN_ATTENTE_ACTIVATION', 'EFFECTUE'].includes(this.getDisplayStatus(r))
      ) || this.myShuttleReservations[0];

      const bus = this.shuttles.find(s => s.id === lastRes.shuttleId || s.id === lastRes.busId);
      return bus || null;
    }
    return null;
  }

  submitReclamation(): void {
    const selectedBusId = this.reclamationBusId;
    if (!selectedBusId || !this.reclamationStop || !this.reclamationNeighborhood) {
      this.reclamationError = "Veuillez remplir tous les champs.";
      this.cdr.detectChanges();
      return;
    }

    // Validation des doublons : Vérifier si l'employé a déjà réclamé pour ce quartier
    this.reclamationService.getAll().subscribe({
      next: (reclamations) => {
        const alreadyExists = reclamations.some(r =>
          String(r.employeId) === String(this.employeId) &&
          r.neighborhood?.trim().toLowerCase() === this.reclamationNeighborhood.trim().toLowerCase()
        );

        if (alreadyExists) {
          this.reclamationError = "Vous avez déjà envoyé une réclamation pour ce quartier.";
          this.cdr.detectChanges();
          return;
        }

        this.proceedWithReclamation(selectedBusId);
      },
      error: (err) => {
        console.error("Erreur lors de la validation des doublons", err);
        // En cas d'erreur de validation, on tente quand même l'envoi
        this.proceedWithReclamation(selectedBusId);
      }
    });
  }

  private async proceedWithReclamation(selectedBusId: string): Promise<void> {
    try {
      // Amélioration de la précision de la recherche (on ajoute El Mourouj si c'est un quartier de cette zone)
      let searchQuery = this.reclamationNeighborhood;
      if (searchQuery.toLowerCase().includes('mourouj') && !searchQuery.toLowerCase().includes('el mourouj')) {
        searchQuery = 'El ' + searchQuery;
      }

      let lat = this.selectedLat || 36.8065;
      let lng = this.selectedLng || 10.1815;

      // Si pas de sélection sur carte, on tente le géocodage par texte (fallback)
      if (!this.selectedLat || !this.selectedLng) {
        const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery + ', Tunisie')}&limit=1&countrycodes=tn`);
        const data = await geoRes.json();

        if (data && data.length > 0) {
          lat = parseFloat(data[0].lat);
          lng = parseFloat(data[0].lon);
        }
      }

      // Trouver les coordonnées de l'arrêt
      let stopLat = 0;
      let stopLng = 0;
      const bus = this.shuttles.find(s => s.id === selectedBusId);
      if (bus && bus.arrets) {
        // Recherche insensible à la casse et aux espaces
        const stop = bus.arrets.find((a: any) =>
          a.name.trim().toLowerCase() === this.reclamationStop.trim().toLowerCase()
        );
        if (stop) {
          stopLat = stop.latitude;
          stopLng = stop.longitude;
        }
      }

      console.log(`[Reclamation] Calcul OSRM entre : Neighborhood(${lat},${lng}) et Stop(${stopLat},${stopLng})`);

      let walkingDistance = 0;
      let walkingTime = 0;

      // Calcul OSRM si on a les coordonnées des deux points
      if (stopLat !== 0 && stopLng !== 0) {
        try {
          // Utilisation du nouveau WalkingService (OpenRouteService) pour des données réelles
          const metrics = await firstValueFrom(this._walkingService.getWalkingMetrics(lat, lng, stopLat, stopLng));
          walkingDistance = metrics.distance;
          walkingTime = metrics.time;
        } catch (e) {
          console.warn("WalkingService error", e);
        }
      }

      const reclamation: Reclamation = {
        employeId: this.employeId,
        busId: selectedBusId,
        stopName: this.reclamationStop,
        neighborhood: this.reclamationNeighborhood,
        latitude: lat,
        longitude: lng,
        walkingDistance: walkingDistance,
        walkingTime: walkingTime,
        date: new Date().toISOString(),
        status: 'PENDING'
      };

      console.log("[Reclamation] Envoi de la réclamation avec metrics :", { walkingDistance, walkingTime });

      this.reclamationService.submit(reclamation).subscribe({
        next: () => {
          this.reclamationSuccess = true;
          this.reclamationError = '';
          this.reclamationStop = '';
          this.reclamationNeighborhood = '';
          setTimeout(() => this.reclamationSuccess = false, 5000);
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.reclamationError = "Une erreur est survenue lors de l'envoi.";
          console.error(err);
          this.cdr.detectChanges();
        }
      });
    } catch (err) {
      console.error("Geocoding error", err);
      this.reclamationError = "Erreur de géocodage du quartier.";
      this.cdr.detectChanges();
    }
  }
}