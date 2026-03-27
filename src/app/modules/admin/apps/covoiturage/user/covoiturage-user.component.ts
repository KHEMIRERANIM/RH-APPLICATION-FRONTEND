import { Component, OnInit, AfterViewInit, OnDestroy, ElementRef, Renderer2, ViewChild, ChangeDetectorRef, NgZone, ApplicationRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CovoiturageService, Vehicule, Trajet, ReservationResponse, ReservationRequest } from '../covoiturage.service';

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

  myShuttleReservations = [
    {
      id: 1,
      shuttleName: 'Navette Ligne A',
      route: 'Gare Centrale → Siège Social',
      departureTime: '07:30',
      arrivalTime: '08:00',
      days: ['L', 'M', 'Me', 'J', 'V'],
      busNumber: 'BUS-101'
    },
    {
      id: 2,
      shuttleName: 'Navette Zone Industrielle',
      route: 'Métro Ligne 1 → Zone Industrielle',
      departureTime: '08:15',
      arrivalTime: '08:45',
      days: ['L', 'M', 'Me', 'J', 'V'],
      busNumber: 'BUS-205'
    }
  ];

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
  activeSection: 'utilises' | 'proposes' = 'utilises';
  showGiftModal = false;

  // Map États et Statistiques
  departureLocation: string = '';
  destinationLocation: string = '';
  routeDistance: string = '-';
  routeDuration: string = '-';
  routeCo2: string = '-';
  isMapExpanded: boolean = false;

  // Mode de saisie (Carte / Manuel)
  inputMode: 'map' | 'manual' = 'map';
  manualDeparture: string = '';
  manualDestination: string = '';

  // Recherche
  searchQuery: string = '';
  searchSuggestions: any[] = [];
  searchMarker: any;
  private searchTimeout: any;

  private map: any;
  private departureMarker: any;
  private destinationMarker: any;
  private currentLocationMarker: any;
  private polyline: any;
  private routeTooltip: any;

  // Gestion Backend
  trajetForm: FormGroup;
  vehicules: Vehicule[] = [];
  employeId: string = '';
  backendTrajets: Trajet[] = [];

  // Vehicle Modal State
  showVehicleModal: boolean = false;
  allTrajets: Trajet[] = [];
  mesReservations: ReservationResponse[] = [];
  totalPointsEco: number = 0;
  reservationEnCours: boolean = false;

  @ViewChild('mapElement', { static: false }) mapDiv!: ElementRef;

  constructor(
    private renderer: Renderer2, 
    private cdr: ChangeDetectorRef, 
    private ngZone: NgZone, 
    private appRef: ApplicationRef,
    private fb: FormBuilder,
    private covoiturageService: CovoiturageService
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
           this.loadVehicules();
           this.loadTrajets();
           this.loadAllTrajets();
           this.loadMesReservations();
           this.loadTotalPoints();
       } catch (e) {
           console.error("Erreur parsing currentUser", e);
       }
    }
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
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Erreur chargement tous les trajets', err)
    });
  }

  loadMesReservations(): void {
    if (!this.employeId) return;
    this.covoiturageService.getReservationsByEmploye(this.employeId).subscribe({
      next: (res) => { this.mesReservations = res; this.cdr.detectChanges(); },
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

  reserverTrajet(trajetId: string): void {
    if (!this.employeId || this.reservationEnCours) return;
    if (this.estDejaReserve(trajetId)) return;
    this.reservationEnCours = true;
    const request: ReservationRequest = { trajetId, employeId: this.employeId, statut: 'EN_ATTENTE' };
    this.covoiturageService.creerReservation(request).subscribe({
      next: () => {
        this.reservationEnCours = false;
        this.loadMesReservations();
        this.loadTotalPoints();
        this.loadAllTrajets();
      },
      error: (err) => { this.reservationEnCours = false; console.error('Erreur réservation', err); }
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
    return this.mesReservations.some(r => r.trajetId === trajetId && r.statut !== 'ANNULEE');
  }

  deleteTrajet(id?: string): void {
    if (!id) return;
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce trajet ?')) return;
    this.covoiturageService.deleteTrajet(id).subscribe({
      next: () => this.loadTrajets(),
      error: (err) => console.error('Erreur suppression trajet', err)
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
        switch(error.code) {
          case error.PERMISSION_DENIED: message = 'Permission refusée'; break;
          case error.POSITION_UNAVAILABLE: message = 'Position non disponible'; break;
          case error.TIMEOUT: message = 'Délai dépassé'; break;
        }
        alert(message);
      }
    );
  }

  rechercherCovoitureurs() {
    const depart = this.inputMode === 'map' ? this.departureLocation : this.manualDeparture;
    const arrivee = this.inputMode === 'map' ? this.destinationLocation : this.manualDestination;
    
    if (!depart || !arrivee) {
      alert('Veuillez renseigner le départ et la destination');
      return;
    }
    
    const trajetsFiltres = this.allTrajets.filter(trajet => {
      const joursTrajet = trajet.joursDisponibles.split(',');
      const joursMatch = this.selectedDays.some(j => joursTrajet.includes(j));
      const departMatch = trajet.adresseDepart.toLowerCase().includes(depart.toLowerCase()) || 
                          depart.toLowerCase().includes(trajet.adresseDepart.toLowerCase());
      const arriveeMatch = trajet.adresseArrivee.toLowerCase().includes(arrivee.toLowerCase()) || 
                           arrivee.toLowerCase().includes(trajet.adresseArrivee.toLowerCase());
      return joursMatch && (departMatch || arriveeMatch);
    });
    
    if (trajetsFiltres.length === 0) {
      alert('Aucun covoiturage trouvé pour ces critères.');
    } else {
      alert(`${trajetsFiltres.length} covoiturage(s) trouvé(s) !`);
      this.allTrajets = trajetsFiltres;
      this.cdr.detectChanges();
    }
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
  }

  switchSection(section: 'utilises' | 'proposes') {
    this.activeSection = section;
    if (section === 'utilises') {
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
          this.departureMarker = L.marker([lat, lng], {icon: customIcon}).addTo(this.map).bindPopup("Départ").openPopup();
          
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
          this.destinationMarker = L.marker([lat, lng], {icon: customIcon}).addTo(this.map).bindPopup("Arrivée").openPopup();
          
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
          this.departureMarker = L.marker([lat, lng], {icon: customIcon}).addTo(this.map).bindPopup("Départ").openPopup();
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
}