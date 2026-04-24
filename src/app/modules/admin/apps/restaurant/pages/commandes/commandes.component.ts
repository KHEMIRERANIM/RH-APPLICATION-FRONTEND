import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { take } from 'rxjs/operators';
import { Commande } from 'src/app/models/commande';
import { CommandeService } from 'src/app/services/commande.service';
import { MenuService } from 'src/app/services/menu.service';
import { Menu, Plat } from 'src/app/models/menu';
import { RoleService } from 'app/core/auth/role.service';
import { AllergieIaService, ResultatVerification } from 'src/app/services/allergie-ia.service';
import { FideliteService } from 'src/app/services/fidelite.service';
import { Fidelite } from 'src/app/models/fidelite';
import { NotificationsService } from 'app/layout/common/notifications/notifications.service';

@Component({
  selector: 'app-commandes',
  templateUrl: './commandes.component.html',
  styleUrls: ['./commandes.component.scss']
})
export class CommandesComponent implements OnInit, OnDestroy {
  commandes: Commande[] = [];
  menus: Menu[] = [];
  platsDisponibles: Plat[] = [];
  platsSelectionnes: string[] = [];
  menusCommandesIds: string[] = [];
  usersCache: { [id: string]: string } = {};

  loading = false;
  errorMsg = '';
  successMsg = '';
  selectedStatut = '';
  searchUserId = '';
  showForm = false;
  step = 1;
  statuts = ['en_attente', 'confirmee', 'prete', 'livree'];
  newCommande = { menuId: '' };
  codeRetrait = '';
  codeErreur = '';

  showModalPaiement = false;
  commandeEnCoursDePaiement: Commande | null = null;
  modePaiementSelectionne: 'especes' | 'salaire' | '' = '';
  paiementEnCours = false;

  commandeEnModification: Commande | null = null;

  allergiesEmploye: string[] = [];
  nouvelleAllergie = '';
  alertesAllergie: ResultatVerification[] = [];
  analyseEnCours = false;

  fidelite: Fidelite | null = null;
  showHistorique = false;
  reductionEnCours = false;
  readonly SEUIL_REDUCTION = 500;

  fidelites: any[] = [];
  showDashboardFidelite = false;

  private refreshInterval: any;
  private readonly DELAI_EXPIRATION_MIN = 2;

  constructor(
    private commandeService: CommandeService,
    private menuService: MenuService,
    private http: HttpClient,
    public roleService: RoleService,
    private allergieIa: AllergieIaService,
    private fideliteService: FideliteService,
    private notificationsService: NotificationsService
  ) {}

  ngOnInit(): void {
    this.loadMenus();
    const saved = localStorage.getItem('allergies_' + this.roleService.userId);
    if (saved) this.allergiesEmploye = JSON.parse(saved);
    if (this.roleService.isEmploye()) {
      this.loadFidelite();
      this.refreshInterval = setInterval(() => this.loadCommandes(), 30_000);
    }
    if (this.roleService.isAdmin()) {
      this.loadFidelites();
    }
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
  }

  get alertes(): any[] {
    const result = [];
    for (const c of this.commandes) {
      if (c.statut !== 'prete') continue;
      const raw = (c as any)['datePrete'];
      if (!raw) continue;
      const normalized = raw.replace(/(\.\d{1,2})$/, '$10').substring(0, 19);
      const datePrete = new Date(normalized.replace('T', ' '));
      if (isNaN(datePrete.getTime())) continue;
      const minutes = Math.floor((Date.now() - datePrete.getTime()) / 60000);
      result.push({
        commandeId:       c.id,
        codeRetrait:      (c as any).codeRetrait || '----',
        minutesRestantes: Math.max(0, 2 - minutes),
        enRetard:         minutes >= 1
      });
    }
    return result;
  }

  getProgressWidth(minutesRestantes: number): number {
    return Math.round((minutesRestantes / this.DELAI_EXPIRATION_MIN) * 100);
  }

