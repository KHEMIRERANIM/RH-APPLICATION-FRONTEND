import { Component, OnInit } from '@angular/core';
import { BusService, Bus } from '../bus.service';
import { CovoiturageService } from '../covoiturage.service';
import { UserService } from '../../../../../services/user.service';

type AdminSection = 'statistiques' | 'navettes' | 'reservations' | 'cadeaux';
type ReservationType = 'navette' | 'covoiturage';

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

@Component({
  selector: 'app-covoiturage-admin',
  standalone: false,
  templateUrl: './covoiturage-admin.component.html',
  styleUrls: ['./covoiturage-admin.component.css']
})
export class CovoiturageAdminComponent implements OnInit {

  activeSection: AdminSection = 'statistiques';
  reservationType: ReservationType = 'navette';
  searchTerm = '';
  isLoading = false;
  errorMessage = '';
  showModal = false;
  isEditing = false;
  submitted = false;
  defaultPhotoUrl = 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400';


  busForm: Bus = this.emptyBus();
  navettes: Bus[] = [];
  /** Toutes les réservations navette (pour afficher les employés par bus) */
  reservationsNavette: any[] = [];
  employesMap: Map<string, string> = new Map();

  typeCarburantOptions = ['DIESEL', 'ESSENCE', 'ELECTRIQUE', 'HYBRIDE'];
  statutOptions = ['ACTIF', 'INACTIF', 'EN_MAINTENANCE'];
  joursOptions = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  joursSelectionnes: string[] = [];
  ligneOptions = [
    '-',
    'Gare Centrale - Siège Social',
    'Métro Ligne 1 - Zone Industrielle',
    'Tunis Centre - Berges du Lac',
    'Place Barcelone - Ariana',
    'Bab Souika - Manouba'
  ];

  reservations: Reservation[] = [
    { id: 1, employeNom: 'Sophie Martin', employePhoto: 'https://i.pravatar.cc/150?img=1', type: 'navette', trajet: 'Navette Ligne A', date: '2026-03-29', heure: '08:00', statut: 'Confirmée' },
    { id: 2, employeNom: 'Karim Mansour', employePhoto: 'https://i.pravatar.cc/150?img=68', type: 'navette', trajet: 'Navette Zone Industrielle', date: '2026-03-29', heure: '08:15', statut: 'En attente' },
    { id: 3, employeNom: 'Leila Ben Salem', employePhoto: 'https://i.pravatar.cc/150?img=5', type: 'covoiturage', trajet: 'Tunis Centre → Ariana', date: '2026-03-29', heure: '08:30', statut: 'Confirmée' },
    { id: 4, employeNom: 'Ali Mejri', employePhoto: 'https://i.pravatar.cc/150?img=11', type: 'navette', trajet: 'Navette Express Lac', date: '2026-03-29', heure: '07:45', statut: 'Confirmée' },
    { id: 5, employeNom: 'Fatma Gharbi', employePhoto: 'https://i.pravatar.cc/150?img=8', type: 'covoiturage', trajet: 'Menzah → Lac 2', date: '2026-03-29', heure: '08:15', statut: 'Confirmée' }
  ];

