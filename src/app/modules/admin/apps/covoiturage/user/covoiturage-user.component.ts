import { Component, OnInit, AfterViewInit, OnDestroy, ElementRef, Renderer2, ViewChild, ChangeDetectorRef, NgZone, ApplicationRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CovoiturageService, Vehicule, Trajet, ReservationResponse, ReservationRequest } from '../covoiturage.service';
import { UserService, Employee } from '../../../../../services/user.service';

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
navetteTrackingId: string = ''; // ← AJOUTE ICI

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
  activeSection: 'utilises' | 'proposes' | 'recompenses' = 'utilises';
  showGiftModal = false;


  // Map États et Statistiques
  departureLocation: string = '';
  destinationLocation: string = '';
  routeDistance: string = '-';
  routeDuration: string = '-';
  routeCo2: string = '-';
  isMapExpanded: boolean = false;
  // Ajoutez avec les autres variables (vers ligne 100 environ)
shuttles: any[] = [];
isLoadingShuttles = false;
shuttleError = '';
shuttleSearchTerm = '';
shuttleFilterDepart: string = '';
shuttleFilterArrivee: string = '';
shuttleFilterHeure: string = '';
selectedNavetteDays: { [shuttleId: string]: string[] } = {};

get shuttleDeparts(): string[] {
  return [...new Set(this.shuttles.map(s => s.adresseDepart).filter(Boolean))];
}

get shuttleArrivees(): string[] {
  return [...new Set(this.shuttles.map(s => s.adresseArrivee).filter(Boolean))];
}

  // Mode de saisie (Carte / Manuel)
  inputMode: 'map' | 'manual' = 'map';
  manualDeparture: string = '';
  manualDestination: string = '';

  // Recherche
  searchQuery: string = '';
  searchTime: string = '';
  searchSuggestions: any[] = [];

  private searchTimeout: any;

  pubSearchQuery: string = '';
  pubSearchSuggestions: any[] = [];
  private pubSearchTimeout: any;

  @ViewChild('mapElement') mapDiv!: ElementRef;
  @ViewChild('publishMapElement') publishMapDiv!: ElementRef;

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
  displayedTrajets: Trajet[] = [];
  mesReservations: ReservationResponse[] = [];
  totalPointsEco: number = 0;
  reservationEnCours: boolean = false;

  // Cache employés
  employesMap: Map<string, string> = new Map();

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
  // ---------------------------------------------

  constructor(
    private renderer: Renderer2,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private appRef: ApplicationRef,
    private fb: FormBuilder,
    private covoiturageService: CovoiturageService,
    private userService: UserService
  ) {
    this.trajetForm = this.fb.group({
      vehiculeId: ['', Validators.required],
      categorie: ['COVOITURAGE', Validators.required],
      adresseDepart: ['', Validators.required],
      adresseArrivee: ['', Validators.required],
      heureDepart: ['', Validators.required],
      placesDisponibles: ['', Validators.required],
    });
  }

  ngOnInit() {
    const localUserStr = localStorage.getItem('currentUser');
    if (localUserStr) {
      try {
        const localUser = JSON.parse(localUserStr);
        this.employeId = localUser.id;
        this.loadEmployees();
        this.loadVehicules();
        this.loadTrajets();
        this.loadAllTrajets();
        this.loadMesReservations();
        this.loadTotalPoints();
          this.loadShuttles();           // <--- AJOUTE ICI
      this.loadMyShuttleReservations(); // <--- AJOUTE ICI
      } catch (e) {
        console.error("Erreur parsing currentUser", e);
      }
    }
  }
