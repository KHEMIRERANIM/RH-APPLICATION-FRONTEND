import {
  Component, OnInit, OnDestroy, Input,
  ElementRef, ViewChild, AfterViewInit,
  ChangeDetectorRef, OnChanges, SimpleChanges
} from '@angular/core';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { getWsTrackingSockJsUrl } from 'src/environments/environment';
import { CovoiturageService } from '../../covoiturage.service';
declare var L: any;

interface Notification {
  id: number;
  type: 'info' | 'warning' | 'danger' | 'success';
  titre: string;
  message: string;
  heure: string;
  icon: string;
}

@Component({
  selector: 'app-navette-tracking',
  templateUrl: './navette-tracking.component.html',
  styleUrls: ['./navette-tracking.component.scss'],
  standalone: false
})
export class NavetteTrackingComponent implements OnInit, AfterViewInit, OnDestroy, OnChanges {

  @Input() vehiculeId: string = '';
  @Input() reservationId: string = '';
  @Input() trajetId: string = '';
  @Input() isVoiture: boolean = false;
  @ViewChild('trackingMap') mapDiv!: ElementRef;

  private stompClient!: Client;
  private map: any;
  private navetteMarker: any;
  private routePolyline: any;
  private interval: any;
  private notifId: number = 0;
  private notifEnvoyees: Set<string> = new Set();

  distanceRestante: string = '';
  tempsRestant: string = 'Calcul en cours...';
  distance: string = '...';
  statut: string = 'En attente';
  progression: number = 0;
  notifications: Notification[] = [];
  showNotifications: boolean = false;
  notificationsNonLues: number = 0;

  @Input() adresseDepart: string = '';
  @Input() adresseArrivee: string = '';
  /** Point de rendez-vous (géocodé) — pas de coordonnées fictives par défaut. */
  arretLat = 0;
  arretLng = 0;
  private departLat: number = 0;
  private departLng: number = 0;

  /** Limite les appels au routeur OSRM public (sinon 429 + ligne bleue incomplète). */
  private lastOsrmRouteFetchTs = 0;
  private readonly osrmMinIntervalMs = 12000;
  private osrmRouteInFlight = false;

  private trajets: { lat: number, lng: number }[] = [];
  public etapeActuelle: number = 0;
  private totalDistance: number = 0;

  nomVilleDepart: string = 'Départ';
  nomVilleArrivee: string = 'Destination';

  constructor(
    private cdr: ChangeDetectorRef,
    private covoiturageService: CovoiturageService
  ) { }