  cadeaux: Cadeau[] = [
    { id: 1, titre: 'Café gratuit', description: 'Un café premium au choix', points: 50, stock: 100, echanges: 45, actif: true, image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400', icon: '☕' },
    { id: 2, titre: 'Repas gratuit', description: "Un repas au restaurant d'entreprise", points: 150, stock: 50, echanges: 32, actif: true, image: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400', icon: '🍽️' },
    { id: 3, titre: 'Bon 20 DT', description: "Bon d'achat valable en magasin", points: 300, stock: 30, echanges: 18, actif: true, image: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=400', icon: '🎁' },
    { id: 4, titre: 'Jour de congé', description: 'Un jour de congé supplémentaire', points: 500, stock: 20, echanges: 8, actif: true, image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400', icon: '🌴' },
    { id: 5, titre: 'Parking 1 mois', description: 'Place de parking réservée pendant 1 mois', points: 800, stock: 10, echanges: 3, actif: true, image: 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=400', icon: '🅿️' },
    { id: 6, titre: 'Bon 50 DT', description: "Bon d'achat premium", points: 1000, stock: 15, echanges: 5, actif: false, image: 'https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?w=400', icon: '🎁' }
  ];

  constructor(
    private busService: BusService,
    private covoiturageService: CovoiturageService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.loadEmployes();
    this.loadBus();
    this.loadReservationsNavette();
  }

  private loadEmployes(): void {
    this.userService.getAllEmployees().subscribe({
      next: (users: any[]) => {
        users.forEach((u: any) => {
          const nom = `${u.prenom || u.firstName || ''} ${u.nom || u.lastName || ''}`.trim();
          this.employesMap.set(String(u.id), nom || `ID ${String(u.id).slice(0, 8)}`);
        });
      },
      error: () => {}
    });
  }

  loadReservationsNavette(): void {
    this.covoiturageService.getAllReservationsNavette().subscribe({
      next: (data) => {
        this.reservationsNavette = data || [];
      },
      error: () => {
        this.reservationsNavette = [];
      }
    });
  }

  getNomEmploye(id: string | undefined): string {
    if (!id) return '—';
    return this.employesMap.get(String(id)) || `Employé ${String(id).slice(0, 8)}…`;
  }

  /** Réservations actives / en attente pour ce bus (non annulées) */
  reservantsPourBus(busId: string | undefined): { employeId: string; statut: string }[] {
    if (!busId || !this.reservationsNavette.length) return [];
    return this.reservationsNavette
      .filter(
        (r) =>
          r.busId === busId &&
          r.statut &&
          String(r.statut).toUpperCase() !== 'ANNULE'
      )
      .map((r) => ({ employeId: r.employeId, statut: String(r.statut) }));
  }

  loadBus(): void {
    this.isLoading = true;
    this.busService.getAll().subscribe({
      next: (data) => {
        this.navettes = data;
        this.isLoading = false;
        this.loadReservationsNavette();
      },
      error: () => { this.errorMessage = 'Erreur de chargement'; this.isLoading = false; }
    });
  }

 openModal(): void {
  this.isEditing = false;
  this.joursSelectionnes = [];
  this.busForm = this.emptyBus();
  this.submitted = false;
  this.showModal = true;
}

openEditModal(bus: Bus): void {
  console.log('Bus à modifier:', bus);
  
  this.isEditing = true;
  this.busForm = { ...bus };
  this.submitted = false;
  
  // S'assurer que la photo existe
  if (!this.busForm.photoUrl) {
    this.busForm.photoUrl = this.defaultPhotoUrl;
  }
  
  this.busForm.depart = '';
  this.busForm.arrivee = '';
  
  if (bus.ligne && bus.ligne.includes(' - ')) {
    const [depart, arrivee] = bus.ligne.split(' - ');
    this.busForm.depart = depart;
    this.busForm.arrivee = arrivee;
  }
  
  this.joursSelectionnes = bus.joursDisponibles ? bus.joursDisponibles.split(',').map(j => j.trim()) : [];
  this.showModal = true;
}

  toggleJour(jour: string): void {
    const index = this.joursSelectionnes.indexOf(jour);
    if (index > -1) {
      this.joursSelectionnes.splice(index, 1);
    } else {
      this.joursSelectionnes.push(jour);
    }
    this.busForm.joursDisponibles = this.joursSelectionnes.join(',');
  }

  isJourSelected(jour: string): boolean {
    return this.joursSelectionnes.includes(jour);
  }

  isFormValid(): boolean {
    return !!(
      this.busForm.marque?.trim() &&
      this.busForm.modele?.trim() &&
      this.busForm.immatriculation?.trim() &&
      this.busForm.capacite > 0 &&
   this.busForm.depart?.trim() &&
    this.busForm.arrivee?.trim() &&      this.busForm.heureDepart?.trim() &&
      this.busForm.dureeMinutes > 0 &&
      this.joursSelectionnes.length > 0
    );
  }
emptyBus(): Bus {
  return {
    marque: '', modele: '', immatriculation: '',
    capacite: 0, typeCarburant: 'DIESEL', ligne: '',
    depart: '', arrivee: '',
    heureDepart: '', dureeMinutes: 0, joursDisponibles: '',
    statut: 'ACTIF',
    placesRestantes: 0,
    photoUrl: this.defaultPhotoUrl
  };
}

  saveBus(): void {
  this.submitted = true;
  
  if (!this.isFormValid()) return;
  
  // S'assurer que la photo a une valeur
  const photoUrlValue = this.busForm.photoUrl && this.busForm.photoUrl.trim() !== '' 
    ? this.busForm.photoUrl 
    : this.defaultPhotoUrl;
  
  // Concaténer départ et arrivée avec tiret
  const busToSave = {
    ...this.busForm,
    ligne: `${this.busForm.depart} - ${this.busForm.arrivee}`,
    placesRestantes: this.busForm.capacite,
    photoUrl: photoUrlValue  // Ajoutez cette ligne explicitement
  };
  
  if (this.isEditing && this.busForm.id) {
    this.busService.update(this.busForm.id, busToSave).subscribe({
      next: () => { 
        this.loadBus(); 
        this.closeModal(); 
      },
      error: (err) => { 
        console.error('Erreur modification:', err);
        this.errorMessage = 'Erreur lors de la modification'; 
      }
    });
  } else {
    this.busService.create(busToSave).subscribe({
      next: () => { 
        this.loadBus(); 
        this.closeModal(); 
      },
      error: (err) => { 
        console.error('Erreur création:', err);
        this.errorMessage = 'Erreur lors de la création'; 
      }
    });
  }
}

  deleteBus(id: string): void {
    if (confirm('Supprimer ce bus ?')) {
      this.busService.delete(id).subscribe({
        next: () => this.loadBus(),
        error: () => { this.errorMessage = 'Erreur lors de la suppression'; }
      });
    }
  }


 formatLigne(event: any) {
  let value = event.target.value;
  // Si la valeur ne commence pas par "- ", on ajoute le tiret
  if (value && !value.startsWith('- ')) {
    this.busForm.ligne = '- ' + value.replace(/^- /, '');
  } else if (!value) {
    this.busForm.ligne = '- ';
  }
}
  closeModal(): void {
    this.showModal = false;
    this.joursSelectionnes = [];
    this.busForm = this.emptyBus();
    this.errorMessage = '';
  }

  

  setActiveSection(section: AdminSection): void { this.activeSection = section; }
  setReservationType(type: ReservationType): void { this.reservationType = type; }

  get filteredNavettes(): Bus[] {
    if (!this.searchTerm) return this.navettes;
    return this.navettes.filter(n =>
      n.ligne?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      n.marque?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      n.immatriculation?.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  get filteredReservations(): Reservation[] {
    return this.reservations.filter(r => r.type === this.reservationType);
  }

  get totalStock(): number {
    return this.cadeaux.reduce((sum, c) => sum + c.stock, 0);
  }

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

 
}