loadEmployees(): void {
  this.userService.getAllEmployees().subscribe({
    next: (users) => {
      users.forEach((user: any) => {
        this.employesMap.set(
          String(user.id),
          `${user.prenom || ''} ${user.nom || ''}`.trim()
        );
      });
      this.cdr.detectChanges();
    },
    error: (err) => console.error("Erreur", err)
  });
}
  getEmployeeName(id: string): string {
    return this.employesMap.get(String(id)) || `Employé Inconnu`;
  }

  getTrajetInfo(trajetId: string | undefined): Trajet | undefined {
    if (!trajetId) return undefined;
    return this.allTrajets.find(t => t.id === trajetId);
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
        this.backendTrajets = res;
        this.backendTrajets.forEach(trajet => {
          if (trajet.id) {
            this.covoiturageService.getReservationsByTrajet(trajet.id).subscribe({
              next: (reserves) => {
                trajet.reservations = reserves.filter(r => r.statut !== 'ANNULE');
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
      alert(errorMsg);
      return;
    }

    const formValues = this.trajetForm.value;
    const jours = this.selectedDays.join(', ');

    const newTrajet: Trajet = {
      employeId: this.employeId,
      vehiculeId: formValues.vehiculeId,
      categorie: formValues.categorie,
      adresseDepart: formValues.adresseDepart,
      adresseArrivee: formValues.adresseArrivee,
      heureDepart: formValues.heureDepart + ':00',
      joursDisponibles: jours,
      placesDisponibles: formValues.placesDisponibles,
      placesRestantes: formValues.placesDisponibles,
      statut: 'ACTIF'
    };

    this.covoiturageService.creerTrajet(newTrajet).subscribe({
      next: () => {
        this.loadTrajets();
        this.trajetForm.reset({ categorie: 'COVOITURAGE', vehiculeId: '' });
        this.selectedDays = ["Lun", "Mar", "Mer", "Jeu", "Ven"];

        // Reset map markers
        if (this.publishMap) {
          if (this.pubDepMarker) this.publishMap.removeLayer(this.pubDepMarker);
          if (this.pubDestMarker) this.publishMap.removeLayer(this.pubDestMarker);
          this.pubDepMarker = null;
          this.pubDestMarker = null;
        }

        this.cdr.detectChanges();
      },
      error: (err) => console.error("Erreur publication trajet", err)
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
      this.allTrajets = res.filter(t => t.statut === 'ACTIF');
      this.displayedTrajets = [...this.allTrajets];
      console.log('TRAJET employeId:', this.allTrajets[0]?.employeId);
      console.log('MAP complète:', JSON.stringify([...this.employesMap]));
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
        this.loadTotalPoints(); // ← ajouter
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Erreur chargement réservations', err)
    });
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
  if (this.estDejaReserve(trajetId)) return;
  this.reservationEnCours = true;

  const trajet = this.allTrajets.find(t => t.id === trajetId);
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
      this.loadMesReservations();
      this.loadTotalPoints();
      this.loadAllTrajets();
    },
    error: (err) => {
      this.reservationEnCours = false;
      console.error('Erreur réservation', err);
    }
  });
}

  annulerReservation(reservationId: string): void {
    if (!confirm('Annuler cette réservation ?')) return;
    this.covoiturageService.annulerReservation(reservationId).subscribe({
      next: () => { this.loadMesReservations(); this.loadTotalPoints(); this.loadAllTrajets(); },
      error: (err) => console.error('Erreur annulation', err)
    });
  }

  estDejaReserve(trajetId: string): boolean {
    return this.mesReservations.some(r => r.trajetId === trajetId && r.statut !== 'ANNULE');
  }
  deleteTrajet(id?: string): void {
    if (!id) return;
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce trajet ?')) return;
    this.covoiturageService.deleteTrajet(id).subscribe({
      next: () => this.loadTrajets(),
      error: (err) => console.error('Erreur suppression trajet', err)
    });
  }
  loadMyShuttleReservations() {
  if (!this.employeId) return;
  this.covoiturageService.getReservationsNavetteByEmploye(this.employeId).subscribe({
    next: (data) => {
      this.myShuttleReservations = data;
      this.cdr.detectChanges();
    },
    error: (err) => console.error('Erreur', err)
  });
}







  loadShuttles() {
  this.isLoadingShuttles = true;
  this.covoiturageService.getShuttles().subscribe({
    next: (data) => {
      this.shuttles = data;
      this.isLoadingShuttles = false;
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
  return this.shuttles.filter(s => {
    const matchSearch = !this.shuttleSearchTerm ||
      s.ligne?.toLowerCase().includes(this.shuttleSearchTerm.toLowerCase()) ||
      s.marque?.toLowerCase().includes(this.shuttleSearchTerm.toLowerCase()) ||
      s.immatriculation?.toLowerCase().includes(this.shuttleSearchTerm.toLowerCase());

    const matchDepart = !this.shuttleFilterDepart ||
      s.adresseDepart === this.shuttleFilterDepart;

    const matchArrivee = !this.shuttleFilterArrivee ||
      s.adresseArrivee === this.shuttleFilterArrivee;

    const matchHeure = !this.shuttleFilterHeure ||
      s.heureDepart?.startsWith(this.shuttleFilterHeure);

    return matchSearch && matchDepart && matchArrivee && matchHeure;
  });
}

rechercherNavettes() {
  this.cdr.detectChanges();
}

estDejaReserveNavette(shuttleId: string): boolean {
  return this.myShuttleReservations.some(r => r.shuttleId === shuttleId);
}

reserverNavette(shuttle: any) {
 const jours = this.selectedNavetteDays[shuttle.id] || [];
if (jours.length === 0) {
  alert('Veuillez sélectionner au moins un jour pour cette navette.');
  return;
}
const joursSelectionnes = jours.join(',');

  const reservation = {
    busId: shuttle.id,          // ← "busId" pas "shuttleId" (correspond au backend)
    employeId: this.employeId,
    joursSelectionnes: joursSelectionnes,
    statut: 'EN_ATTENTE'
  };

  this.covoiturageService.reserverNavette(reservation).subscribe({
    next: (res: any) => {
      this.loadMyShuttleReservations();  // recharger depuis le backend
      this.loadShuttles();               // mettre à jour les places restantes
this.selectedNavetteDays[shuttle.id] = [];      alert('Réservation effectuée avec succès !');
      this.cdr.detectChanges();
    },
    error: (err) => {
      console.error('Erreur réservation', err);
      alert('Erreur lors de la réservation : ' + (err.error?.message || err.message));
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
  if (!confirm('Annuler cette réservation ?')) return;
  
  this.covoiturageService.annulerReservationNavette(reservationId).subscribe({
    next: () => {
      this.myShuttleReservations = this.myShuttleReservations.filter(r => r.id !== reservationId);
      alert('Réservation annulée');
      this.cdr.detectChanges();
    },
    error: (err) => {
      console.error('Erreur annulation', err);
      alert('Erreur lors de l\'annulation');
    }
  });
}

  // Méthodes pour la saisie manuelle
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

  // Méthodes de recherche sur carte
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
        alert('Aucun lieu trouvé pour "' + this.searchQuery + '"');
      }
    } catch (error) {
      console.error('Erreur recherche:', error);
      alert('Erreur lors de la recherche');
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
          <div style="background-color: #3B82F6; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>
          <div style="position: absolute; top: 20px; left: 50%; transform: translateX(-50%); white-space: nowrap; background: white; padding: 4px 8px; border-radius: 8px; font-size: 12px; font-weight: 600; color: #1A1A2E; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            ${nomLieu}
          </div>
        </div>
      `,
      iconSize: [40, 50],
      iconAnchor: [20, 40]
    });

    this.searchMarker = L.marker([lat, lng], { icon: searchIcon }).addTo(this.map);
    this.searchSuggestions = [];
    this.searchQuery = nomLieu;
  }

  centerOnMyLocation() {
    if (!navigator.geolocation) {
      alert('Géolocalisation non supportée');
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
        alert(message);
      }
    );
  }

  // ------ PUBLISH MAP SEARCH & EXPAND LOGIC ------
  togglePubMapSize() {
    this.isPubMapExpanded = !this.isPubMapExpanded;
    setTimeout(() => {
      if (this.publishMap) {
        this.publishMap.invalidateSize();
      }
    }, 400);
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
      } else {
        alert('Aucun lieu trouvé pour "' + this.pubSearchQuery + '"');
      }
    } catch (error) {
      console.error('Erreur recherche:', error);
      alert('Erreur lors de la recherche');
    }
  }

  selectPubSuggestion(lieu: any) {
    const lat = parseFloat(lieu.lat);
    const lng = parseFloat(lieu.lon);
    const nomLieu = lieu.display_name.split(',')[0];

    this.publishMap.setView([lat, lng], 15);

    // Instead of using a dedicated search marker, we directly trigger the map click logic
    // to place the Dep/Dest markers exactly as if the user clicked on the map.
    this.publishMap.fire('click', { latlng: L.latLng(lat, lng) });

    this.pubSearchSuggestions = [];
    this.pubSearchQuery = nomLieu;
  }
  // ------------------------------------------------

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
    const depart = this.inputMode === 'map' ? this.departureLocation : this.manualDeparture;
    const arrivee = this.inputMode === 'map' ? this.destinationLocation : this.manualDestination;

    if (!depart || !arrivee) {
      alert('Veuillez renseigner le départ et la destination pour rechercher.');
      return;
    }

    const trajetsFiltres = this.allTrajets.filter(trajet => {
      const joursTrajet = trajet.joursDisponibles.split(',');
      const joursMatch = this.selectedDays.some(j => aIncludeB(joursTrajet, j));
      const departMatch = trajet.adresseDepart.toLowerCase().includes(depart.toLowerCase()) ||
        depart.toLowerCase().includes(trajet.adresseDepart.toLowerCase());
      const arriveeMatch = trajet.adresseArrivee.toLowerCase().includes(arrivee.toLowerCase()) ||
        arrivee.toLowerCase().includes(trajet.adresseArrivee.toLowerCase());

      let timeMatch = true;
      if (this.searchTime) {
        timeMatch = trajet.heureDepart.startsWith(this.searchTime);
      }

      return joursMatch && (departMatch || arriveeMatch) && timeMatch;
    });

    // Helper function for array inclusion using trim
    function aIncludeB(arr: string[], val: string) {
      return arr.some(a => a.trim().toLowerCase() === val.trim().toLowerCase());
    }

    if (trajetsFiltres.length === 0) {
      alert('Aucun covoiturage trouvé pour ces critères.');
      this.displayedTrajets = [];
    } else {
      alert(`${trajetsFiltres.length} covoiturage(s) trouvé(s) !`);
      this.displayedTrajets = trajetsFiltres;
    }
    this.cdr.detectChanges();
  }

  ngAfterViewInit() {
    if (this.activeSection === 'utilises') {
      setTimeout(() => this.initLeaflet(), 100);
    }
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
    }
    if (this.publishMap) {
      this.publishMap.remove();
    }
  }

  switchSection(section: 'utilises' | 'proposes' | 'recompenses') {
    this.activeSection = section;
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

  private initLeaflet() {
    if (typeof L !== 'undefined') {
      this.initMap();
      this.initPublishMap();
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
        }
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
          });

          // Fit Bounds
          const group = new L.featureGroup([this.pubDepMarker, this.pubDestMarker]);
          this.publishMap.fitBounds(group.getBounds(), { padding: [50, 50] });

        } else {
          // Reset
          this.publishMap.removeLayer(this.pubDepMarker);
          this.publishMap.removeLayer(this.pubDestMarker);

          this.trajetForm.get('adresseDepart')?.setValue("Recherche...");
          this.trajetForm.get('adresseArrivee')?.setValue('');
          this.cdr.detectChanges();

          const customIcon = L.divIcon({
            className: 'custom-icon',
            html: `<div style="background-color: #1D9E75; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.4);"></div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          });
          this.pubDepMarker = L.marker([lat, lng], { icon: customIcon }).addTo(this.publishMap).bindPopup("Départ").openPopup();
          this.pubDestMarker = null;

          this.getAddressFromCoords(lat, lng).then(addr => {
            this.ngZone.run(() => {
              this.trajetForm.get('adresseDepart')?.setValue(addr);
              this.cdr.detectChanges();
            });
          });
        }
      });
    });
  }

  
  
}