  loadCommandes(): void {
    this.loading = true;
    const obs = this.roleService.isAdmin()
      ? this.commandeService.getAllCommandes()
      : this.commandeService.getCommandesByUser(this.roleService.userId);
    obs.subscribe({
      next: (data) => {
        this.commandes = data.sort((a, b) =>
          new Date(b.dateCommande).getTime() - new Date(a.dateCommande).getTime()
        );
        this.menusCommandesIds = this.commandes
          .filter(c => c.statut === 'en_attente' || c.statut === 'confirmee')
          .map(c => c.menuId);
        if (this.roleService.isAdmin()) {
          const ids = [...new Set(data.map(c => c.userId))];
          ids.forEach(id => this.loadUserNom(id));
        }
        this.loading = false;
        this._syncAlertesVersNotifications();
      },
      error: () => { this.errorMsg = 'Erreur chargement.'; this.loading = false; }
    });
  }

  private _syncAlertesVersNotifications(): void {
    if (!this.roleService.isEmploye()) return;
    const alertes = this.alertes;
    alertes.forEach(alerte => {
      const notif = {
        id: 'commande-prete-' + alerte.commandeId,
        icon: 'heroicons_outline:bell',
        title: alerte.enRetard ? 'Recuperez votre repas rapidement !' : 'Votre commande est prete !',
        description: alerte.enRetard
          ? 'Annulation dans ' + alerte.minutesRestantes + ' min - Code : ' + alerte.codeRetrait
          : 'Presentez le code ' + alerte.codeRetrait + ' au comptoir',
        time: new Date().toISOString(),
        link: '/apps/restaurant/commandes',
        useRouter: true,
        read: false
      };
      this.notificationsService.pushLocal(notif);
    });
    const idsActifs = new Set(alertes.map(a => 'commande-prete-' + a.commandeId));
    this.notificationsService.notifications$.pipe(take(1)).subscribe(notifs => {
      notifs
        .filter(n => n.id.startsWith('commande-prete-') && !idsActifs.has(n.id))
        .forEach(n => this.notificationsService.removeLocal(n.id));
    });
  }

  loadUserNom(userId: string): void {
    if (this.usersCache[userId]) return;
    this.usersCache[userId] = '...';
    this.http.get<any>('/api/users/' + userId).subscribe({
      next: (u) => { this.usersCache[userId] = (u.prenom || '') + ' ' + (u.nom || ''); },
      error: () => { this.usersCache[userId] = userId; }
    });
  }

  getUserNom(userId: string): string {
    return this.usersCache[userId] || userId;
  }

  loadMenus(): void {
    this.menuService.getAllMenus().subscribe({
      next: (data) => { this.menus = data; this.loadCommandes(); }
    });
  }

  ouvrirModalPaiement(commande: Commande): void {
    this.commandeEnCoursDePaiement = commande;
    this.modePaiementSelectionne = '';
    this.paiementEnCours = false;
    this.showModalPaiement = true;
  }

  fermerModalPaiement(): void {
    this.showModalPaiement = false;
    this.commandeEnCoursDePaiement = null;
    this.modePaiementSelectionne = '';
  }

  confirmerPaiement(): void {
    if (!this.commandeEnCoursDePaiement || !this.modePaiementSelectionne) return;
    this.paiementEnCours = true;
    this.commandeService.payerCommande(
      this.commandeEnCoursDePaiement.id!,
      this.modePaiementSelectionne
    ).subscribe({
      next: () => {
        this.fermerModalPaiement();
        this.successMsg = 'Paiement enregistre - commande livree !';
        setTimeout(() => this.successMsg = '', 4000);
        this.loadCommandes();
        this.loadFidelites();
      },
      error: () => {
        this.paiementEnCours = false;
        this.errorMsg = 'Erreur lors du paiement.';
      }
    });
  }

