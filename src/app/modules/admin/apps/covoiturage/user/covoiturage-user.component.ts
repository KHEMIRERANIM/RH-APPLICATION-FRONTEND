import { Component, OnInit, AfterViewInit, OnDestroy, ElementRef, Renderer2, ViewChild, ChangeDetectorRef, NgZone, ApplicationRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CovoiturageService, Vehicule, Trajet } from '../covoiturage.service';

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
  backendTrajets: Trajet[] = []; // Liste des trajets retournée par le backend

  // Vehicle Modal State
  showVehicleModal: boolean = false;

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
    this.covoiturageService.getTrajetsProposesByEmploye(this.employeId).subscribe({
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
        heureDepart: formValues.heureDepart + ':00', // Ajout secondes pour LocalDateTime au format ISO/LocalTime
        joursDisponibles: jours,
        placesDisponibles: formValues.placesDisponibles,
        placesRestantes: formValues.placesDisponibles,
        statut: 'ACTIF'
    };
    
    this.covoiturageService.creerTrajet(newTrajet).subscribe({
        next: () => {
          this.loadTrajets();
          this.trajetForm.reset({ categorie: 'COVOITURAGE', vehiculeId: '' });
          this.selectedDays = ["Lun", "Mar", "Mer", "Jeu", "Ven"]; // Reset days
          this.cdr.detectChanges();
        },
        error: (err) => console.error("Erreur publication trajet", err)
    });
  }

  // --- Modal Vehicle Methods ---

  openVehicleModal() {
    this.showVehicleModal = true;
  }

  closeVehicleModal() {
    this.showVehicleModal = false;
  }

  onAddVehicle(vehicle: Vehicule) {
    if (!this.employeId) return;
    vehicle.employeId = this.employeId;
    this.covoiturageService.creerVehicule(vehicle).subscribe({
      next: () => {
        this.loadVehicules();
      },
      error: (err) => console.error("Erreur création véhicule", err)
    });
  }

  onUpdateVehicle(event: {id: string, vehicle: Partial<Vehicule>}) {
    if (!this.employeId) return;
    event.vehicle.employeId = this.employeId;
    this.covoiturageService.updateVehicule(event.id, event.vehicle).subscribe({
      next: () => {
        this.loadVehicules();
      },
      error: (err) => console.error("Erreur mise à jour véhicule", err)
    });
  }

  onDeleteVehicle(id: string) {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce véhicule ?")) return;
    this.covoiturageService.deleteVehicule(id).subscribe({
      next: () => {
        this.loadVehicules();
      },
      error: (err) => console.error("Erreur suppression véhicule", err)
    });
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
    }, 400); // Wait for css transition
  }

  // Obtenir l'adresse depuis les coordonnées (Nominatim API)
  async getAddressFromCoords(lat: number, lng: number): Promise<string> {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
      const data = await response.json();
      if (data && data.display_name) {
        // Garder juste les 3 premières parties ("Rue, Quartier, Ville")
        const parts = data.display_name.split(', ');
        return parts.slice(0, 3).join(', ');
      }
      return `${lat.toFixed(5)}, ${lng.toFixed(5)}`; // Fallback
    } catch {
      return `${lat.toFixed(5)}, ${lng.toFixed(5)}`; // Fallback
    }
  }

  private initLeaflet() {
    if (typeof L !== 'undefined') {
      this.initMap();
      return;
    }

    // Charger CSS Leaflet
    const link = this.renderer.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    this.renderer.appendChild(document.head, link);

    // Charger JS Leaflet
    const script = this.renderer.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => {
      this.initMap();
    };
    this.renderer.appendChild(document.body, script);
  }

  private initMap() {
    if (!this.mapDiv) return;
    if (this.map) return; // Éviter la double instanciation

    this.map = L.map(this.mapDiv.nativeElement).setView([36.8065, 10.1815], 12); // Tunis par défaut

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    // Positionnement actuel
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

    // Gestion des clics pour définir Départ et Arrivée
    this.map.on('click', (e: any) => {
      this.ngZone.run(() => {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;

      if (!this.departureMarker) {
        // Premier clic : Départ
        this.departureLocation = "Recherche de l'adresse...";
        this.cdr.detectChanges(); // Forcer maj car on est hors de la zone Angular avec Leaflet callback
        
        const customIcon = L.divIcon({
          className: 'custom-icon',
          html: `<div style="background-color: #1D9E75; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.4);"></div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });
        this.departureMarker = L.marker([lat, lng], {icon: customIcon}).addTo(this.map).bindPopup("Départ").openPopup();
        
          // Reverse Geocoding
          this.getAddressFromCoords(lat, lng).then(addr => {
            this.ngZone.run(() => {
              this.departureLocation = addr;
            });
          });
          
        } else if (!this.destinationMarker) {
        // Deuxième clic : Destination
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
        
        // Calcul de secours (ligne droite) immédiatement au cas où l'API OSRM prend du temps
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
          setTimeout(() => this.appRef.tick(), 10); // Force global update
        });

        // Requête OSRM pour un vrai itinéraire
        fetch(`https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${lng},${lat}?overview=full&geometries=geojson`)
          .then(res => res.json())
          .then(data => {
            if (data.routes && data.routes.length > 0) {
              const route = data.routes[0];
              const coords = route.geometry.coordinates.map((c: any) => [c[1], c[0]]);
              
              this.ngZone.run(() => {
                // Tracer la vraie route (alignée sur les rues)
                this.polyline = L.polyline(coords, {
                  color: '#3B82F6', // Bleu style Google Maps
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

                // Bulle (Tooltip) au centre de la route "comme un vrai map"
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

          // Reverse Geocoding
          this.getAddressFromCoords(lat, lng).then(addr => {
            this.ngZone.run(() => {
              this.destinationLocation = addr;
            });
          });

        } else {
        // Troisième clic : Réinitialiser et placer nouveau Départ
        this.map.removeLayer(this.departureMarker);
        this.map.removeLayer(this.destinationMarker);
        if (this.polyline) {
          this.map.removeLayer(this.polyline);
        }
        if (this.routeTooltip) {
          this.map.removeLayer(this.routeTooltip);
        }

        // Réinitialiser stats
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

    // Fix pour les tiles gris dans un onglet invisible au début
    setTimeout(() => {
      this.map.invalidateSize();
    }, 400);
  }
}