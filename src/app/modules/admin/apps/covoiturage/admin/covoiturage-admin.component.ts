import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

type AdminSection = 'statistiques' | 'navettes' | 'reservations' | 'cadeaux';
type ReservationType = 'navette' | 'covoiturage';

interface Navette {
  id: number;
  nom: string;
  ligne: string;
  arrets: string[];
  horaires: string;
  capacite: number;
  chauffeurNom: string;
  chauffeurPhoto: string;
  busNumber: string;
  actif: boolean;
  reservations: number;
}

interface Reservation {
  id: number;
  employeNom: string;
  employePhoto: string;
  type: 'navette' | 'covoiturage';
  trajet: string;
  date: string;
  heure: string;
  statut: 'Confirmée' | 'En attente' | 'Annulée';
}

interface Cadeau {
  id: number;
  titre: string;
  description: string;
  points: number;
  stock: number;
  echanges: number;
  actif: boolean;
  image: string;
  icon: string;
}

// ✅ APRÈS
@Component({
  selector: 'app-covoiturage-admin',
  standalone: false,
  templateUrl: './covoiturage-admin.component.html',
styleUrls: ['./covoiturage-admin.component.css']
})
export class CovoiturageAdminComponent implements OnInit {
  
  activeSection: AdminSection = 'statistiques';
  reservationType: ReservationType = 'navette';
  showModal = false;
  searchTerm = '';

  navettes: Navette[] = [
    {
      id: 1,
      nom: 'Navette Ligne A',
      ligne: 'Gare Centrale - Siège Social',
      arrets: ['Gare Centrale', 'République', 'Avenue Bourguiba', 'Siège Social'],
      horaires: '06:30 - 20:00',
      capacite: 25,
      chauffeurNom: 'Mohamed Ben Ali',
      chauffeurPhoto: 'https://i.pravatar.cc/150?img=12',
      busNumber: 'TUN-1234',
      actif: true,
      reservations: 18
    },
    {
      id: 2,
      nom: 'Navette Zone Industrielle',
      ligne: 'Métro Ligne 1 - Zone Industrielle',
      arrets: ['Métro République', 'Centre Ville', 'Rond-Point Ghazela', 'Zone Industrielle'],
      horaires: '06:00 - 22:00',
      capacite: 30,
      chauffeurNom: 'Ahmed Trabelsi',
      chauffeurPhoto: 'https://i.pravatar.cc/150?img=33',
      busNumber: 'TUN-5678',
      actif: true,
      reservations: 24
    },
    {
      id: 3,
      nom: 'Navette Express Lac',
      ligne: 'Tunis Centre - Berges du Lac',
      arrets: ['Place Barcelone', 'Passage', 'Lac 1', 'Lac 2', 'Berges du Lac'],
      horaires: '07:00 - 19:00',
      capacite: 40,
      chauffeurNom: 'Fatma Gharbi',
      chauffeurPhoto: 'https://i.pravatar.cc/150?img=45',
      busNumber: 'TUN-9012',
      actif: true,
      reservations: 32
    }
  ];

  reservations: Reservation[] = [
    {
      id: 1,
      employeNom: 'Sophie Martin',
      employePhoto: 'https://i.pravatar.cc/150?img=1',
      type: 'navette',
      trajet: 'Navette Ligne A',
      date: '2026-03-29',
      heure: '08:00',
      statut: 'Confirmée'
    },
    {
      id: 2,
      employeNom: 'Karim Mansour',
      employePhoto: 'https://i.pravatar.cc/150?img=68',
      type: 'navette',
      trajet: 'Navette Zone Industrielle',
      date: '2026-03-29',
      heure: '08:15',
      statut: 'En attente'
    },
    {
      id: 3,
      employeNom: 'Leila Ben Salem',
      employePhoto: 'https://i.pravatar.cc/150?img=5',
      type: 'covoiturage',
      trajet: 'Tunis Centre → Ariana',
      date: '2026-03-29',
      heure: '08:30',
      statut: 'Confirmée'
    },
    {
      id: 4,
      employeNom: 'Ali Mejri',
      employePhoto: 'https://i.pravatar.cc/150?img=11',
      type: 'navette',
      trajet: 'Navette Express Lac',
      date: '2026-03-29',
      heure: '07:45',
      statut: 'Confirmée'
    },
    {
      id: 5,
      employeNom: 'Fatma Gharbi',
      employePhoto: 'https://i.pravatar.cc/150?img=8',
      type: 'covoiturage',
      trajet: 'Menzah → Lac 2',
      date: '2026-03-29',
      heure: '08:15',
      statut: 'Confirmée'
    }
  ];

  cadeaux: Cadeau[] = [
  {
    id: 1,
    titre: 'Café gratuit',
    description: 'Un café premium au choix',
    points: 50,
    stock: 100,
    echanges: 45,
    actif: true,
    image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400',
    icon: '☕'
  },
  {
    id: 2,
    titre: 'Repas gratuit',
    description: 'Un repas au restaurant d\'entreprise',
    points: 150,
    stock: 50,
    echanges: 32,
    actif: true,
    image: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400',
    icon: '🍽️'
  },
  {
    id: 3,
    titre: 'Bon 20 DT',
    description: 'Bon d\'achat valable en magasin',
    points: 300,
    stock: 30,
    echanges: 18,
    actif: true,
    image: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=400',
    icon: '🎁'
  },
  {
    id: 4,
    titre: 'Jour de congé',
    description: 'Un jour de congé supplémentaire',
    points: 500,
    stock: 20,
    echanges: 8,
    actif: true,
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400',
    icon: '🌴'
  },
  {
    id: 5,
    titre: 'Parking 1 mois',
    description: 'Place de parking réservée pendant 1 mois',
    points: 800,
    stock: 10,
    echanges: 3,
    actif: true,
    image: 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=400',
    icon: '🅿️'
  },
  {
    id: 6,
    titre: 'Bon 50 DT',
    description: 'Bon d\'achat premium',
    points: 1000,
    stock: 15,
    echanges: 5,
    actif: false,
    image: 'https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?w=400',
    icon: '🎁'
  }
];

  get stats() {
    return {
      totalNavettes: this.navettes.length,
      totalReservations: this.reservations.length,
      reservationsNavette: this.reservations.filter(r => r.type === 'navette').length,
      reservationsCovoiturage: this.reservations.filter(r => r.type === 'covoiturage').length,
      co2Economise: 1245.5,
      pointsDistribues: 5680,
      tauxUtilisation: 78,
      totalCadeaux: this.cadeaux.length,
      cadeauxEchanges: this.cadeaux.reduce((sum, c) => sum + c.echanges, 0)
    };
  }
  get totalStock(): number {
  return this.cadeaux.reduce((sum, c) => sum + c.stock, 0);
}

  get filteredReservations() {
    return this.reservations.filter(r => r.type === this.reservationType);
  }

  constructor() {}

  ngOnInit(): void {}

  setActiveSection(section: AdminSection) {
    this.activeSection = section;
  }

  setReservationType(type: ReservationType) {
    this.reservationType = type;
  }

  openModal() {
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
  }
}