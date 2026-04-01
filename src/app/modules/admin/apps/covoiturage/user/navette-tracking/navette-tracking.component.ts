import { Component, OnInit, OnDestroy, Input, ElementRef, ViewChild } from '@angular/core';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { CommonModule } from '@angular/common'; // ← AJOUTE


declare var L: any;

@Component({
  selector: 'app-navette-tracking',
  templateUrl: './navette-tracking.component.html',
    standalone: false  // ← AJOUTE CECI

})
export class NavetteTrackingComponent implements OnInit, OnDestroy {

  @Input() vehiculeId: string = '';
  @ViewChild('trackingMap') mapDiv!: ElementRef;

  private stompClient!: Client;
  private map: any;
  private navetteMarker: any;

  tempsRestant: string = 'Calcul en cours...';
  distance: string = '-';
  statut: string = 'Connexion...';

  // Position de l'arrêt de l'employé (à récupérer depuis son profil)
  arretLat: number = 36.8065;
  arretLng: number = 10.1815;

  ngOnInit() {
    this.initWebSocket();
  }

  ngAfterViewInit() {
    setTimeout(() => this.initMap(), 300);
  }

  initMap() {
    this.map = L.map(this.mapDiv.nativeElement).setView(
      [this.arretLat, this.arretLng], 13
    );

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(this.map);

    // Marqueur de l'arrêt de l'employé
    const arretIcon = L.divIcon({
      html: `<div style="background:#1D9E75;width:14px;height:14px;
                         border-radius:50%;border:2px solid white;
                         box-shadow:0 0 6px rgba(0,0,0,0.4)"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7]
    });

    L.marker([this.arretLat, this.arretLng], { icon: arretIcon })
      .addTo(this.map)
      .bindPopup('Votre arrêt')
      .openPopup();
  }

  initWebSocket() {
    this.stompClient = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8080/ws-tracking'),
      onConnect: () => {
        this.statut = 'Connecté';

        // Écoute la position de la navette
        this.stompClient.subscribe(
          `/topic/navette/${this.vehiculeId}`,
          (message) => {
            const position = JSON.parse(message.body);
            this.updateNavettePosition(position.latitude, position.longitude);
          }
        );
      },
      onDisconnect: () => {
        this.statut = 'Déconnecté';
      }
    });

    this.stompClient.activate();
  }

  updateNavettePosition(lat: number, lng: number) {
    const navetteIcon = L.divIcon({
      html: `<div style="background:#0F3460;width:18px;height:18px;
                         border-radius:50%;border:2px solid white;
                         box-shadow:0 0 8px rgba(0,0,0,0.5)">🚌</div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    if (this.navetteMarker) {
      this.navetteMarker.setLatLng([lat, lng]);
    } else {
      this.navetteMarker = L.marker([lat, lng], { icon: navetteIcon })
        .addTo(this.map)
        .bindPopup('Navette en route');
    }

    // Calcul du temps restant via OSRM
    this.calculerTempsRestant(lat, lng);
  }

  async calculerTempsRestant(navLat: number, navLng: number) {
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
        this.statut = 'En route';
      }
    } catch (e) {
      console.error('Erreur calcul temps', e);
    }
  }

  ngOnDestroy() {
    if (this.stompClient) {
      this.stompClient.deactivate();
    }
    if (this.map) {
      this.map.remove();
    }
  }
}