  validerParCode(): void {
    this.codeErreur = '';
    if (!this.codeRetrait || this.codeRetrait.length < 4) {
      this.codeErreur = 'Entrez un code a 4 caracteres.';
      return;
    }
    const commande = this.commandes.find(c =>
      c.statut === 'prete' &&
      (c.codeRetrait || (c.id || '').slice(-4).toUpperCase()) === this.codeRetrait.toUpperCase()
    );
    if (!commande) {
      this.codeErreur = 'Aucune commande prete avec ce code.';
      return;
    }
    this.codeRetrait = '';
    this.ouvrirModalPaiement(commande);
  }

  getCodeRetrait(commande: Commande): string {
    return commande.codeRetrait || (commande.id || '').slice(-4).toUpperCase();
  }

  getCommandesPretes(): Commande[] {
    return this.commandes.filter(c => c.statut === 'prete');
  }

  getQuantiteSelectionnee(platId: string): number {
    return this.platsSelectionnes.filter(id => id === platId).length;
  }

  getStockRestant(platId: string): number {
    const plat = this.platsDisponibles.find(p => p.platId === platId);
    if (!plat) return 0;
    return Math.max(0, (plat.quantite || 0) - this.getQuantiteSelectionnee(platId));
  }

  isPlatCommandable(platId: string): boolean {
    const plat = this.platsDisponibles.find(p => p.platId === platId);
    if (!plat || !plat.disponible || (plat.quantite || 0) <= 0) return false;
    return this.getStockRestant(platId) > 0;
  }

  incrementerPlat(platId: string): void {
    if (this.isPlatCommandable(platId)) this.platsSelectionnes.push(platId);
  }

  decrementerPlat(platId: string): void {
    const idx = this.platsSelectionnes.lastIndexOf(platId);
    if (idx !== -1) this.platsSelectionnes.splice(idx, 1);
  }

  isPlatSelected(platId: string): boolean {
    return this.getQuantiteSelectionnee(platId) > 0;
  }

  getMontantPreview(): number {
    const platIds = [...new Set(this.platsSelectionnes)];
    return platIds.reduce((sum, platId) => {
      const plat = this.platsDisponibles.find(p => p.platId === platId);
      const qty = this.getQuantiteSelectionnee(platId);
      return sum + (plat ? (plat.prix || 0) * qty : 0);
    }, 0);
  }

  getPlatsGroupes(plats: string[]): { nom: string; qty: number }[] {
    const map = new Map<string, number>();
    for (const id of plats) map.set(id, (map.get(id) || 0) + 1);
    return Array.from(map.entries()).map(([id, qty]) => ({ nom: this.getPlatNom(id), qty }));
  }

  ouvrirFormulaire(): void {
    this.showForm = true;
    this.step = 1;
    this.newCommande = { menuId: '' };
    this.platsDisponibles = [];
    this.platsSelectionnes = [];
    this.commandeEnModification = null;
  }

  onMenuChange(): void {
    const menu = this.menus.find(m => m.id === this.newCommande.menuId);
    this.platsDisponibles = menu ? (menu.plats || []).filter(p => p.disponible) : [];
    this.platsSelectionnes = [];
    if (this.platsDisponibles.length > 0) this.step = 2;
  }

  isMenuDejaCommande(menuId: string): boolean {
    return this.menusCommandesIds.includes(menuId);
  }

  modifierCommande(commande: Commande): void {
    const menu = this.menus.find(m => m.id === commande.menuId);
    if (!menu) return;
    this.platsDisponibles = (menu.plats || []).filter(p => p.disponible);
    this.platsSelectionnes = [...commande.plats];
    this.newCommande = { menuId: commande.menuId };
    this.commandeEnModification = commande;
    this.step = 2;
    this.showForm = true;
  }

