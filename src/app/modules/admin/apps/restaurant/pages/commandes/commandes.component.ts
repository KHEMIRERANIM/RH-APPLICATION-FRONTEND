import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Commande } from 'src/app/models/commande';
import { CommandeService } from 'src/app/services/commande.service';
import { MenuService } from 'src/app/services/menu.service';
import { Menu, Plat } from 'src/app/models/menu';
import { RoleService } from 'app/core/auth/role.service';

@Component({
  selector: 'app-commandes',
  templateUrl: './commandes.component.html',
  styleUrls: ['./commandes.component.scss']
})
export class CommandesComponent implements OnInit {
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

  constructor(
    private commandeService: CommandeService,
    private menuService: MenuService,
    private http: HttpClient,
    public roleService: RoleService
  ) {}

  ngOnInit(): void {
    this.loadMenus();
    this.loadCommandes();
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
        this.menusCommandesIds = this.commandes.map(c => c.menuId);
        if (this.roleService.isAdmin()) {
          const ids = [...new Set(data.map(c => c.userId))];
          ids.forEach(id => this.loadUserNom(id));
        }
        this.loading = false;
      },
      error: () => { this.errorMsg = 'Erreur chargement.'; this.loading = false; }
    });
  }

  loadUserNom(userId: string): void {
    if (this.usersCache[userId]) return;
    this.usersCache[userId] = '...';
    this.http.get<any>('http://localhost:8081/api/users/' + userId).subscribe({
      next: (u) => { this.usersCache[userId] = (u.prenom || '') + ' ' + (u.nom || ''); },
      error: () => { this.usersCache[userId] = userId; }
    });
  }

  getUserNom(userId: string): string {
    return this.usersCache[userId] || userId;
  }

  loadMenus(): void {
    this.menuService.getAllMenus().subscribe({
      next: (data) => { this.menus = data; }
    });
  }

  getCodeRetrait(commande: Commande): string {
    return (commande.id || '').slice(-4).toUpperCase();
  }

  getCommandesPretes(): Commande[] {
    return this.commandes.filter(c => c.statut === 'prete');
  }

  validerParCode(): void {
    this.codeErreur = '';
    if (!this.codeRetrait || this.codeRetrait.length < 4) {
      this.codeErreur = 'Entrez un code a 4 caracteres.';
      return;
    }
    const commande = this.commandes.find(c =>
      c.statut === 'prete' &&
      (c.id || '').slice(-4).toUpperCase() === this.codeRetrait.toUpperCase()
    );
    if (!commande) {
      this.codeErreur = 'Aucune commande prete avec ce code.';
      return;
    }
    this.updateStatut(commande.id!, 'livree');
    this.codeRetrait = '';
    this.successMsg = 'Livraison validee pour ' + this.getUserNom(commande.userId) + ' !';
    setTimeout(() => this.successMsg = '', 4000);
  }

  ouvrirFormulaire(): void {
    this.showForm = true;
    this.step = 1;
    this.newCommande = { menuId: '' };
    this.platsDisponibles = [];
    this.platsSelectionnes = [];
  }

  onMenuChange(): void {
    const menu = this.menus.find(m => m.id === this.newCommande.menuId);
    this.platsDisponibles = menu ? (menu.plats || []).filter(p => p.disponible) : [];
    this.platsSelectionnes = [];
    if (this.platsDisponibles.length > 0) this.step = 2;
  }

  togglePlat(platId: string): void {
    this.platsSelectionnes.includes(platId)
      ? this.platsSelectionnes = this.platsSelectionnes.filter(id => id !== platId)
      : this.platsSelectionnes.push(platId);
  }

  isPlatSelected(platId: string): boolean {
    return this.platsSelectionnes.includes(platId);
  }

  getMontantPreview(): number {
    return this.platsDisponibles
      .filter(p => this.platsSelectionnes.includes(p.platId!))
      .reduce((sum, p) => sum + (p.prix || 0), 0);
  }

  getPlatNom(platId: string): string {
    for (const menu of this.menus) {
      const plat = (menu.plats || []).find(p => p.platId === platId);
      if (plat) return plat.nom;
    }
    return '-';
  }

  isMenuDejaCommande(menuId: string): boolean {
    return this.menusCommandesIds.includes(menuId);
  }

  submitCommande(): void {
    if (!this.newCommande.menuId || this.platsSelectionnes.length === 0) {
      this.errorMsg = 'Choisissez un menu et au moins un plat.';
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
    const flow = ['en_attente', 'confirmee', 'prete', 'livree'];
    const idx = flow.indexOf(statut);
    return idx < flow.length - 1 ? flow[idx + 1] : null;
  }

  getNextStatutLabel(statut: string): string {
    const next = this.getNextStatut(statut);
    const labels: any = { confirmee: 'Confirmer', prete: 'Marquer Prete', livree: 'Marquer Livree' };
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
}
