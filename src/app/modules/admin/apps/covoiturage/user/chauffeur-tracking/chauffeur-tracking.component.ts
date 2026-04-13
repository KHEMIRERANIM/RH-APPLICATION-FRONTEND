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
  @Input() trajetId: string = '';
  @ViewChild('chauffeurMap') chauffeurMapDiv!: ElementRef;

  private stompClient!: Client;
  private watchId: any;
  private simInterval: any;
  private chauffeurMap: any;
  private chauffeurMarker: any;

  private trajetsSimule: { lat: number, lng: number }[] = [];

  statut: string = 'Arrêté';
  enRoute: boolean = false;
  positionActuelle: string = '';
  private lastLat: number | null = null;
  private lastLng: number | null = null;
  vehiculeId: string = '';
  selectedTrajet?: any;
  isLoading: boolean = true;
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
  ) { }

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
    if (points.length > 0) {
      L.polyline(points, { color: '#D1D5DB', weight: 4, dashArray: '8 6' }).addTo(this.chauffeurMap);
      try {
        this.chauffeurMap.fitBounds(points as any, { padding: [30, 30] });
      } catch (e) {
        console.warn('Leaflet fitBounds error:', e);
      }
    }

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
      // Mise à jour du popup avec distance/temps
      this.chauffeurMarker.getPopup()?.setContent(`
        <div class="p-2 min-w-[120px]">
          <p class="font-bold text-[#0F3460] m-0 border-b border-gray-100 pb-1 mb-1">Ma position</p>
          <div class="space-y-1">
            <p class="text-xs text-gray-600 m-0 flex items-center gap-1">⏳ ${this.tempsRestant}</p>
            <p class="text-xs text-[#1D9E75] m-0 font-bold flex items-center gap-1">📍 ${this.distance}</p>
          </div>
        </div>
      `);
    } else {
      this.chauffeurMarker = L.marker([lat, lng], { icon }).addTo(this.chauffeurMap)
        .bindPopup(`
          <div class="p-2 min-w-[120px]">
            <p class="font-bold text-[#0F3460] m-0 border-b border-gray-100 pb-1 mb-1">Ma position</p>
            <div class="space-y-1">
              <p class="text-xs text-gray-600 m-0 flex items-center gap-1">⏳ ${this.tempsRestant}</p>
              <p class="text-xs text-[#1D9E75] m-0 font-bold flex items-center gap-1">📍 ${this.distance}</p>
            </div>
          </div>
        `);
    }
    if (centerMap) {
      this.chauffeurMap.setView([lat, lng], 15);
    }
  }

  chargerTrajets() {
    this.isLoading = true;
    this.covoiturageService.getAllTrajets().subscribe(trajets => {
      this.trajetsActifs = trajets.filter(t => t.statut === 'ACTIF' || t.statut === 'EN_ROUTE');
      
      // Essayer de trouver dans la liste active d'abord
      this.selectedTrajet = this.trajetsActifs.find(t => t.id === this.trajetId);
      
      if (this.selectedTrajet) {
        this.vehiculeId = this.selectedTrajet.vehiculeId;
        this.chargerArretPourVehicule();
        this.isLoading = false;
        this.cdr.detectChanges();
      } else if (this.trajetId) {
        // Si non trouvé dans les actifs, forcer la récupération par ID
        this.covoiturageService.getTrajetById(this.trajetId).subscribe(t => {
          this.selectedTrajet = t;
          this.vehiculeId = t.vehiculeId;
          this.chargerArretPourVehicule();
          this.isLoading = false;
          this.cdr.detectChanges();
        });
      } else if (this.trajetsActifs.length > 0) {
        this.selectedTrajet = this.trajetsActifs[0];
        this.vehiculeId = this.selectedTrajet.vehiculeId;
        this.chargerArretPourVehicule();
        this.isLoading = false;
        this.cdr.detectChanges();
      } else {
        this.vehiculeId = 'navette-test-001';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
      this.connecterWebSocket();
    });
  }

  /** Quand on change le trajet dans la liste : recharger point de départ + polyline, et le WebSocket. */
  onVehiculeOuTrajetChange(): void {
    this.arretCacheVehiculeId = '';
    void this.chargerArretPourVehicule();
    this.connecterWebSocket();
  }

  private async chargerArretPourVehicule(): Promise<void> {
    if (!this.vehiculeId || this.arretCacheVehiculeId === this.vehiculeId) return;
    this.arretCacheVehiculeId = this.vehiculeId;
    this.notifEnvoyees.clear();
    this.tempsRestant = 'Calcul...';
    this.distance = '-';
    this.progression = 0;

    let trajet = this.trajetsActifs.find(t => t.vehiculeId === this.vehiculeId);
    let adresseDepart = (trajet?.adresseDepart || '').trim();
    
    // ✅ Repli sur position actuelle si aucune adresse n'est configurée
    if (!adresseDepart) {
      if (this.lastLat && this.lastLng) {
        this.arretLat = this.lastLat + 0.01;
        this.arretLng = this.lastLng + 0.01;
        this.libelleArret = 'Destination locale (démo)';
        await this.genererTrajetDemo(this.arretLat, this.arretLng);
        return;
      }
      return; // On attend le GPS
    }

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(adresseDepart)}&limit=1&countrycodes=tn&accept-language=fr`
      );
      const data = await res.json();
      if (data?.[0]) {
        this.arretLat = parseFloat(data[0].lat);
        this.arretLng = parseFloat(data[0].lon);
        this.libelleArret = adresseDepart.split(',')[0]?.trim() || 'Point de départ';

        // NOUVEAU: Générer un trajet simulant pour la démo basé sur l'adresse réelle
        await this.genererTrajetDemo(this.arretLat, this.arretLng);
      } else {
        // ✅ Repli même si pas de GPS (point arbitraire pour démo)
        this.arretLat = (this.lastLat || 36.8065) + 0.01;
        this.arretLng = (this.lastLng || 10.1815) + 0.01;
        this.libelleArret = 'Arrivée démo (repli)';
        await this.genererTrajetDemo(this.arretLat, this.arretLng);
      }
    } catch {
      console.warn('[chauffeur-tracking] Erreur réseau — repli local.');
      if (this.lastLat && this.lastLng) {
        this.arretLat = this.lastLat + 0.01;
        this.arretLng = this.lastLng + 0.01;
        await this.genererTrajetDemo(this.arretLat, this.arretLng);
      }
    }
  }

  private isValidCoordinate(lat?: number, lng?: number): boolean {
    return !!(lat && lng && lat !== 0 && lng !== 0 && !isNaN(lat) && !isNaN(lng));
  }

  private async genererTrajetDemo(destLat: number, destLng: number) {
    if (!this.isValidCoordinate(destLat, destLng)) {
      console.warn('Destination invalide pour la démo:', destLat, destLng);
      return;
    }

    // Attendre un peu plus que le GPS se stabilise (3 secondes au total si besoin)
    if (!this.lastLat || !this.lastLng) {
      this.statut = 'Recherche GPS...';
      this.cdr.detectChanges();
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Utilisation de la position actuelle si disponible, sinon repli sur un point arbitraire à proximité
    let startLat = this.lastLat || (destLat + 0.005);
    let startLng = this.lastLng || (destLng - 0.005);

    console.log(`Génération trajet démo de [${startLat}, ${startLng}] vers [${destLat}, ${destLng}]`);

    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${destLng},${destLat}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`OSRM ${res.status}`);
      }
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('json')) {
        throw new Error('OSRM réponse non-JSON');
      }
      const data = await res.json();

      if (data?.routes?.[0]) {
        const coords = data.routes[0].geometry.coordinates;
        // On prend 20 points pour une simulation plus fluide et réaliste
        const step = Math.max(1, Math.floor(coords.length / 20));
        this.trajetsSimule = coords
          .filter((_: any, i: number) => i % step === 0)
          .map((c: any) => ({ lat: c[1], lng: c[0] }));

        // S'assurer que le dernier point est exactement l'arrivée
        if (this.trajetsSimule.length > 0) {
          this.trajetsSimule[this.trajetsSimule.length - 1] = { lat: destLat, lng: destLng };
        } else {
          this.trajetsSimule.push({ lat: destLat, lng: destLng });
        }

        // Redessiner la ligne sur la carte
        if (this.chauffeurMap) {
          const points = this.trajetsSimule.map(p => [p.lat, p.lng]);
          L.polyline(points, { color: '#3B82F6', weight: 5, opacity: 0.6, dashArray: '10, 10' }).addTo(this.chauffeurMap);
          try {
            this.chauffeurMap.fitBounds(points as any, { padding: [30, 30] });
          } catch (e) { }
        }
      }
    } catch (error) {
      console.warn('Erreur OSRM démo, utilisation ligne droite:', error);
      this.trajetsSimule = this.pointsLigneDroite(startLat, startLng, destLat, destLng, 100);
      
      // Affichage immédiat de la ligne droite de secours
      if (this.chauffeurMap) {
        const points = this.trajetsSimule.map(p => [p.lat, p.lng]);
        L.polyline(points, { color: '#3B82F6', weight: 5, opacity: 0.6, dashArray: '10, 10' }).addTo(this.chauffeurMap);
      }
    }
  }

  private pointsLigneDroite(lat1: number, lng1: number, lat2: number, lng2: number, nb: number): { lat: number, lng: number }[] {
    const pts = [];
    for (let i = 0; i <= nb; i++) {
      const t = i / nb;
      pts.push({ lat: lat1 + (lat2 - lat1) * t, lng: lng1 + (lng2 - lng1) * t });
    }
    return pts;
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
        // Calcul ETA / messages (throttle)
        this.updateEtaEtMessages(lat, lng);

        this.updateChauffeurPosition(lat, lng, true);

        if (this.stompClient?.connected && this.isValidCoordinate(lat, lng)) {
          this.stompClient.publish({
            destination: `/topic/navette/${this.vehiculeId}`,
            body: JSON.stringify({ 
              vehiculeId: this.vehiculeId, 
              latitude: lat, 
              longitude: lng,
              statut: 'EN_ROUTE',
              tempsRestant: this.tempsRestant,
              distance: this.distance,
              progression: this.progression
            })
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

  async demarrerSimulation() {
    this.enRoute = true;
    this.statut = 'Simulation en cours 🟢';
    let etape = 0;

    // S'assurer qu'on a une destination avant de demarrer
    if (!this.arretLat || !this.arretLng) {
      console.log('Destination non prête, tentative de repli de dernière seconde...');
      this.arretLat = (this.lastLat || 36.8065) + 0.01;
      this.arretLng = (this.lastLng || 10.1815) + 0.01;
    }
    
    await this.genererTrajetDemo(this.arretLat, this.arretLng);

    if (!this.trajetsSimule || this.trajetsSimule.length === 0) {
      this.statut = 'Erreur: Trajet démo impossible ❌';
      this.enRoute = false;
      return;
    }

    this.simInterval = setInterval(() => {
      if (etape >= this.trajetsSimule.length) {
        clearInterval(this.simInterval);
        this.statut = '✅ Arrivée au point de départ';

        // Notification finale d'arrivée via WebSocket
        if (this.stompClient?.connected) {
          this.stompClient.publish({
            destination: `/topic/navette/${this.vehiculeId}`,
            body: JSON.stringify({
              vehiculeId: this.vehiculeId,
              latitude: this.arretLat,
              longitude: this.arretLng,
              statut: 'ARRIVEE',
              message: 'La voiture est arrivée !',
              tempsRestant: 'Arrivée !',
              distance: '0.0 km',
              progression: 100
            })
          });
        }

        this.marquerReservationsCommeEffectuees();
        this.enRoute = false;
        this.cdr.detectChanges();
        return;
      }

      const point = this.trajetsSimule[etape];
      this.lastLat = point.lat;
      this.lastLng = point.lng;
      this.positionActuelle = `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`;
      this.updateChauffeurPosition(point.lat, point.lng, true);

      this.majEtaVitesse(point.lat, point.lng);

      if (this.stompClient?.connected && this.isValidCoordinate(point.lat, point.lng)) {
        const isLast = etape === this.trajetsSimule.length - 1;
        this.stompClient.publish({
          destination: `/topic/navette/${this.vehiculeId}`,
          body: JSON.stringify({
            vehiculeId: this.vehiculeId,
            latitude: point.lat,
            longitude: point.lng,
            statut: isLast ? 'ARRIVEE' : 'EN_ROUTE',
            tempsRestant: this.tempsRestant,
            distance: this.distance,
            progression: Math.round((etape / (this.trajetsSimule.length - 1)) * 100),
            destinationLat: this.arretLat,
            destinationLng: this.arretLng
          })
        });
        this.nbPositionsEnvoyees++;
      }

      etape++;
      this.cdr.detectChanges();
    }, 300); // 0.3s pour une vitesse égale et fluide entre conducteur et employé
  }

  private majEtaVitesse(lat: number, lng: number) {
    if (!this.arretLat || !this.arretLng) return;
    const dKm = this.calculerDistanceHaversine(lat, lng, this.arretLat, this.arretLng);
    this.distance = `${dKm.toFixed(1)} km`;
    this.tempsRestant = dKm < 0.1 ? 'Arrivée !' : `~${Math.round(dKm * 1.5 + 1)} min`;
  }

  private async updateEtaEtMessages(navLat: number, navLng: number): Promise<void> {
    if (!this.isValidCoordinate(navLat, navLng) || !this.isValidCoordinate(this.arretLat, this.arretLng)) return;
    const now = Date.now();
    if (this.etaInFlight) return;
    if (now - this.lastEtaUpdateTs < 4000) return; // éviter 429 sur le routeur OSRM public
    this.lastEtaUpdateTs = now;
    this.etaInFlight = true;

    try {
      const res = await fetch(
        `https://router.project-osrm.org/route/v1/driving/` +
        `${navLng},${navLat};${this.arretLng},${this.arretLat}` +
        `?overview=false`
      );
      if (!res.ok) {
        throw new Error(`OSRM ${res.status}`);
      }
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('json')) {
        throw new Error('OSRM non-JSON');
      }
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

        const distH = this.calculerDistanceHaversine(navLat, navLng, this.arretLat, this.arretLng);
        if ((duree <= 1 || distH <= 0.15) && !this.notifEnvoyees.has('imminente')) {
          this.notifEnvoyees.add('imminente');
          this.statut = 'Arrivée imminente';
          // Ne pas marquer EFFECTUE ici : uniquement à l'arrivée réelle (fin simulation / GPS).
        }
        if (duree <= 0 && !this.notifEnvoyees.has('arrivee')) {
          this.notifEnvoyees.add('arrivee');
          this.statut = '✅ Arrivée';
        }
      }
    } catch {
      // Fallback GPS si OSRM échoue pour la démo
      const d = this.calculerDistanceHaversine(navLat, navLng, this.arretLat, this.arretLng);
      this.distance = `${d.toFixed(1)} km`;
      this.tempsRestant = `~${Math.round(d * 1.5)} min`;
    } finally {
      this.etaInFlight = false;
      this.cdr.detectChanges();
    }
  }

  private marquerReservationsCommeEffectuees() {
    console.log('Tentative de marquage des réservations comme EFFECTUE...');
    console.log('trajetId actuel:', this.trajetId);

    if (!this.trajetId) {
      console.warn('❌ Aucun trajetId défini pour le marquage');
      // Fallback: si on a un seul trajet actif, on le prend quand même pour le test
      if (this.trajetsActifs.length === 1) {
        console.log('Utilisation du seul trajet actif disponible:', this.trajetsActifs[0].id);
        this.marquerPourUnTrajet(this.trajetsActifs[0].id);
      }
      return;
    }
    this.marquerPourUnTrajet(this.trajetId);
  }

  private calculerDistanceHaversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private marquerPourUnTrajet(trajetId: string) {
    this.covoiturageService.updateReservationsByTrajetToEffectue(trajetId).subscribe({
      next: () => {
        console.log(`✅ Toutes les réservations du trajet ${trajetId} ont été marquées comme EFFECTUE`);

        // Finalize: Mark the trajet itself as EFFECTUE so it's hidden from search
        this.covoiturageService.updateTrajetStatus(trajetId, 'EFFECTUE').subscribe({
          next: () => console.log(`✅ Trajet ${trajetId} marqué comme EFFECTUE`),
          error: (err) => console.error('❌ Erreur update Trajet status:', err)
        });

        alert(`Le trajet est effectué ! Toutes les réservations sont maintenant marquées comme "Effectuées" et le trajet est retiré des propositions.`);
        this.cdr.detectChanges();
      },
      error: (err) => console.error('❌ Erreur bulk update:', err)
    });
  }

  arreterTrajet() {
    if (this.enRoute) {
      const confirmMsg = "Le trajet est en cours. Voulez-vous le marquer comme 'EFFECTUE' pour tous les passagers ?";
      if (confirm(confirmMsg)) {
        this.marquerReservationsCommeEffectuees();
      }
    }
    this.enRoute = false;
    this.statut = 'Trajet effectué ✅';
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