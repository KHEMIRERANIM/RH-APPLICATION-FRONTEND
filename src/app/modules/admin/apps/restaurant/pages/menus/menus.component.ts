import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Menu, Plat } from 'src/app/models/menu';
import { MenuService } from 'src/app/services/menu.service';
import { RoleService } from 'app/core/auth/role.service';

@Component({
  selector: 'app-menus',
  templateUrl: './menus.component.html',
  styleUrls: ['./menus.component.scss']
})
export class MenusComponent implements OnInit {
  menus: Menu[] = [];
  searchTerm: string = '';
  filters: string[] = ['diabetique', 'sans_gluten', 'vegetarien', 'sans sucre'];
  selectedFilters: string[] = [];
  expandedMenu: string | null = null;

  showCreateForm: boolean = false;
  showAddPlatForm: boolean = false;
  showEditMenuForm: boolean = false;
  showEditPlatForm: boolean = false;

  selectedMenuId: string | null = null;
  selectedPlatId: string | null = null;

  newMenu: Partial<Menu> = { titre: '', date: '', statut: 'publie' };
  editMenu: Partial<Menu> = {};
  newPlat: Partial<Plat> = { nom: '', description: '', prix: 0, tags: [], quantite: 1, disponible: true };
  editPlat: Partial<Plat> = {};
  newPlatTags: string = '';
  editPlatTags: string = '';

  loading: boolean = false;
  errorMsg: string = '';
  successMsg: string = '';

  constructor(
    private menuService: MenuService,
    private cdr: ChangeDetectorRef,
    public roleService: RoleService
  ) {}

  ngOnInit(): void {
    this.loadMenus();
  }

  loadMenus(): void {
    this.loading = true;
    this.menuService.getAllMenus().subscribe({
      next: (data) => {
        this.menus = data;
        if (this.roleService.isEmploye() || this.roleService.isCandidat()) {
          this.menus = data.filter(m => m.statut === 'publie');
        }
        this.loading = false;
      },
      error: () => { this.errorMsg = 'Erreur de connexion au serveur.'; this.loading = false; }
    });
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
    };
    for (const key of Object.keys(images)) {
      if (nom.includes(key)) return images[key];
    }
    return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400';
  }

  toggleFilter(filter: string): void {
    if (this.selectedFilters.includes(filter)) {
      this.selectedFilters = this.selectedFilters.filter(f => f !== filter);
    } else {
      this.selectedFilters.push(filter);
    }
  }

  toggleMenu(menuId: string): void {
    this.expandedMenu = this.expandedMenu === menuId ? null : menuId;
  }

  getFilteredMenus(): Menu[] {
    let result = this.menus;
    if (this.searchTerm || this.selectedFilters.length > 0) {
      result = this.menus
        .map(menu => ({ ...menu, plats: this.filterPlats(menu.plats || []) }))
        .filter(menu => menu.plats.length > 0);
    }
    return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  filterPlats(plats: Plat[]): Plat[] {
    return plats.filter(plat => {
      const matchesSearch = !this.searchTerm ||
        plat.nom.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchesFilters = this.selectedFilters.length === 0 ||
        (plat.tags && plat.tags.some(tag =>
          this.selectedFilters.some(f => tag.toLowerCase().includes(f.toLowerCase()))
        ));
      return matchesSearch && matchesFilters;
    });
  }

  isSearchActive(): boolean {
    return !!this.searchTerm || this.selectedFilters.length > 0;
  }

  // Actions admin seulement
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
    const menuOriginal = this.menus.find(m => m.id === this.selectedMenuId);
    if (menuOriginal) this.editMenu.plats = menuOriginal.plats;
    this.menuService.updateMenu(this.selectedMenuId, this.editMenu).subscribe({
      next: () => { this.loadMenus(); this.showEditMenuForm = false; this.successMsg = 'Menu modifie !'; setTimeout(() => this.successMsg = '', 3000); },
      error: () => { this.errorMsg = 'Erreur modification menu.'; }
    });
  }

  deleteMenu(menuId: string): void {
    if (!confirm('Supprimer ce menu ?')) return;
    this.menuService.deleteMenu(menuId).subscribe({
      next: () => { this.loadMenus(); this.successMsg = 'Menu supprime.'; setTimeout(() => this.successMsg = '', 3000); },
      error: () => { this.errorMsg = 'Erreur suppression menu.'; }
    });
  }

  openAddPlat(menuId: string): void {
    this.selectedMenuId = menuId; this.showAddPlatForm = true;
    this.newPlat = { nom: '', description: '', prix: 0, tags: [], quantite: 1, disponible: true };
    this.newPlatTags = '';
  }

  addPlat(): void {
    if (!this.selectedMenuId || !this.newPlat.nom) { this.errorMsg = 'Nom du plat obligatoire.'; return; }
    this.newPlat.tags = this.newPlatTags.split(',').map(t => t.trim()).filter(t => t);
    this.newPlat.image = this.getImageForPlat(this.newPlat.nom!);
    this.menuService.addPlat(this.selectedMenuId!, this.newPlat).subscribe({
      next: () => { this.loadMenus(); this.showAddPlatForm = false; this.expandedMenu = this.selectedMenuId; this.successMsg = 'Plat ajoute !'; setTimeout(() => this.successMsg = '', 3000); },
      error: () => { this.errorMsg = "Erreur ajout plat."; }
    });
  }

  openEditPlat(menuId: string, plat: Plat): void {
    this.selectedMenuId = menuId; this.selectedPlatId = plat.platId!;
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