  submitCommande(): void {
    if (!this.newCommande.menuId || this.platsSelectionnes.length === 0) {
      this.errorMsg = 'Choisissez un menu et au moins un plat.';
      return;
    }
    if (this.commandeEnModification) {
      this.commandeService.updateCommande(
        this.commandeEnModification.id!,
        { plats: this.platsSelectionnes }
      ).subscribe({
        next: () => {
          this.successMsg = 'Commande modifiee avec succes !';
          setTimeout(() => this.successMsg = '', 4000);
          this.showForm = false;
          this.commandeEnModification = null;
          this.loadCommandes();
        },
        error: (err) => { this.errorMsg = err.error?.message || 'Erreur modification commande.'; }
      });
      return;
    }
    const commande: Commande = {
      userId: this.roleService.userId,
      menuId: this.newCommande.menuId,
      plats: this.platsSelectionnes,
      dateCommande: new Date().toISOString().split('T')[0],
      statut: 'en_attente'
    };
    this.commandeService.createCommande(commande).subscribe({
      next: () => {
        this.successMsg = 'Commande envoyee avec succes !';
        setTimeout(() => this.successMsg = '', 4000);
        this.showForm = false;
        this.loadCommandes();
      },
      error: (err) => { this.errorMsg = err.error?.message || 'Erreur creation commande.'; }
    });
  }

  ajouterAllergie(): void {
    const a = this.nouvelleAllergie.trim().toLowerCase();
    if (!a || this.allergiesEmploye.includes(a)) { this.nouvelleAllergie = ''; return; }
    this.allergiesEmploye.push(a);
    localStorage.setItem('allergies_' + this.roleService.userId, JSON.stringify(this.allergiesEmploye));
    this.nouvelleAllergie = '';
  }

  supprimerAllergie(a: string): void {
    this.allergiesEmploye = this.allergiesEmploye.filter(x => x !== a);
    localStorage.setItem('allergies_' + this.roleService.userId, JSON.stringify(this.allergiesEmploye));
    this.alertesAllergie = [];
  }

  verifierAllergies(): void {
    if (this.allergiesEmploye.length === 0) { this.errorMsg = 'Ajoutez au moins une allergie.'; return; }
    const tousLesPlats: any[] = [];
    for (const menu of this.menus) {
      for (const plat of (menu.plats || [])) {
        tousLesPlats.push({
          platId: plat.platId, nom: plat.nom,
          ingredients: plat.ingredients || '', description: plat.description || ''
        });
      }
    }
    if (tousLesPlats.length === 0) { this.errorMsg = 'Aucun plat avec ingredients disponible.'; return; }
    this.analyseEnCours = true;
    this.alertesAllergie = [];
    this.allergieIa.verifierAllergies(this.allergiesEmploye, tousLesPlats).subscribe({
      next: (res) => {
        this.alertesAllergie = res.filter(r => !r.sur);
        this.analyseEnCours = false;
        if (this.alertesAllergie.length === 0) {
          this.successMsg = 'Aucun conflit allergie detecte !';
          setTimeout(() => this.successMsg = '', 4000);
        }
      },
      error: () => { this.analyseEnCours = false; this.errorMsg = 'Erreur connexion IA.'; }
    });
  }

  canDelete(commande: Commande): boolean {
    if (this.roleService.isAdmin()) return true;
    return commande.statut === 'en_attente';
  }

  getFiltered(): Commande[] {
    return this.commandes.filter(c => {
      const matchStatut = !this.selectedStatut || c.statut === this.selectedStatut;
      const matchUser = !this.searchUserId ||
        this.getUserNom(c.userId).toLowerCase().includes(this.searchUserId.toLowerCase());
      return matchStatut && matchUser;
    });
  }

  updateStatut(id: string, statut: string): void {
    this.commandeService.updateStatut(id, statut).subscribe({
      next: () => {
        this.successMsg = 'Statut mis a jour !';
        setTimeout(() => this.successMsg = '', 3000);
        this.loadCommandes();
      },
      error: () => { this.errorMsg = 'Erreur mise a jour statut.'; }
    });
  }

