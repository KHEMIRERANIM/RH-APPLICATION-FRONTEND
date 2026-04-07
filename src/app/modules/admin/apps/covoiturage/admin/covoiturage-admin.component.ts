import { Component, OnInit } from '@angular/core';
import { BusService, Bus, BusPackRequest } from '../bus.service';
import { CovoiturageService } from '../covoiturage.service';
import { forkJoin, of } from 'rxjs';
import { UserService } from '../../../../../services/user.service';
import { catchError } from 'rxjs/operators';

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
  employeDetailsMap: Map<string, any> = new Map();
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

  reservations: any[] = [];
  trajets: any[] = [];

  cadeaux: Cadeau[] = [];

  constructor(
    private busService: BusService,
    private covoiturageService: CovoiturageService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.loadAllData();
  }

  private loadAllData(): void {
    this.isLoading = true;
    forkJoin({
      employees: this.userService.getAllEmployees(),
      buses: this.busService.getAll(),
      trajets: this.covoiturageService.getAllTrajets(),
      resNavette: this.covoiturageService.getAllReservationsNavette(),
      resCovoit: this.covoiturageService.getAllReservations()
    }).subscribe({
      next: (results) => {
        // 1. Map Employés
        results.employees.forEach((u: any) => {
          const nom = `${u.prenom || u.firstName || ''} ${u.nom || u.lastName || ''}`.trim();
          const uid = String(u.id);
          this.employesMap.set(uid, nom || `Employé ${uid.slice(0, 5)}`);
          this.employeDetailsMap.set(uid, u);
        });

        // 2. Data
        this.navettes = results.buses || [];
        this.trajets = results.trajets || [];
        this.reservationsNavette = results.resNavette || [];

        // 3. Fusionner les réservations pour l'onglet Admin
        const merged: any[] = [];

        // Navettes
        results.resNavette.forEach((rn: any) => {
          const bus = this.navettes.find(b => b.id === rn.busId);
          merged.push({
            id: rn.id,
            employeId: rn.employeId,
            employeNom: this.getNomEmploye(rn.employeId),
            employePhoto: `https://ui-avatars.com/api/?name=${this.getNomEmploye(rn.employeId)}&background=random`,
            type: 'navette',
            trajet: bus ? `${bus.depart} -> ${bus.arrivee}` : 'Navette',
            date: rn.date || (rn.joursSelectionnes ? rn.joursSelectionnes[0] : '—'),
            heure: bus?.heureDepart || '—',
            statut: this.mapStatut(rn.statut)
          });
        });

        // Covoiturage
        results.resCovoit.forEach((rc: any) => {
          const trajet = this.trajets.find(t => t.id === rc.trajetId);
          merged.push({
            id: rc.id,
            employeId: rc.employeId,
            employeNom: this.getNomEmploye(rc.employeId),
            employePhoto: `https://ui-avatars.com/api/?name=${this.getNomEmploye(rc.employeId)}&background=random`,
            type: 'covoiturage',
            trajet: trajet ? `${trajet.adresseDepart} -> ${trajet.adresseArrivee}` : 'Covoiturage',
            date: rc.dateReservation ? rc.dateReservation.split('T')[0] : '—',
            heure: trajet?.heureDepart || '—',
            statut: this.mapStatut(rc.statut)
          });
        });

        this.reservations = merged;
        this.isLoading = false;
        this.checkWaitlists();
      },
      error: (err) => {
        console.error('Erreur chargement admin:', err);
        this.isLoading = false;
      }
    });
  }

  private mapStatut(s: string): string {
    const st = String(s || '').toUpperCase();
    if (st === 'CONFIRME' || st === 'CONFIRMÉE') return 'Confirmée';
    if (st === 'ANNULE' || st === 'ANNULÉE') return 'Annulée';
    return 'En attente';
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

  reservantsParJour(busId: string | undefined, date: string): { id: string; employeId: string; statut: string; isWaitlisted: boolean }[] {
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

    // Identifier les bus du pack (Ordre : ACTIF en premier, puis date de création)
    const packBuses = this.navettes
      .filter(b => b.packId === packId)
      .sort((a, b) => {
        if (a.statut === 'ACTIF' && b.statut !== 'ACTIF') return -1;
        if (a.statut !== 'ACTIF' && b.statut === 'ACTIF') return 1;
        return new Date(a.dateCreation || 0).getTime() - new Date(b.dateCreation || 0).getTime();
      });

    const distribution = new Map<string, any[]>();
    packBuses.forEach(b => distribution.set(b.id!, []));

    // Distribution finale avec application des statuts de groupe
    let currentBusIndex = 0;
    packReservations.forEach(r => {
      while (currentBusIndex < packBuses.length && distribution.get(packBuses[currentBusIndex].id!)!.length >= packBuses[currentBusIndex].capacite) {
        currentBusIndex++;
      }
      
      const targetBus = currentBusIndex < packBuses.length ? packBuses[currentBusIndex] : packBuses[packBuses.length - 1];
      const targetBusId = targetBus.id!;
      
      if (targetBusId) {
        // Règle de groupe : Le statut "isWaitlisted" dépend de l'activation du bus
        const confirmedDays = Array.isArray(r.joursConfirmes) 
            ? r.joursConfirmes 
            : (r.joursConfirmes || '').split(',').map((d: any) => String(d).trim()).filter(Boolean);
            
        const isConfirmedByDay = confirmedDays.includes(date);
        const isWaitlisted = (targetBus.statut !== 'ACTIF' && !isConfirmedByDay);

        distribution.get(targetBusId)!.push({
          id: r.id,
          employeId: r.employeId,
          statut: String(r.statut),
          isWaitlisted: isWaitlisted
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
          this.loadBus();
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

  get filteredReservations(): any[] { 
    return this.reservations.filter(r => r.type === this.reservationType); 
  }
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
      // 2. Vérifier l'occupation pour CHAQUE jour du pack
      this.packDates.forEach(date => {
        const waitlistForDay = this.reservantsParJour(bus.id, date).filter(r => r.isWaitlisted);
        const ratio = bus.capacite > 0 ? (waitlistForDay.length / bus.capacite) : 0;
        
        // 3. Alerter si > 50% pour AU MOINS un jour
        if (ratio >= 0.5) {
          this.addNotification({
            id: `notif-${bus.id}-${date}`,
            type: 'warning',
            title: '⚡ Occupation Critique',
            message: `Le jour ${new Date(date).toLocaleDateString()} a atteint ${Math.round(ratio*100)}% de la capacité sur ${bus.marque}.`,
            busId: bus.id,
            date: date,
            actionLabel: 'Activer maintenant'
          });
        }
      });
    });
  }

  private addNotification(notif: any): void {
    if (!this.notifications.some(n => n.busId === notif.busId)) {
      this.notifications.push(notif);
    }
  }

  dismissNotification(id: any): void { 
    this.notifications = this.notifications.filter(n => n.id !== id); 
  }

  activateBus(busId: string, date?: string): void {
    if (date && !confirm(`Confirmer l'activation de ce bus pour le ${new Date(date).toLocaleDateString()} ?`)) return;
    if (!date && !confirm(`Voulez-vous activer ce bus de manière permanente ?`)) return;

    this.isLoading = true;
    
    if (date) {
      this.busService.activateForDay(busId, date).subscribe({
        next: () => {
          // 1. Déterminer les passagers à notifier (ceux qui étaient dans ce bus pour cette date)
          const passengers = this.reservantsParJour(busId, date);
          const bus = this.navettes.find(b => b.id === busId);
          const busName = bus ? `${bus.marque} ${bus.modele}` : 'Navette';

          passengers.forEach(p => {
            const notification = {
                destinataireId: p.employeId,
                type: 'BUS_ACTIVE',
                contenu: `Bonne nouvelle ! Votre navette "${busName}" pour le ${new Date(date).toLocaleDateString()} a été activée.`,
                reservationId: p.id
            };
            this.covoiturageService.sendNotification(notification).subscribe({
                error: (err) => console.error('Erreur envoi notification app', err)
            });
          });

          // 2. Refresh complet
          this.loadAllData();
          this.notifications = this.notifications.filter(n => n.busId !== busId || n.date !== date);
          this.isLoading = false;
          alert(`✅ Bus activé et ${passengers.length} notifications envoyées pour le ${new Date(date).toLocaleDateString()}`);
        },
        error: (err) => {
          console.error('Erreur activation jour', err);
          this.isLoading = false;
          alert('❌ Erreur lors de l\'activation du bus pour cette date.');
        }
      });
    } else {
      this.busService.update(busId, { statut: 'ACTIF' }).subscribe({
        next: () => {
          this.loadAllData();
          this.notifications = this.notifications.filter(n => n.busId !== busId);
          this.isLoading = false;
          alert('✅ Bus activé de manière permanente.');
        },
        error: (err) => {
          console.error('Erreur activation bus', err);
          this.isLoading = false;
          alert('❌ Erreur lors de l\'activation permanente du bus.');
        }
      });
    }
  }

  confirmReservation(res: any): void {
    const update = { statut: 'CONFIRME' };
    this.isLoading = true;
    
    const obs = res.type === 'navette' 
      ? this.covoiturageService.updateReservationStatusNavette(res.id, update)
      : this.covoiturageService.updateReservationStatus(res.id, update);

    obs.subscribe({
      next: () => {
        this.loadAllData();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erreur confirmation:', err);
        this.isLoading = false;
      }
    });
  }

  cancelReservation(res: any): void {
    if (!confirm('Voulez-vous vraiment annuler cette réservation ?')) return;
    
    this.isLoading = true;
    const obs = res.type === 'navette'
      ? this.covoiturageService.annulerReservationNavette(res.id)
      : this.covoiturageService.annulerReservation(res.id);

    obs.subscribe({
      next: () => {
        this.loadAllData();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erreur annulation:', err);
        this.isLoading = false;
      }
    });
  }
}