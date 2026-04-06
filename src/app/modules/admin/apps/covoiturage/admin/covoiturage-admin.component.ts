import { Component, OnInit } from '@angular/core';
import { BusService, Bus, BusPackRequest } from '../bus.service';
import { CovoiturageService } from '../covoiturage.service';
import { forkJoin } from 'rxjs';

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

interface PackBusEntry {
  statut: 'ACTIF' | 'INACTIF';
  capacite: number;
  marque: string;
  modele: string;
  immatriculation: string;
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

  createBusPack = false;
  packBusList: PackBusEntry[] = [];
  packDates: string[] = [];
  busForm: Bus = this.emptyBus();

  navettes: Bus[] = [];
  reservationsNavette: any[] = [];
  employesMap: Map<string, string> = new Map();
  notifications: any[] = [];

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
    { id: 2, employeNom: 'Karim Mansour', employePhoto: 'https://i.pravatar.cc/150?img=68', type: 'navette', trajet: 'Navette Zone Industrielle', date: '2026-03-29', heure: '08:15', statut: 'En attente' }
  ];

  cadeaux: Cadeau[] = [
    { id: 1, titre: 'Café gratuit', description: 'Un café premium au choix', points: 50, stock: 100, echanges: 45, actif: true, image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400', icon: '☕' }
  ];

  constructor(
    private busService: BusService,
    private covoiturageService: CovoiturageService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.loadEmployes();
    this.loadBus();
  }

  private loadEmployes(): void {
    this.userService.getAllEmployees().subscribe({
      next: (users: any[]) => {
        users.forEach((u: any) => {
          const nom = `${u.prenom || u.firstName || ''} ${u.nom || u.lastName || ''}`.trim();
          this.employesMap.set(String(u.id), nom || `ID ${String(u.id).slice(0, 8)}`);
        });
      }
    });
  }

  loadReservationsNavette(): void {
    this.covoiturageService.getAllReservationsNavette().subscribe({
      next: (data) => {
        this.reservationsNavette = data || [];
        this.checkWaitlists();
      },
      error: () => this.reservationsNavette = []
    });
  }

  getNomEmploye(id: string | undefined): string {
    if (!id) return '—';
    return this.employesMap.get(String(id)) || `Employé ${String(id).slice(0, 8)}…`;
  }

  reservantsParJour(busId: string | undefined, date: string): { employeId: string; statut: string; isWaitlisted: boolean }[] {
    if (!busId || !this.reservationsNavette.length || !date) return [];
    
    const bus = this.navettes.find(b => b.id === busId);
    if (!bus) return [];

    const packId = bus.packId;
    const capacity = bus.capacite || 0;

    // Charger TOUTES les réservations du pack pour ce jour
    const packReservations = this.reservationsNavette
      .filter(r => {
        const rBus = this.navettes.find(b => b.id === r.busId);
        const st = String(r.statut || '').toUpperCase();
        return rBus?.packId === packId && 
               st !== 'ANNULE' &&
               (r.date === date || (r.joursSelectionnes && r.joursSelectionnes.includes(date)));
      })
      .sort((a, b) => new Date(a.dateCreation || 0).getTime() - new Date(b.dateCreation || 0).getTime());

    // Identifier les bus du pack (triés : ACTIF d'abord)
    const packBuses = this.navettes
      .filter(b => b.packId === packId)
      .sort((a, b) => (a.statut === 'ACTIF' ? -1 : 1));

    const distribution = new Map<string, any[]>();
    packBuses.forEach(b => distribution.set(b.id!, []));

    const activeBusIds = packBuses.filter(b => b.statut === 'ACTIF').map(b => b.id);

    // Distribuer les passagers
    let busIndex = 0;
    packReservations.forEach(r => {
      while (busIndex < packBuses.length && distribution.get(packBuses[busIndex].id!)!.length >= packBuses[busIndex].capacite) {
        busIndex++;
      }
      
      const targetBusId = busIndex < packBuses.length ? packBuses[busIndex].id : packBuses[packBuses.length - 1].id;
      if (targetBusId) {
        distribution.get(targetBusId)!.push({
          employeId: r.employeId,
          statut: String(r.statut),
          isWaitlisted: !activeBusIds.includes(targetBusId) // Waitlisted si le bus cible n'est pas ACTIF
        });
      }
    });

    return distribution.get(busId) || [];
  }

  countConfirmesParJour(busId: string | undefined, date: string): number {
    return this.reservantsParJour(busId, date).filter(r => !r.isWaitlisted).length;
  }

  addPackDate(date: string): void {
    if (date && !this.packDates.includes(date)) {
      this.packDates.push(date);
      this.packDates.sort();
    }
  }

  removePackDate(index: number): void {
    this.packDates.splice(index, 1);
  }

  reservantsPourBus(busId: string | undefined): { employeId: string; statut: string }[] {
    if (!busId || !this.reservationsNavette.length) return [];
    return this.reservationsNavette
      .filter(r => r.busId === busId && r.statut && String(r.statut).toUpperCase() !== 'ANNULE')
      .map(r => ({ employeId: r.employeId, statut: String(r.statut) }));
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
    this.createBusPack = false;
    this.packBusList = [];
    this.packDates = [];
    this.submitted = false;
    this.showModal = true;
  }

  openEditModal(bus: Bus): void {
    this.isEditing = true;
    this.busForm = { ...bus };
    this.submitted = false;
    if (!this.busForm.photoUrl) this.busForm.photoUrl = this.defaultPhotoUrl;
    if (bus.ligne && bus.ligne.includes(' - ')) {
      const [depart, arrivee] = bus.ligne.split(' - ');
      this.busForm.depart = depart;
      this.busForm.arrivee = arrivee;
    } else {
      this.busForm.depart = bus.ligne || '';
      this.busForm.arrivee = '';
    }
    this.joursSelectionnes = bus.joursDisponibles ? bus.joursDisponibles.split(',').map(j => j.trim()) : [];
    this.showModal = true;
  }

  toggleJour(jour: string): void {
    const index = this.joursSelectionnes.indexOf(jour);
    if (index > -1) this.joursSelectionnes.splice(index, 1);
    else this.joursSelectionnes.push(jour);
    this.busForm.joursDisponibles = this.joursSelectionnes.join(',');
  }

  isJourSelected(jour: string): boolean {
    return this.joursSelectionnes.includes(jour);
  }

  isFormValid(): boolean {
    const base = !!(this.busForm.depart?.trim() && this.busForm.arrivee?.trim() && this.busForm.heureDepart?.trim() && this.busForm.dureeMinutes > 0 && this.joursSelectionnes.length > 0);
    if (this.isEditing) {
      return base && !!(this.busForm.marque?.trim() && this.busForm.modele?.trim() && this.busForm.immatriculation?.trim() && this.busForm.capacite > 0);
    }
    if (this.createBusPack) {
      return base && this.packDates.length > 0 && this.packBusList.length >= 1 && this.packBusList.every(b => b.capacite > 0 && !!b.marque?.trim() && !!b.modele?.trim() && !!b.immatriculation?.trim()) && this.packBusList.some(b => b.statut === 'ACTIF');
    }
    return base && !!(this.busForm.marque?.trim() && this.busForm.modele?.trim() && this.busForm.immatriculation?.trim() && this.busForm.capacite > 0);
  }

  emptyBus(): Bus {
    return {
      marque: '', modele: '', immatriculation: '',
      capacite: 0, typeCarburant: 'DIESEL', ligne: '',
      depart: '', arrivee: '',
      heureDepart: '', dureeMinutes: 0,
      joursDisponibles: '',
      statut: 'ACTIF',
      placesRestantes: 0,
      photoUrl: this.defaultPhotoUrl
    };
  }

  saveBus(): void {
    this.submitted = true;
    if (!this.isFormValid()) return;

    const photoUrlValue = this.busForm.photoUrl?.trim() || this.defaultPhotoUrl;
    const fullLigne = `${this.busForm.depart} - ${this.busForm.arrivee}`;

    if (this.isEditing && this.busForm.id) {
      const occupiedCount = this.reservantsPourBus(this.busForm.id).length;
      const busToUpdate: Partial<Bus> = {
        marque: this.busForm.marque,
        modele: this.busForm.modele,
        immatriculation: this.busForm.immatriculation,
        capacite: this.busForm.capacite,
        typeCarburant: this.busForm.typeCarburant,
        ligne: fullLigne,
        heureDepart: this.busForm.heureDepart,
        dureeMinutes: this.busForm.dureeMinutes,
        joursDisponibles: this.joursSelectionnes.join(','),
        statut: this.busForm.statut,
        placesRestantes: this.busForm.capacite - occupiedCount,
        photoUrl: photoUrlValue
      };
      const statusChangedToActif = this.busForm.statut === 'ACTIF' && busToUpdate.statut === 'ACTIF';
      // On vérifie si l'ancien statut était INACTIF/EN_MAINTENANCE
      const wasInactive = this.navettes.find(b => b.id === this.busForm.id)?.statut !== 'ACTIF';

      this.busService.update(this.busForm.id, busToUpdate).subscribe({
        next: () => {
          if (wasInactive && busToUpdate.statut === 'ACTIF') {
            console.log('Statut manuel passé à ACTIF, déclenchement transfert...');
            this.activateBus(this.busForm.id!);
          } else {
            this.loadBus();
          }
          this.closeModal();
        },
        error: () => this.errorMessage = 'Erreur lors de la modification'
      });
    } else if (this.createBusPack && this.packBusList.length >= 1) {
      const packId = crypto.randomUUID();
      const requests = this.packBusList.map(packBus =>
        this.busService.create({
          marque: packBus.marque,
          modele: packBus.modele,
          immatriculation: packBus.immatriculation,
          capacite: packBus.capacite,
          placesRestantes: packBus.capacite,
          statut: packBus.statut,
          typeCarburant: this.busForm.typeCarburant,
          ligne: fullLigne,
          heureDepart: this.busForm.heureDepart,
          dureeMinutes: this.busForm.dureeMinutes,
          joursDisponibles: this.joursSelectionnes.join(','),
          photoUrl: photoUrlValue,
          packId: packId,
          packDates: [...this.packDates]
        })
      );
      forkJoin(requests).subscribe({
        next: () => { this.loadBus(); this.closeModal(); },
        error: () => this.errorMessage = 'Erreur lors de la création du pack'
      });
    } else {
      const newBus: Partial<Bus> = {
        marque: this.busForm.marque,
        modele: this.busForm.modele,
        immatriculation: this.busForm.immatriculation,
        capacite: this.busForm.capacite,
        placesRestantes: this.busForm.capacite,
        typeCarburant: this.busForm.typeCarburant,
        ligne: fullLigne,
        heureDepart: this.busForm.heureDepart,
        dureeMinutes: this.busForm.dureeMinutes,
        joursDisponibles: this.joursSelectionnes.join(','),
        statut: this.busForm.statut,
        photoUrl: photoUrlValue
      };
      this.busService.create(newBus).subscribe({
        next: () => { this.loadBus(); this.closeModal(); },
        error: () => this.errorMessage = 'Erreur lors de la création'
      });
    }
  }

  get packBusActifCount(): number { return this.packBusList.filter(b => b.statut === 'ACTIF').length; }
  get packBusInactifCount(): number { return this.packBusList.filter(b => b.statut === 'INACTIF').length; }
  get busSansPack(): Bus[] { return this.filteredNavettes.filter(b => !b.packId); }

  get busParPack(): { packId: string; buses: Bus[] }[] {
    const map = new Map<string, Bus[]>();
    this.filteredNavettes.filter(b => !!b.packId).forEach(b => {
      const key = b.packId!;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(b);
    });
    return Array.from(map.entries()).map(([packId, buses]) => ({ packId, buses }));
  }

  countActifs(buses: Bus[]): number { return buses.filter(b => b.statut === 'ACTIF').length; }

  addPackBus(): void {
    this.packBusList.push({ statut: 'INACTIF', capacite: 0, marque: '', modele: '', immatriculation: '' });
  }

  removePackBus(index: number): void { this.packBusList.splice(index, 1); }

  deleteBus(id: string): void {
    if (confirm('Supprimer ce bus ?')) {
      this.busService.delete(id).subscribe({
        next: () => this.loadBus(),
        error: () => this.errorMessage = 'Erreur lors de la suppression'
      });
    }
  }

  formatLigne(event: any) {
    let value = event.target.value;
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
    this.createBusPack = false;
    this.packBusList = [];
    this.submitted = false;
  }

  setActiveSection(section: AdminSection): void { this.activeSection = section; }
  setReservationType(type: ReservationType): void { this.reservationType = type; }

  get filteredNavettes(): Bus[] {
    if (!this.searchTerm) return this.navettes;
    return this.navettes.filter(n => n.ligne?.toLowerCase().includes(this.searchTerm.toLowerCase()) || n.marque?.toLowerCase().includes(this.searchTerm.toLowerCase()) || n.immatriculation?.toLowerCase().includes(this.searchTerm.toLowerCase()));
  }

  get filteredReservations(): Reservation[] { return this.reservations.filter(r => r.type === this.reservationType); }
  get totalStock(): number { return this.cadeaux.reduce((sum, c) => sum + c.stock, 0); }

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

  private checkWaitlists(): void {
    // 1. Trouver les bus de réserve (INACTIF) qui font partie d'un pack
    const reserveBuses = this.navettes.filter(b => b.statut === 'INACTIF' && !!b.packId);
    
    reserveBuses.forEach(bus => {
      // 2. Compter toutes les personnes en attente d'activation pour ce pack
      // On regroupe par packId car l'activation d'un bus de réserve bénéficie à tout le pack
      const waitlist = this.reservationsNavette.filter(r => 
        r.busId === bus.id && 
        String(r.statut || '').includes('ACTIVATION')
      );
      
      // 3. Calculer le ratio d'occupation potentielle du bus de réserve
      const ratio = bus.capacite > 0 ? (waitlist.length / bus.capacite) : 0;
      
      // 4. Alerter si > 50%
      if (ratio >= 0.5) {
        this.addNotification({
          id: `notif-${bus.id}`,
          type: 'warning',
          title: '⚡ Activation Recommandée',
          message: `La file d'attente pour la ligne "${bus.ligne}" a atteint ${Math.round(ratio*100)}% de la capacité du bus de réserve ${bus.marque}.`,
          busId: bus.id,
          actionLabel: 'Activer maintenant'
        });
      }
    });
  }

  private addNotification(notif: any): void {
    if (!this.notifications.some(n => n.busId === notif.busId)) {
      this.notifications.push(notif);
    }
  }

  dismissNotification(id: any): void { this.notifications = this.notifications.filter(n => n.id !== id); }

  activateBus(busId: string): void {
    const busBeingActivated = this.navettes.find(b => b.id === busId);
    const packId = busBeingActivated?.packId;
    this.isLoading = true;

    this.busService.update(busId, { statut: 'ACTIF' }).subscribe({
      next: () => {
        // 1. Identifier les candidats au transfert (Toute personne en attente ou en overflow dans le pack)
        const candidates: any[] = [];
        
        this.navettes.filter(b => b.packId === packId && b.statut === 'ACTIF' && b.id !== busId).forEach(activeBus => {
          this.packDates.forEach(date => {
            const allForDay = this.reservantsParJour(activeBus.id, date);
            allForDay.filter(r => r.isWaitlisted).forEach(ov => {
              const res = this.reservationsNavette.find(rn => 
                rn.employeId === ov.employeId && 
                (rn.date === date || (rn.joursSelectionnes && rn.joursSelectionnes.includes(date))) &&
                rn.busId === activeBus.id
              );
              if (res && !candidates.some(c => c.id === res.id)) candidates.push(res);
            });
          });
        });

        this.reservationsNavette.filter(r => {
          const resBus = this.navettes.find(b => b.id === r.busId);
          return resBus?.packId === packId && String(r.statut || '').includes('ACTIVATION');
        }).forEach(r => {
          if (!candidates.some(c => c.id === r.id)) candidates.push(r);
        });

        // 2. Transférer ces réservations vers le NOUVEAU bus et confirmer
        if (candidates.length > 0) {
          const updates = candidates.map(r => 
            this.covoiturageService.updateReservationStatusNavette(r.id, { 
              statut: 'CONFIRME',
              busId: busId 
            })
          );

          forkJoin(updates).subscribe({
            next: () => {
              this.loadBus();
              this.notifications = this.notifications.filter(n => n.busId !== busId);
            },
            error: (err) => {
              console.error('Erreur lors du transfert des passagers', err);
              this.loadBus();
            }
          });
        } else {
          this.loadBus();
          this.notifications = this.notifications.filter(n => n.busId !== busId);
        }
      },
      error: (err) => {
        console.error('Erreur activation bus', err);
        this.isLoading = false;
      }
    });
  }
}