  deleteCommande(id: string): void {
    if (!confirm('Supprimer cette commande ?')) return;
    this.commandeService.deleteCommande(id).subscribe({
      next: () => {
        this.successMsg = 'Commande supprimee.';
        setTimeout(() => this.successMsg = '', 3000);
        this.loadCommandes();
      },
      error: () => { this.errorMsg = 'Erreur suppression.'; }
    });
  }

  getStatutClass(statut: string): string {
    switch (statut) {
      case 'en_attente': return 'bg-yellow-100 text-yellow-800 border border-yellow-300';
      case 'confirmee':  return 'bg-blue-100 text-blue-800 border border-blue-300';
      case 'prete':      return 'bg-purple-100 text-purple-800 border border-purple-300';
      case 'livree':     return 'bg-green-100 text-green-800 border border-green-300';
      default:           return 'bg-gray-100 text-gray-600';
    }
  }

  getNextStatut(statut: string): string | null {
    if (statut === 'prete') return null;
    const flow = ['en_attente', 'confirmee', 'prete'];
    const idx = flow.indexOf(statut);
    return idx < flow.length - 1 ? flow[idx + 1] : null;
  }

  getNextStatutLabel(statut: string): string {
    const labels: any = { confirmee: 'Confirmer', prete: 'Marquer Prete' };
    const next = this.getNextStatut(statut);
    return next ? labels[next] : '';
  }

  getCountByStatut(statut: string): number {
    return this.commandes.filter(c => c.statut === statut).length;
  }

  getTotalMontant(): number {
    return this.getFiltered().reduce((sum, c) => sum + (c.montantTotal || 0), 0);
  }

  getMenuTitre(menuId: string): string {
    const menu = this.menus.find(m => m.id === menuId);
    return menu ? menu.titre : '-';
  }

  getPlatNom(platId: string): string {
    for (const menu of this.menus) {
      const plat = (menu.plats || []).find(p => p.platId === platId);
      if (plat) return plat.nom;
    }
    return '-';
  }

  getStatutIcon(statut: string): string {
    switch (statut) {
      case 'en_attente': return 'hourglass';
      case 'confirmee':  return 'check';
      case 'prete':      return 'restaurant';
      case 'livree':     return 'inventory';
      default:           return '';
    }
  }

  loadFidelite(): void {
    this.fideliteService.getFidelite(this.roleService.userId).subscribe({
      next: (f) => { this.fidelite = f; },
      error: () => {}
    });
  }

  utiliserReduction(): void {
    if (!this.fidelite || !this.fidelite.reductionDisponible) return;
    if (!confirm('Utiliser votre reduction de ' + this.fidelite.montantReduction + ' TND ?')) return;
    this.reductionEnCours = true;
    this.fideliteService.utiliserReduction(this.roleService.userId).subscribe({
      next: (f) => {
        this.fidelite = f;
        this.reductionEnCours = false;
        this.successMsg = 'Reduction de ' + f.montantReduction + ' TND sera appliquee a votre prochain paiement !';
        setTimeout(() => this.successMsg = '', 5000);
      },
      error: () => { this.reductionEnCours = false; this.errorMsg = 'Erreur reduction.'; }
    });
  }

  getPointsProgression(): number {
    if (!this.fidelite) return 0;
    return Math.min(100, Math.round((this.fidelite.points % this.SEUIL_REDUCTION) / this.SEUIL_REDUCTION * 100));
  }

  getPointsVersProchain(): number {
    if (!this.fidelite) return this.SEUIL_REDUCTION;
    return this.SEUIL_REDUCTION - (this.fidelite.points % this.SEUIL_REDUCTION);
  }

  loadFidelites(): void {
    this.http.get<any[]>('/api/fidelite/all').subscribe({
      next: (data) => { this.fidelites = data.sort((a, b) => b.points - a.points); },
      error: () => {}
    });
  }

  // --- EXPORT PDF -----------------------------------------------
  exportPdf(): void {
    this.commandeService.exportPdf();
  }

}

