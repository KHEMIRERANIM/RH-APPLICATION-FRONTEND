import { Component, AfterViewInit, OnDestroy, ElementRef, Renderer2, ViewChild, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Leaflet loaded via CDN
declare var L: any;

@Component({
  selector: 'app-covoiturage-user',
  standalone: false,
  templateUrl: './covoiturage-user.component.html',
})
export class CovoiturageUserComponent implements AfterViewInit, OnDestroy {

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

  @ViewChild('mapElement', { static: false }) mapDiv!: ElementRef;

  constructor(private renderer: Renderer2, private cdr: ChangeDetectorRef, private ngZone: NgZone) {}

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
        
        // Tracer la route (ligne)
        this.polyline = L.polyline([this.departureMarker.getLatLng(), this.destinationMarker.getLatLng()], {
          color: '#0F3460',
          weight: 4,
          opacity: 0.7,
          dashArray: '10, 10'
        }).addTo(this.map);
        
        // Ajuster la caméra pour montrer les deux points
        this.map.fitBounds(this.polyline.getBounds(), { padding: [50, 50] });

        // Calculer Distance, Durée, CO2
        const distanceMts = this.departureMarker.getLatLng().distanceTo(this.destinationMarker.getLatLng());
        const distanceKm = distanceMts / 1000;
        const durationMn = Math.round((distanceKm / 40) * 60); // Assuming 40km/h avg speed city
        const co2Saved = distanceKm * 0.12; // 120g/km avg car emissions
        
          this.routeDistance = distanceKm.toFixed(1) + ' km';
          this.routeDuration = durationMn.toString() + ' min';
          this.routeCo2 = co2Saved.toFixed(2) + ' kg';

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