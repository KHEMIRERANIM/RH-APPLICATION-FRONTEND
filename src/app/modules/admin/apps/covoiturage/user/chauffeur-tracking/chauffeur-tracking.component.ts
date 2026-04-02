import { Component, OnInit, OnDestroy, AfterViewInit, ChangeDetectorRef, Input, ViewChild, ElementRef } from '@angular/core';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { CovoiturageService } from '../../covoiturage.service';
import { getWsTrackingSockJsUrl } from 'src/environments/environment';

declare var L: any;

@Component({
  selector: 'app-chauffeur-tracking',
  templateUrl: './chauffeur-tracking.component.html',
  styleUrl: './chauffeur-tracking.component.scss',
  standalone: false
})
export class ChauffeurTrackingComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() preselectedVehiculeId: string = '';
  @ViewChild('chauffeurMap') chauffeurMapDiv!: ElementRef;

  private stompClient!: Client;
  private watchId: any;
  private simInterval: any;
  private chauffeurMap: any;
  private chauffeurMarker: any;

  private trajetsSimule: { lat: number, lng: number }[] = [
    { lat: 36.8900, lng: 10.1600 },
    { lat: 36.8800, lng: 10.1650 },
    { lat: 36.8700, lng: 10.1680 },
    { lat: 36.8600, lng: 10.1700 },
    { lat: 36.8500, lng: 10.1720 },
    { lat: 36.8400, lng: 10.1740 },
    { lat: 36.8300, lng: 10.1760 },
    { lat: 36.8200, lng: 10.1780 },
    { lat: 36.8150, lng: 10.1800 },
    { lat: 36.8065, lng: 10.1815 }
  ];

  statut: string = 'Arrêté';
  enRoute: boolean = false;
  positionActuelle: string = '';
  private lastLat: number | null = null;
  private lastLng: number | null = null;
  vehiculeId: string = '';
  connecte: boolean = false;
  nbPositionsEnvoyees: number = 0;
  trajetsActifs: any[] = [];

  // ETA / distance (comme sur la carte passager)
  tempsRestant: string = 'Calcul...';
  distance: string = '-';
  progression: number = 0;

  private arretLat: number | null = null;
  private arretLng: number | null = null;
  private libelleArret: string = 'Votre arrêt';
  private arretCacheVehiculeId: string = '';
  private etaInFlight: boolean = false;
  private lastEtaUpdateTs: number = 0;
  private notifEnvoyees: Set<string> = new Set();

  constructor(
    private cdr: ChangeDetectorRef,
    private covoiturageService: CovoiturageService
  ) {}

  ngOnInit() {
    this.chargerTrajets();
  }

  ngAfterViewInit() {
    setTimeout(() => this.initChauffeurMap(), 300);
  }

  initChauffeurMap() {
    if (!this.chauffeurMapDiv?.nativeElement) return;
    if (this.chauffeurMap) return;

    this.chauffeurMap = L.map(this.chauffeurMapDiv.nativeElement).setView([36.8500, 10.1700], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(this.chauffeurMap);

    // Trajet simulé en gris
    const points = this.trajetsSimule.map(p => [p.lat, p.lng]);
    L.polyline(points, { color: '#D1D5DB', weight: 4, dashArray: '8 6' }).addTo(this.chauffeurMap);
    this.chauffeurMap.fitBounds(points as any, { padding: [30, 30] });

    // Afficher votre position dès l'ouverture de la carte (même avant démarrage)
    this.afficherMaPositionActuelle(false);
  }

  /** Affiche votre position sur la carte (sans démarrer le trajet). */
  afficherMaPositionActuelle(centerMap: boolean = true) {
    if (!navigator.geolocation || !this.chauffeurMap) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        this.lastLat = lat;
        this.lastLng = lng;
        this.positionActuelle = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        this.updateChauffeurPosition(lat, lng, centerMap);

        if (!this.enRoute) {
          this.statut = this.connecte
            ? 'Serveur connecté — prêt à démarrer'
            : 'GPS prêt (serveur non joignable)';
        }
        this.cdr.detectChanges();
      },
      () => {
        // silently ignore if GPS denied
      },
      //{ enableHighAccuracy: true, maximumAge: 60000, timeout: 15000 }
      { enableHighAccuracy: false, maximumAge: Infinity, timeout: 15000 }
    );
  }

  /** Ouvre Google Maps sur vos coordonnées (pour partager via Google Maps). */
  ouvrirGoogleMapsSurMaPosition() {
    if (this.lastLat === null || this.lastLng === null) {
      alert('Actualisez votre position GPS d’abord.');
      return;
    }
    const url = `https://www.google.com/maps?q=${this.lastLat},${this.lastLng}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  updateChauffeurPosition(lat: number, lng: number, centerMap: boolean = true) {
    if (!this.chauffeurMap) return;

    const icon = L.divIcon({
      html: `<div style="font-size:28px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3))">🚗</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });

    if (this.chauffeurMarker) {
      this.chauffeurMarker.setLatLng([lat, lng]);
    } else {
      this.chauffeurMarker = L.marker([lat, lng], { icon }).addTo(this.chauffeurMap);
    }
    if (centerMap) {
      this.chauffeurMap.setView([lat, lng], 15);
    }
  }

  chargerTrajets() {
    this.covoiturageService.getAllTrajets().subscribe(trajets => {
      this.trajetsActifs = trajets.filter(t => t.statut === 'ACTIF');
      if (this.preselectedVehiculeId && this.trajetsActifs.some(t => t.vehiculeId === this.preselectedVehiculeId)) {
        this.vehiculeId = this.preselectedVehiculeId;
      } else if (this.trajetsActifs.length > 0) {
        this.vehiculeId = this.trajetsActifs[this.trajetsActifs.length - 1].vehiculeId;
      } else {
        this.vehiculeId = 'navette-test-001';
      }
      // Prépare les coordonnées du point d'arrivée (pour ETA)
      this.chargerArretPourVehicule();
      this.connecterWebSocket();
    });
  }

  private async chargerArretPourVehicule(): Promise<void> {
    if (!this.vehiculeId || this.arretCacheVehiculeId === this.vehiculeId) return;
    this.arretCacheVehiculeId = this.vehiculeId;
    this.notifEnvoyees.clear();
    this.tempsRestant = 'Calcul...';
    this.distance = '-';
    this.progression = 0;

    const trajet = this.trajetsActifs.find(t => t.vehiculeId === this.vehiculeId);
    const adresseArrivee = (trajet?.adresseArrivee || '').trim();
    if (!adresseArrivee) return;

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(adresseArrivee)}&limit=1&countrycodes=tn&accept-language=fr`
      );
      const data = await res.json();
      if (data?.[0]) {
        this.arretLat = parseFloat(data[0].lat);
        this.arretLng = parseFloat(data[0].lon);
        this.libelleArret = adresseArrivee.split(',')[0]?.trim() || 'Votre arrêt';
      }
    } catch {
      // garde les valeurs par défaut
    }
  }

  connecterWebSocket() {
    if (this.stompClient) {
      this.stompClient.deactivate();
    }
    const wsUrl = getWsTrackingSockJsUrl();
    const token = localStorage.getItem('accessToken');
    const sockJsUrl = token
      ? `${wsUrl}${wsUrl.includes('?') ? '&' : '?'}access_token=${encodeURIComponent(token)}`
      : wsUrl;

    this.stompClient = new Client({
      webSocketFactory: () => new SockJS(sockJsUrl),
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      reconnectDelay: 4000,
      onConnect: () => {
        this.connecte = true;
        if (!this.enRoute) {
          this.statut = 'Connecté — prêt à démarrer';
        }
        this.cdr.detectChanges();
      },
      onDisconnect: () => {
        this.connecte = false;
        if (!this.enRoute) {
          this.statut = 'GPS prêt (serveur non joignable)';
        }
        this.cdr.detectChanges();
      }
    });
    this.stompClient.activate();
  }

  demarrerTrajet() {
    if (!navigator.geolocation) {
      alert('GPS non supporté sur cet appareil');
      return;
    }
    this.enRoute = true;
    this.statut = 'En route 🟢';
    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        this.lastLat = lat;
        this.lastLng = lng;
        this.positionActuelle = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        this.updateChauffeurPosition(lat, lng, true);

        // Calcul ETA / messages (throttle)
        this.updateEtaEtMessages(lat, lng);

        if (this.stompClient?.connected) {
          this.stompClient.publish({
            destination: `/app/position/${this.vehiculeId}`,
            body: JSON.stringify({ vehiculeId: this.vehiculeId, latitude: lat, longitude: lng })
          });
          this.nbPositionsEnvoyees++;
        }
        this.cdr.detectChanges();
      },
      (error) => {
        this.statut = 'Erreur GPS ❌';
        this.enRoute = false;
        this.cdr.detectChanges();
      },
      //{ enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
      { enableHighAccuracy: false, maximumAge: Infinity, timeout: 10000 }
    );
  }

  demarrerSimulation() {
    this.enRoute = true;
    this.statut = 'Simulation en cours 🟢';
    let etape = 0;
    this.simInterval = setInterval(() => {
      if (etape >= this.trajetsSimule.length) {
        clearInterval(this.simInterval);
        this.arreterTrajet();
        return;
      }
      const point = this.trajetsSimule[etape];
      this.lastLat = point.lat;
      this.lastLng = point.lng;
      this.positionActuelle = `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`;
      this.updateChauffeurPosition(point.lat, point.lng, true);

      // ETA / messages sur démo
      this.updateEtaEtMessages(point.lat, point.lng);

      if (this.stompClient?.connected) {
        this.stompClient.publish({
          destination: `/app/position/${this.vehiculeId}`,
          body: JSON.stringify({ vehiculeId: this.vehiculeId, latitude: point.lat, longitude: point.lng })
        });
        this.nbPositionsEnvoyees++;
      }
      etape++;
      this.cdr.detectChanges();
    }, 2500);
  }

  private async updateEtaEtMessages(navLat: number, navLng: number): Promise<void> {
    if (!this.arretLat || !this.arretLng) return;
    const now = Date.now();
    if (this.etaInFlight) return;
    if (now - this.lastEtaUpdateTs < 10000) return; // throttle (10s)
    this.lastEtaUpdateTs = now;
    this.etaInFlight = true;

    try {
      const res = await fetch(
        `https://router.project-osrm.org/route/v1/driving/` +
        `${navLng},${navLat};${this.arretLng},${this.arretLat}` +
        `?overview=false`
      );
      const data = await res.json();

      if (data?.routes?.[0]) {
        const duree = Math.round(data.routes[0].duration / 60);
        const dist = (data.routes[0].distance / 1000).toFixed(1);
        this.tempsRestant = duree <= 1 ? 'Arrivée imminente !' : `${duree} min`;
        this.distance = `${dist} km`;

        // Messages alignés sur la carte passager
        if (duree <= 3 && duree > 1 && !this.notifEnvoyees.has('proche')) {
          this.notifEnvoyees.add('proche');
          this.statut = '📍 Navette proche !';
        }
        if (duree <= 1 && !this.notifEnvoyees.has('imminente')) {
          this.notifEnvoyees.add('imminente');
          this.statut = 'Arrivée imminente';
        }
        if (duree <= 0 && !this.notifEnvoyees.has('arrivee')) {
          this.notifEnvoyees.add('arrivee');
          this.statut = '✅ Arrivée';
        }
      }
    } catch {
      // ignore
    } finally {
      this.etaInFlight = false;
      this.cdr.detectChanges();
    }
  }

  arreterTrajet() {
    this.enRoute = false;
    this.statut = 'Trajet terminé ⛔';
    if (this.watchId !== undefined) {
      navigator.geolocation.clearWatch(this.watchId);
    }
    if (this.simInterval) {
      clearInterval(this.simInterval);
    }
    this.etaInFlight = false;
    if (this.stompClient?.connected) {
      this.stompClient.publish({
        destination: `/app/position/${this.vehiculeId}`,
        body: JSON.stringify({ vehiculeId: this.vehiculeId, latitude: 0, longitude: 0, statut: 'TERMINE' })
      });
    }
    this.cdr.detectChanges();
  }

  ngOnDestroy() {
    this.arreterTrajet();
    if (this.stompClient) this.stompClient.deactivate();
    if (this.chauffeurMap) this.chauffeurMap.remove();
  }
}