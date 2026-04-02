import {
  Component, OnInit, OnDestroy, Input,
  ElementRef, ViewChild, AfterViewInit,
  ChangeDetectorRef
} from '@angular/core';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { getWsTrackingSockJsUrl } from 'src/environments/environment';
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
export class NavetteTrackingComponent implements OnInit, AfterViewInit, OnDestroy {

  @Input() vehiculeId: string = '';
  @Input() isVoiture: boolean = false;
  @ViewChild('trackingMap') mapDiv!: ElementRef;

  private stompClient!: Client;
  private map: any;
  private navetteMarker: any;
  private routePolyline: any;
  private interval: any;
  private notifId: number = 0;
  private notifEnvoyees: Set<string> = new Set();

  tempsRestant: string = 'Calcul...';
  distance: string = '-';
  statut: string = 'En attente';
  progression: number = 0;
  notifications: Notification[] = [];
  showNotifications: boolean = false;
  notificationsNonLues: number = 0;

  // Position arrêt employé
@Input() adresseDepart: string = '';
  @Input() adresseArrivee: string = '';
  arretLat: number = 36.8065;
  arretLng: number = 10.1815;
  private departLat: number = 0;
  private departLng: number = 0;

  private trajets: { lat: number, lng: number }[] = [];

public etapeActuelle: number = 0;
  private enRetard: boolean = false;

  constructor(private cdr: ChangeDetectorRef) { }

  ngOnInit() {
  this.chargerAdresseDepart();
  this.connecterWebSocket();
}
private async chargerAdresseDepart(): Promise<void> {
  if (!this.adresseDepart || !this.adresseArrivee) return;
  try {
    // Point où attend l'employé = adresseDepart du trajet
    const resA = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(this.adresseDepart)}&limit=1&countrycodes=tn`
    );
    const dataA = await resA.json();
    if (dataA?.[0]) {
      this.arretLat = parseFloat(dataA[0].lat);
      this.arretLng = parseFloat(dataA[0].lon);
    }

    // Position initiale du conducteur = adresseArrivee du trajet
    const resD = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(this.adresseArrivee)}&limit=1&countrycodes=tn`
    );
    const dataD = await resD.json();
    if (dataD?.[0]) {
      this.departLat = parseFloat(dataD[0].lat);
      this.departLng = parseFloat(dataD[0].lon);
    }

    // Génère le vrai trajet simulé
    await this.genererTrajetSimule();

  } catch { }
}

