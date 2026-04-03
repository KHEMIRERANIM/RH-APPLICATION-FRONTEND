import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Menu, Plat } from 'src/app/models/menu';
import { MenuService } from 'src/app/services/menu.service';
import { RoleService } from 'app/core/auth/role.service';
import { RestaurantPanierService } from '../../services/restaurant-panier.service';

@Component({
  selector: 'app-menus',
  templateUrl: './menus.component.html',
  styleUrls: ['./menus.component.scss']
})
export class MenusComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  menus: Menu[] = [];
  searchTerm = '';
  filters = ['diabetique', 'sans_gluten', 'vegetarien', 'sans sucre'];
  selectedFilters: string[] = [];
  expandedMenu: string | null = null;
  showCreateForm = false;
  showAddPlatForm = false;
  showEditMenuForm = false;
  showEditPlatForm = false;
  selectedMenuId: string | null = null;
  selectedPlatId: string | null = null;
  newMenu: Partial<Menu> = { titre: '', date: '', statut: 'publie' };
  editMenu: Partial<Menu> = {};
  newPlat: Partial<Plat> = { nom: '', description: '', prix: 0, tags: [], quantite: 1, disponible: true };
  editPlat: Partial<Plat> = {};
  newPlatTags = '';
  editPlatTags = '';
  loading = false;
  errorMsg = '';
  successMsg = '';

  constructor(
    private menuService: MenuService,
    public roleService: RoleService,
    public panier: RestaurantPanierService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadMenus();
    if (this.roleService.isEmploye()) {
      this.panier.commandePassee$.pipe(takeUntil(this.destroy$)).subscribe(() => {
        this.loadMenus();
        this.successMsg = 'Commande passee avec succes !';
        setTimeout(() => this.successMsg = '', 4000);
      });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadMenus(): void {
    this.loading = true;
    this.menuService.getAllMenus().subscribe({
      next: (data) => {
        this.menus = this.roleService.isAdmin() ? data : data.filter(m => m.statut === 'publie');
        this.loading = false;
      },
      error: () => { this.errorMsg = 'Erreur connexion serveur.'; this.loading = false; }
    });
  }

  libelleQuantiteRestante(plat: Plat): string {
    const q = plat.quantite != null ? Number(plat.quantite) : NaN;
    if (Number.isNaN(q)) return '';
    if (q <= 0) return 'Rupture de stock';
    return `Il reste ${q}`;
  }

  peutCommanderPlat(menuId: string, plat: Plat): boolean {
    if (!this.roleService.isEmploye()) return false;
    if (!plat.disponible) return false;
    const q = plat.quantite != null ? Number(plat.quantite) : NaN;
    if (!Number.isNaN(q) && q <= 0) return false;
    return true;
  }

  commanderPlat(menu: Menu, plat: Plat): void {
    if (!this.roleService.isEmploye()) return;
    if (!this.peutCommanderPlat(menu.id!, plat)) return;
    this.router.navigate(
      ['/apps/restaurant/commandes'],
      { queryParams: { menuId: menu.id, platId: plat.platId } }
    );
  }

  getImageForPlat(nomPlat: string): string {
    const nom = nomPlat.toLowerCase();
    const images: { [key: string]: string } = {
      'poulet': 'https://images.unsplash.com/photo-1598103442097-8b74394b95c2?w=400',
      'boeuf': 'https://images.unsplash.com/photo-1546964124-0cce460c3a23?w=400',
      'saumon': 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400',
      'pizza': 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400',
      'burger': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400',
      'salade': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400',
      'couscous': 'https://images.unsplash.com/photo-1644806671071-1b37d7e2f8f0?w=400',
      'lasagne': 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?w=400',
      'crevettes': 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=400',
    };
    for (const key of Object.keys(images)) {
      if (nom.includes(key)) return images[key];
    }
    return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400';
  }

  toggleFilter(f: string): void {
    this.selectedFilters.includes(f)
      ? this.selectedFilters = this.selectedFilters.filter(x => x !== f)
      : this.selectedFilters.push(f);
  }
  toggleMenu(id: string): void { this.expandedMenu = this.expandedMenu === id ? null : id; }
  isSearchActive(): boolean { return !!this.searchTerm || this.selectedFilters.length > 0; }

  getFilteredMenus(): Menu[] {
    let result = this.menus;
    if (this.searchTerm || this.selectedFilters.length > 0) {
      result = this.menus.map(m => ({ ...m, plats: this.filterPlats(m.plats || []) })).filter(m => m.plats.length > 0);
    }
    return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  filterPlats(plats: Plat[]): Plat[] {
    return plats.filter(p => {
      const s = !this.searchTerm || p.nom.toLowerCase().includes(this.searchTerm.toLowerCase());
      const f = this.selectedFilters.length === 0 || (p.tags && p.tags.some(t => this.selectedFilters.some(sf => t.toLowerCase().includes(sf.toLowerCase()))));
      return s && f;
    });
  }

  createMenu(): void {
    if (!this.newMenu.titre || !this.newMenu.date) { this.errorMsg = 'Titre et date obligatoires.'; return; }
    this.menuService.createMenu(this.newMenu).subscribe({
      next: () => { this.loadMenus(); this.showCreateForm = false; this.newMenu = { titre: '', date: '', statut: 'publie' }; this.successMsg = 'Menu cree !'; setTimeout(() => this.successMsg = '', 3000); },
      error: () => { this.errorMsg = 'Erreur creation menu.'; }
    });
  }

  openEditMenu(menu: Menu): void {
    this.editMenu = { titre: menu.titre, date: menu.date, statut: menu.statut, plats: menu.plats };
    this.selectedMenuId = menu.id!;
    this.showEditMenuForm = true;
  }

  saveEditMenu(): void {
    if (!this.selectedMenuId) return;
    const orig = this.menus.find(m => m.id === this.selectedMenuId);
    if (orig) this.editMenu.plats = orig.plats;
    this.menuService.updateMenu(this.selectedMenuId, this.editMenu).subscribe({
      next: () => { this.loadMenus(); this.showEditMenuForm = false; this.successMsg = 'Menu modifie !'; setTimeout(() => this.successMsg = '', 3000); },
      error: () => { this.errorMsg = 'Erreur modification menu.'; }
    });
  }

  deleteMenu(id: string): void {
    if (!confirm('Supprimer ce menu ?')) return;
    this.menuService.deleteMenu(id).subscribe({
      next: () => { this.loadMenus(); this.successMsg = 'Menu supprime.'; setTimeout(() => this.successMsg = '', 3000); },
      error: () => { this.errorMsg = 'Erreur suppression.'; }
    });
  }

  openAddPlat(menuId: string): void {
    this.selectedMenuId = menuId;
    this.showAddPlatForm = true;
    this.newPlat = { nom: '', description: '', prix: 0, tags: [], quantite: 1, disponible: true };
    this.newPlatTags = '';
  }

  addPlat(): void {
    if (!this.selectedMenuId || !this.newPlat.nom) { this.errorMsg = 'Nom obligatoire.'; return; }
    this.newPlat.tags = this.newPlatTags.split(',').map(t => t.trim()).filter(t => t);
    this.newPlat.image = this.getImageForPlat(this.newPlat.nom!);
    this.menuService.addPlat(this.selectedMenuId!, this.newPlat).subscribe({
      next: () => { this.loadMenus(); this.showAddPlatForm = false; this.expandedMenu = this.selectedMenuId; this.successMsg = 'Plat ajoute !'; setTimeout(() => this.successMsg = '', 3000); },
      error: () => { this.errorMsg = 'Erreur ajout plat.'; }
    });
  }

  openEditPlat(menuId: string, plat: Plat): void {
    this.selectedMenuId = menuId;
    this.selectedPlatId = plat.platId!;
    this.editPlat = { nom: plat.nom, description: plat.description, prix: plat.prix, quantite: plat.quantite, disponible: plat.disponible, image: plat.image, tags: plat.tags ? [...plat.tags] : [] };
    this.editPlatTags = (plat.tags || []).join(', ');
    this.showEditPlatForm = true;
  }

  saveEditPlat(): void {
    if (!this.selectedMenuId || !this.selectedPlatId) return;
    this.editPlat.tags = this.editPlatTags.split(',').map(t => t.trim()).filter(t => t);
    this.menuService.updatePlat(this.selectedMenuId, this.selectedPlatId, this.editPlat).subscribe({
      next: () => { this.loadMenus(); this.showEditPlatForm = false; this.successMsg = 'Plat modifie !'; setTimeout(() => this.successMsg = '', 3000); },
      error: () => { this.errorMsg = 'Erreur modification plat.'; }
    });
  }

  deletePlat(menuId: string, platId: string): void {
    if (!confirm('Supprimer ce plat ?')) return;
    this.menuService.deletePlat(menuId, platId).subscribe({
      next: () => { this.loadMenus(); this.successMsg = 'Plat supprime.'; setTimeout(() => this.successMsg = '', 3000); },
      error: () => { this.errorMsg = 'Erreur suppression plat.'; }
    });
  }
}