  ngOnInit() {
    this.chargerAdresseDepart().then(() => this.appliquerEtaInitialSansSpamOsrm());
    this.connecterWebSocket();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['adresseDepart'] || changes['adresseArrivee'] || changes['vehiculeId'] || changes['trajetId']) {
      this.chargerAdresseDepart().then(() => this.appliquerEtaInitialSansSpamOsrm());
      if (changes['vehiculeId'] && !changes['vehiculeId'].firstChange) {
        if (this.stompClient) this.stompClient.deactivate();
        this.connecterWebSocket();
      }
    }
  }

  private async chargerAdresseDepart(): Promise<void> {
    if (!this.adresseDepart || !this.adresseArrivee) return;
    try {
      // Covoiturage : le passager attend au point de départ du trajet (même cible que le conducteur / OSRM).
      if (this.isVoiture) {
        const resPickup = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(this.adresseDepart)}&limit=1&countrycodes=tn&accept-language=fr`
        );
        const dataPickup = await resPickup.json();
        if (dataPickup?.[0]) {
          this.arretLat = parseFloat(dataPickup[0].lat);
          this.arretLng = parseFloat(dataPickup[0].lon);
        }
        this.nomVilleDepart = this.adresseDepart.split(',')[0].trim();
        this.nomVilleArrivee = this.adresseArrivee.split(',')[0].trim();

        this.departLat = this.arretLat + 0.02;
        this.departLng = this.arretLng - 0.01;
        await this.genererTrajetDepuisVers(this.departLat, this.departLng, this.arretLat, this.arretLng, 20);
        return;
      }

      const resA = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(this.adresseArrivee)}&limit=1&countrycodes=tn`);
      const dataA = await resA.json();
      if (dataA?.[0]) {
        this.arretLat = parseFloat(dataA[0].lat);
        this.arretLng = parseFloat(dataA[0].lon);
        this.nomVilleArrivee = this.adresseArrivee.split(',')[0].trim();
      }
      this.nomVilleDepart = this.adresseDepart.split(',')[0].trim();

      if ((this.vehiculeId && this.vehiculeId.includes('demo')) || (!this.trajetId)) {
        await this.genererTrajetDemo(this.arretLat, this.arretLng);
        if (this.departLat && this.departLng) {
          try {
            const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${this.departLng},${this.departLat};${this.arretLng},${this.arretLat}?overview=false`);
            const data = await res.json();
            if (data.routes?.[0]) this.totalDistance = data.routes[0].distance / 1000;
          } catch (e) { this.totalDistance = 3.2; }
        }
      } else {
        try {
          const resD = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(this.adresseDepart)}&limit=1&countrycodes=tn`);
          const dataD = await resD.json();
          if (dataD?.[0]) {
            this.departLat = parseFloat(dataD[0].lat);
            this.departLng = parseFloat(dataD[0].lon);
          }
        } catch (e) { }
        if (!this.departLat || !this.departLng) {
          this.departLat = this.arretLat + 0.03;
          this.departLng = this.arretLng - 0.02;
        }
        await this.genererTrajetSimule();
      }
    } catch { }
    setTimeout(() => this.ajusterVueCarteSiPret(), 200);
  }

  /** Au chargement : covoiturage = estimation locale uniquement ; navette = 1 OSRM si besoin. */
  private appliquerEtaInitialSansSpamOsrm(): void {
    if (!this.isValidCoordinate(this.departLat, this.departLng) || !this.isValidCoordinate(this.arretLat, this.arretLng)) {
      return;
    }
    if (this.isVoiture) {
      this.appliquerEstimationHaversine(this.departLat, this.departLng);
      return;
    }
    void this.majRouteEtEtaDepuisPosition(this.departLat, this.departLng, true);
  }

  private async genererTrajetSimule(): Promise<void> {
    try {
      const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${this.departLng},${this.departLat};${this.arretLng},${this.arretLat}?overview=full&geometries=geojson`);
      if (!res.ok) {
        throw new Error(`OSRM ${res.status}`);
      }
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('json')) {
        throw new Error('not json');
      }
      const data = await res.json();
      if (data?.routes?.[0]) {
        const coords = data.routes[0].geometry.coordinates;
        const step = Math.max(1, Math.floor(coords.length / 10));
        this.trajets = coords.filter((_: any, i: number) => i % step === 0).slice(0, 10).map((c: any) => ({ lat: c[1], lng: c[0] }));
      }
    } catch {
      this.trajets = this.genererPointsLigneDroite(this.departLat, this.departLng, this.arretLat, this.arretLng, 15);
    }
  }

  private genererPointsLigneDroite(lat1: number, lng1: number, lat2: number, lng2: number, nbPoints: number): any[] {
    const pts = [];
    for (let i = 0; i < nbPoints; i++) {
      pts.push({ lat: lat1 - (lat1 - lat2) * (i / nbPoints), lng: lng1 - (lng1 - lng2) * (i / nbPoints) });
    }
    return pts;
  }

  private isValidCoordinate(lat?: number, lng?: number): boolean {
    return !!(lat && lng && lat !== 0 && lng !== 0 && !isNaN(lat) && !isNaN(lng));
  }

  /** Route OSRM entre deux points (aperçu carte + distance totale). */
  private async genererTrajetDepuisVers(
    startLat: number,
    startLng: number,
    destLat: number,
    destLng: number,
    nbPointsCible: number = 20
  ): Promise<void> {
    if (!this.isValidCoordinate(destLat, destLng) || !this.isValidCoordinate(startLat, startLng)) return;
    try {
      const res = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${destLng},${destLat}?overview=full&geometries=geojson`
      );
      if (!res.ok) {
        throw new Error(`OSRM ${res.status}`);
      }
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('json')) {
        throw new Error('not json');
      }
      const data = await res.json();
      if (data?.routes?.[0]) {
        const route = data.routes[0];
        this.totalDistance = route.distance / 1000;
        const coords = route.geometry.coordinates;
        const step = Math.max(1, Math.floor(coords.length / nbPointsCible));
        this.trajets = coords.filter((_: any, i: number) => i % step === 0).map((c: any) => ({ lat: c[1], lng: c[0] }));
        const last = this.trajets[this.trajets.length - 1];
        if (!last || last.lat !== destLat || last.lng !== destLng) {
          this.trajets.push({ lat: destLat, lng: destLng });
        }
      } else {
        this.trajets = this.genererPointsLigneDroite(startLat, startLng, destLat, destLng, 15);
      }
    } catch {
      if (this.isValidCoordinate(startLat, startLng)) {
        this.trajets = this.genererPointsLigneDroite(startLat, startLng, destLat, destLng, 15);
      }
    }
  }

  private async genererTrajetDemo(destLat: number, destLng: number) {
    if (!this.isValidCoordinate(destLat, destLng)) return;
    this.departLat = destLat + 0.02;
    this.departLng = destLng - 0.01;
    await this.genererTrajetDepuisVers(this.departLat, this.departLng, destLat, destLng, 20);
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.initMap();
      this.ajusterVueCarteSiPret();
    }, 700);
  }

  connecterWebSocket() {
    try {
      const wsUrl = getWsTrackingSockJsUrl();
      const token = localStorage.getItem('accessToken');
      const sockJsUrl = token ? `${wsUrl}${wsUrl.includes('?') ? '&' : '?'}access_token=${encodeURIComponent(token)}` : wsUrl;

      this.stompClient = new Client({
        webSocketFactory: () => new SockJS(sockJsUrl) as any,
        connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
        reconnectDelay: 4000,
        onConnect: () => {
          if (this.statut === 'En attente') { this.statut = 'Connecté'; this.cdr.detectChanges(); }
          this.stompClient.subscribe(`/topic/navette/${this.vehiculeId}`, (message: IMessage) => {
            let pos: any;
            try {
              pos = JSON.parse(message.body);
            } catch {
              return;
            }

            if (pos?.statut === 'ARRIVEE' || pos?.statut === 'TERMINE') {
              this.statut = '✅ Arrivée';
              this.tempsRestant = 'Arrivée !';
              this.progression = 100;
              this.updateNavettePosition(this.arretLat, this.arretLng);

              if (!this.notifEnvoyees.has('arrivee_message')) {
                this.notifEnvoyees.add('arrivee_message');
                this.ajouterNotification('success', '🚗 Arrivée !', 'La voiture est arrivée à votre point de départ.', '🏁');

                this.validerArrivee();
              }
              this.cdr.detectChanges();
              return;
            }

            const lat = pos?.latitude;
            const lng = pos?.longitude;
            const hasCoords = typeof lat === 'number' && typeof lng === 'number';
            const conducteurEnvoieEta =
              hasCoords && pos.tempsRestant != null && pos.tempsRestant !== '' && pos.distance != null && pos.distance !== '';

            if (pos.destinationLat && pos.destinationLng) {
              this.arretLat = pos.destinationLat;
              this.arretLng = pos.destinationLng;
            }

            // Démo / sync conducteur : pas d’appel OSRM ici (évite 429) — ligne directe + métriques reçues.
            if (conducteurEnvoieEta) {
              // Si on reçoit des données réelles, on nettoie les anciens tracés de prévisualisation
              if (this.statut === 'En attente' || this.statut === 'Connecté') {
                if (this.map) {
                  this.map.eachLayer((layer: any) => {
                    if (layer instanceof L.Polyline && layer !== this.routePolyline) {
                      this.map.removeLayer(layer);
                    }
                  });
                }
              }

              this.updateNavettePosition(lat, lng);

              // Utilisation directe des données du conducteur pour éviter les calculs OSRM lents
              this.tempsRestant = pos.tempsRestant;
              this.distance = pos.distance;
              if (pos.progression !== undefined) {
                this.progression = pos.progression;
              }
              if (this.statut === 'En attente' || this.statut === 'Connecté') {
                this.statut = 'En route';
              }
              this.cdr.detectChanges();
              return;
            }

            if (hasCoords) {
              void this.traiterPosition(lat, lng);
            }
          });
        },
        onDisconnect: () => { if (this.statut === 'Connecté') { this.statut = 'En attente'; this.cdr.detectChanges(); } }
      });
      this.stompClient.activate();
    } catch (e) { }
  }

  async demarrerSimulation() {
    if (this.trajets.length === 0) await this.chargerAdresseDepart();
    if (this.trajets.length === 0) return;
    this.statut = 'En route';
    this.interval = setInterval(async () => {
      if (this.etapeActuelle >= this.trajets.length) {
        clearInterval(this.interval); this.interval = undefined;
        this.validerArrivee(); return;
      }
      const p = this.trajets[this.etapeActuelle];
      await this.traiterPosition(p.lat, p.lng);
      this.etapeActuelle++;
    }, 300);
  }

  async traiterPosition(lat: number, lng: number) {
    if (!this.map) return;
    if (this.statut === 'En attente' || this.statut === 'Connecté') this.statut = 'En route';
    this.updateNavettePosition(lat, lng);
    const duree = await this.majRouteEtEtaDepuisPosition(lat, lng, false);

    const distH = this.calculerDistanceHaversine(lat, lng, this.arretLat, this.arretLng);
    if ((duree <= 1 || distH <= 0.15) && !this.notifEnvoyees.has('arrivee_auto')) {
      this.notifEnvoyees.add('arrivee_auto');
      this.validerArrivee();
    }

    if (duree <= 2 && !this.notifEnvoyees.has('proche')) {
      this.notifEnvoyees.add('proche');
      this.ajouterNotification('warning', '📍 Presque là !', 'Votre transport arrive bientôt.', '⏰');
    }
    this.cdr.detectChanges();
  }

  /** Ligne bleue du véhicule jusqu’au point de rendez-vous (sans OSRM — toujours reliée au marqueur). */
  private dessinerLigneVersArrivee(navLat: number, navLng: number): void {
    if (!this.map || !this.isValidCoordinate(navLat, navLng) || !this.isValidCoordinate(this.arretLat, this.arretLng)) {
      return;
    }
    const pts: [number, number][] = [[navLat, navLng], [this.arretLat, this.arretLng]];
    if (this.routePolyline) {
      this.map.removeLayer(this.routePolyline);
    }
    this.routePolyline = L.polyline(pts, {
      color: '#2563EB',
      weight: 5,
      opacity: 0.92,
      dashArray: '10 7'
    }).addTo(this.map);
  }

  private appliquerEstimationHaversine(navLat: number, navLng: number): void {
    const dKm = this.calculerDistanceHaversine(navLat, navLng, this.arretLat, this.arretLng);
    this.distance = `${dKm.toFixed(1)} km`;
    const mins = Math.max(1, Math.round((dKm / 30) * 60));
    this.tempsRestant = mins <= 1 ? 'Arrivée !' : `~${mins} min`;
    if (this.totalDistance > 0) {
      this.progression = Math.round(((this.totalDistance - dKm) / this.totalDistance) * 100);
      this.progression = Math.min(100, Math.max(0, this.progression));
    }
  }

  /**
   * Met à jour ETA + tracé : un seul appel OSRM complet au plus tous les 12 s ;
   * entre deux, estimation Haversine + ligne directe (évite 429 et ligne « coupée »).
   */
  private async majRouteEtEtaDepuisPosition(navLat: number, navLng: number, force: boolean): Promise<number> {
    if (!this.isValidCoordinate(navLat, navLng) || !this.isValidCoordinate(this.arretLat, this.arretLng)) {
      return 99;
    }
    const dKm = this.calculerDistanceHaversine(navLat, navLng, this.arretLat, this.arretLng);
    const now = Date.now();
    const throttleOk = force || now - this.lastOsrmRouteFetchTs >= this.osrmMinIntervalMs;

    if (!throttleOk || this.osrmRouteInFlight) {
      this.appliquerEstimationHaversine(navLat, navLng);
      this.dessinerLigneVersArrivee(navLat, navLng);
      return Math.max(1, Math.round((dKm / 30) * 60));
    }

    this.osrmRouteInFlight = true;
    this.lastOsrmRouteFetchTs = now;
    try {
      const res = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${navLng},${navLat};${this.arretLng},${this.arretLat}?overview=full&geometries=geojson`
      );
      if (!res.ok) {
        throw new Error(`OSRM ${res.status}`);
      }
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('json')) {
        throw new Error('not json');
      }
      const data = await res.json();
      if (data?.routes?.[0]) {
        const route = data.routes[0];
        const duree = Math.round(route.duration / 60);
        const dist = (route.distance / 1000).toFixed(1);
        this.tempsRestant = duree <= 1 ? 'Arrivée !' : `${duree} min`;
        this.distance = `${dist} km`;
        if (this.totalDistance <= 0) {
          this.totalDistance = parseFloat(dist);
        }
        if (this.totalDistance > 0) {
          this.progression = Math.round(((this.totalDistance - parseFloat(dist)) / this.totalDistance) * 100);
          this.progression = Math.min(100, Math.max(0, this.progression));
        }
        const coords = route.geometry.coordinates.map((c: any) => [c[1], c[0]] as [number, number]);
        if (this.routePolyline) {
          this.map.removeLayer(this.routePolyline);
        }
        this.routePolyline = L.polyline(coords, { color: '#2563EB', weight: 5, opacity: 0.88 }).addTo(this.map);
        return duree;
      }
      throw new Error('no route');
    } catch {
      this.appliquerEstimationHaversine(navLat, navLng);
      this.dessinerLigneVersArrivee(navLat, navLng);
    } finally {
      this.osrmRouteInFlight = false;
    }
    return Math.max(1, Math.round((dKm / 30) * 60));
  }

  private ajusterVueCarteSiPret(): void {
    if (!this.map) return;
    try {
      if (this.trajets.length > 1) {
        const tousLesPoints = this.trajets.map(p => [p.lat, p.lng]);
        this.map.fitBounds(tousLesPoints as any, { padding: [48, 48] });
      } else if (this.isValidCoordinate(this.arretLat, this.arretLng)) {
        this.map.setView([this.arretLat, this.arretLng], 13);
      }
    } catch { /* ignore */ }
  }

  initMap() {
    if (!this.mapDiv?.nativeElement || this.map) return;

    const centre: [number, number] = this.isValidCoordinate(this.arretLat, this.arretLng)
      ? [this.arretLat, this.arretLng]
      : this.isValidCoordinate(this.departLat, this.departLng)
        ? [this.departLat, this.departLng]
        : [36.8, 10.18];
    const zoom = this.isValidCoordinate(this.arretLat, this.arretLng) ? 13 : 11;

    this.map = L.map(this.mapDiv.nativeElement).setView(centre, zoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);

    const arretIcon = L.divIcon({
      html: `<div style="background:#1D9E75;width:18px;height:18px;border-radius:50%;border:3px solid white;"></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    });
    if (this.isValidCoordinate(this.arretLat, this.arretLng)) {
      L.marker([this.arretLat, this.arretLng], { icon: arretIcon }).addTo(this.map);
    }

    if (this.trajets.length > 0) {
      const departIcon = L.divIcon({
        html: `<div style="background:#3B82F6;width:14px;height:14px;border-radius:50%;border:2px solid white;"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7]
      });
      L.marker([this.trajets[0].lat, this.trajets[0].lng], { icon: departIcon }).addTo(this.map);
      const tousLesPoints = this.trajets.map(p => [p.lat, p.lng]);
      L.polyline(tousLesPoints as any, { color: '#6B7280', weight: 4, opacity: 0.5, dashArray: '10 5' }).addTo(this.map);
      try {
        this.map.fitBounds(tousLesPoints as any, { padding: [50, 50] });
      } catch { /* ignore */ }
    }
  }

  private updateNavettePosition(lat: number, lng: number) {
    if (!this.map) return;
    const navetteIcon = L.divIcon({
      className: 'car-marker-icon', // Classe personnalisée pour le CSS
      html: `<div style="font-size:32px; filter:drop-shadow(0 4px 6px rgba(0,0,0,0.3)); background:transparent;">${this.isVoiture ? '🚗' : '🚌'}</div>`,
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });
    if (this.navetteMarker) {
      this.navetteMarker.setLatLng([lat, lng]);
    } else {
      this.navetteMarker = L.marker([lat, lng], { icon: navetteIcon }).addTo(this.map)
        .bindPopup(`<b>${this.isVoiture ? 'Covoiturage' : 'Navette RH'}</b>`);
    }

    // Recentrage immédiat sans animation lente pour éviter le retard accumulé
    this.map.setView([lat, lng], this.map.getZoom());
  }

  private calculerDistanceHaversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Rayon de la Terre en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private validerArrivee() {
    if (this.notifEnvoyees.has('valide')) return;
    this.notifEnvoyees.add('valide');
    const tid = this.trajetId || '';
    if (tid) {
      this.covoiturageService.updateReservationsByTrajetToEffectue(tid).subscribe(() => {
        this.ajouterNotification('success', '✅ Terminé', 'Trajet validé.', '🌟');
        this.cdr.detectChanges();
      });
    } else if (this.reservationId) {
      this.covoiturageService.updateReservationStatus(this.reservationId, { statut: 'EFFECTUE' }).subscribe(() => {
        this.ajouterNotification('success', '✅ Validé', 'Trajet fini.', '✅');
        this.cdr.detectChanges();
      });
    }
  }

  ajouterNotification(type: any, titre: string, message: string, icon: string) {
    this.notifications.unshift({ id: this.notifId++, type, titre, message, heure: new Date().toLocaleTimeString(), icon });
    this.notificationsNonLues++;
    this.cdr.detectChanges();
    this.envoyerNotifNavigateur(titre, message);
  }

  envoyerNotifNavigateur(titre: string, message: string) {
    if ('Notification' in window) Notification.requestPermission().then(p => { if (p === 'granted') new Notification(titre, { body: message }); });
  }

  marquerCommeLu() { this.notificationsNonLues = 0; this.showNotifications = false; }

  ngOnDestroy() {
    if (this.interval) clearInterval(this.interval);
    if (this.stompClient) this.stompClient.deactivate();
    if (this.map) this.map.remove();
  }
}