private async genererTrajetSimule(): Promise<void> {
  try {
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/` +
      `${this.departLng},${this.departLat};${this.arretLng},${this.arretLat}` +
      `?overview=full&geometries=geojson`
    );
    const data = await res.json();
    if (data?.routes?.[0]) {
      const coords = data.routes[0].geometry.coordinates;
      const step = Math.max(1, Math.floor(coords.length / 10));
      this.trajets = coords
        .filter((_: any, i: number) => i % step === 0)
        .slice(0, 10)
        .map((c: any) => ({ lat: c[1], lng: c[0] }));
    }
  } catch { }
}
  ngAfterViewInit() {
    setTimeout(() => {
      this.initMap();
    }, 300);
  }

  // ===== WEBSOCKET =====
  connecterWebSocket() {
    try {
      const wsUrl = getWsTrackingSockJsUrl();
      const token = localStorage.getItem('accessToken');
      const sockJsUrl = token
        ? `${wsUrl}${wsUrl.includes('?') ? '&' : '?'}access_token=${encodeURIComponent(token)}`
        : wsUrl;

      // SockJS + mêmes endpoints que le chauffeur
      this.stompClient = new Client({
        webSocketFactory: () => new SockJS(sockJsUrl) as any,
        connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
        reconnectDelay: 4000,
        onConnect: () => {
          console.log('[navette-tracking] WebSocket connecté. vehiculeId=', this.vehiculeId);
          if (this.statut === 'En attente') {
            this.statut = 'Connecté';
            this.cdr.detectChanges();
          }
          this.stompClient.subscribe(
            `/topic/navette/${this.vehiculeId}`,
            (message: IMessage) => {
              const pos = JSON.parse(message.body);
              console.log('[navette-tracking] Position reçue:', pos);

              // Message "TERMINE" en option côté serveur
              if (pos?.statut === 'TERMINE') {
                this.traiterPosition(this.arretLat, this.arretLng);
                return;
              }

              if (typeof pos?.latitude === 'number' && typeof pos?.longitude === 'number') {
                this.traiterPosition(pos.latitude, pos.longitude);
              }
            }
          );
        },
        onDisconnect: () => {
          if (this.statut === 'Connecté') {
            this.statut = 'En attente';
            this.cdr.detectChanges();
          }
        },
        onStompError: () => { }
      });

      this.stompClient.activate();
    } catch (e) { }
  }

  // ===== SIMULATION =====
async demarrerSimulation() {     if (this.trajets.length === 0) {
    await this.chargerAdresseDepart();
  }
  
  if (this.trajets.length === 0) {
    alert('Trajet non chargé, réessayez dans quelques secondes');
    return;
  }
    this.statut = 'En route';
    this.ajouterNotification(
      'info', '🚌 Navette en route',
      'Votre navette a démarré depuis Ariana', '🚌'
    );

    this.interval = setInterval(async () => {
      if (this.etapeActuelle >= this.trajets.length) {
        clearInterval(this.interval);
        return;
      }

      // Retard à l'étape 4
      if (this.etapeActuelle === 4 && !this.enRetard) {
        this.enRetard = true;
        this.statut = '⚠️ Retard';
        this.ajouterNotification(
          'danger', '⚠️ Retard détecté !',
          'La navette est bloquée dans le trafic à Lac 1', '🚦'
        );

        setTimeout(() => {
          this.ajouterNotification(
            'warning', '🔄 Alternative disponible',
            'Navette Ligne B disponible dans 5 min — Arrêt à 200m', '🚌'
          );
        }, 4000);

        setTimeout(() => {
          this.statut = 'En route';
          this.enRetard = false;
          this.ajouterNotification(
            'success', '✅ Trafic dégagé',
            'La navette reprend sa route normalement', '🟢'
          );
        }, 9000);

        return; // pause pendant le retard
      }

      const point = this.trajets[this.etapeActuelle];
      this.etapeActuelle++;

      // Mise à jour progression
      this.progression = Math.round(
        (this.etapeActuelle / this.trajets.length) * 100
      );

      await this.traiterPosition(point.lat, point.lng);

    }, 2500);
  }

  // ===== TRAITEMENT POSITION =====
  async traiterPosition(lat: number, lng: number) {
    if (this.statut === 'En attente' || this.statut === 'Connecté') {
      this.statut = 'En route';
    }

    // Déplace la navette sur la carte
    this.updateNavettePosition(lat, lng);

    // Dessine le trajet restant
    await this.dessinerTrajetRestant(lat, lng);

    // Calcule le temps restant
    const duree = await this.calculerTemps(lat, lng);

    // Notifications intelligentes
    if (duree <= 3 && duree > 1 && !this.notifEnvoyees.has('proche')) {
      this.notifEnvoyees.add('proche');
      this.ajouterNotification(
        'warning', '📍 Navette proche !',
        `La navette arrive dans ${duree} minutes. Préparez-vous !`, '⏰'
      );
    }

    if (duree <= 1 && !this.notifEnvoyees.has('imminente')) {
      this.notifEnvoyees.add('imminente');
      this.statut = 'Arrivée imminente';
      this.ajouterNotification(
        'success', '🏃 Allez à votre arrêt !',
        'La navette arrive dans moins d\'1 minute !', '🚨'
      );
      this.envoyerNotifNavigateur(
        '🚌 Navette imminente !',
        'Allez à votre arrêt maintenant !'
      );
    }

    if (this.etapeActuelle >= this.trajets.length) {
      this.statut = '✅ Arrivée';
      this.tempsRestant = 'Arrivée !';
      this.progression = 100;
      if (!this.notifEnvoyees.has('arrivee')) {
        this.notifEnvoyees.add('arrivee');
        this.ajouterNotification(
          'success', '🎉 Navette arrivée !',
          'Votre navette est à votre arrêt', '✅'
        );
      }
    }

    this.cdr.detectChanges();
  }

  // ===== CARTE =====
  initMap() {
    if (!this.mapDiv?.nativeElement) return;

    this.map = L.map(this.mapDiv.nativeElement).setView(
      [36.8500, 10.1700], 13
    );

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(this.map);

    // Marqueur arrêt employé (vert)
    const arretIcon = L.divIcon({
      html: `
        <div style="position:relative">
          <div style="background:#1D9E75;width:18px;height:18px;
                      border-radius:50%;border:3px solid white;
                      box-shadow:0 0 10px rgba(29,158,117,0.6)"></div>
          <div style="position:absolute;top:-28px;left:50%;
                      transform:translateX(-50%);background:#1D9E75;
                      color:white;font-size:10px;font-weight:700;
                      padding:2px 6px;border-radius:8px;white-space:nowrap">
            Votre arrêt
          </div>
        </div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    });

    L.marker([this.arretLat, this.arretLng], { icon: arretIcon })
      .addTo(this.map);

    // Marqueur départ navette (bleu)
    const departIcon = L.divIcon({
      html: `
        <div style="position:relative">
          <div style="background:#0F3460;width:14px;height:14px;
                      border-radius:50%;border:2px solid white"></div>
          <div style="position:absolute;top:-24px;left:50%;
                      transform:translateX(-50%);background:#0F3460;
                      color:white;font-size:10px;font-weight:700;
                      padding:2px 6px;border-radius:8px;white-space:nowrap">
            Départ
          </div>
        </div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7]
    });

   if (this.trajets.length > 0) {
  const depart = this.trajets[0];
  L.marker([depart.lat, depart.lng], { icon: departIcon }).addTo(this.map);
  const tousLesPoints = this.trajets.map(p => [p.lat, p.lng]);
  L.polyline(tousLesPoints, { color: '#D1D5DB', weight: 4, opacity: 0.6, dashArray: '8 6' }).addTo(this.map);
  this.map.fitBounds(tousLesPoints as any, { padding: [40, 40] });
}
  }

  updateNavettePosition(lat: number, lng: number) {
    if (!this.map) return;

    const navetteIcon = L.divIcon({
      html: `<div style="font-size:30px;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.4));
                         transform:scale(1.1)">${this.isVoiture ? '🚗' : '🚌'}</div>`,
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });

    if (this.navetteMarker) {
      this.navetteMarker.setLatLng([lat, lng]);
    } else {
      this.navetteMarker = L.marker([lat, lng], { icon: navetteIcon })
        .addTo(this.map)
        .bindPopup(`<b>${this.isVoiture ? 'Votre conducteur' : 'Votre navette'}</b>`);
    }
  }

  async dessinerTrajetRestant(navLat: number, navLng: number) {
    try {
      // Trajet restant en bleu via OSRM
      const res = await fetch(
        `https://router.project-osrm.org/route/v1/driving/` +
        `${navLng},${navLat};${this.arretLng},${this.arretLat}` +
        `?overview=full&geometries=geojson`
      );
      const data = await res.json();

      if (data.routes && data.routes[0]) {
        const coords = data.routes[0].geometry.coordinates
          .map((c: any) => [c[1], c[0]]);

        // Supprime l'ancien trajet restant
        if (this.routePolyline) {
          this.map.removeLayer(this.routePolyline);
        }

        // Dessine le nouveau trajet restant en bleu
        this.routePolyline = L.polyline(coords, {
          color: '#3B82F6',
          weight: 5,
          opacity: 0.85
        }).addTo(this.map);
      }
    } catch (e) { }
  }

  async calculerTemps(navLat: number, navLng: number): Promise<number> {
    try {
      const res = await fetch(
        `https://router.project-osrm.org/route/v1/driving/` +
        `${navLng},${navLat};${this.arretLng},${this.arretLat}` +
        `?overview=false`
      );
      const data = await res.json();

      if (data.routes && data.routes[0]) {
        const duree = Math.round(data.routes[0].duration / 60);
        const dist = (data.routes[0].distance / 1000).toFixed(1);

        this.tempsRestant = duree <= 1 ? 'Arrivée imminente !' : `${duree} min`;
        this.distance = `${dist} km`;
        return duree;
      }
    } catch (e) { }
    return 99;
  }

  // ===== NOTIFICATIONS =====
  ajouterNotification(
    type: 'info' | 'warning' | 'danger' | 'success',
    titre: string, message: string, icon: string
  ) {
    const now = new Date();
    const heure = now.getHours() + ':' +
      String(now.getMinutes()).padStart(2, '0');

    this.notifications.unshift({
      id: this.notifId++, type, titre, message, heure, icon
    });

    this.notificationsNonLues++;
    this.cdr.detectChanges();
  }

  envoyerNotifNavigateur(titre: string, message: string) {
    if ('Notification' in window) {
      Notification.requestPermission().then(p => {
        if (p === 'granted') new Notification(titre, { body: message });
      });
    }
  }

  marquerCommeLu() {
    this.notificationsNonLues = 0;
    this.showNotifications = false;
  }

  ngOnDestroy() {
    if (this.interval) clearInterval(this.interval);
    if (this.stompClient) this.stompClient.deactivate();
    if (this.map) this.map.remove();
  }
}