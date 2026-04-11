import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Menu, Plat } from 'src/app/models/menu';
import { MenuService } from 'src/app/services/menu.service';
import { RoleService } from 'app/core/auth/role.service';
import { RestaurantPanierService } from '../../services/restaurant-panier.service';
import { AllergieIaService, AnalyseAllergene } from 'src/app/services/allergie-ia.service';

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
  newPlat: Partial<Plat> = { nom: '', description: '', prix: 0, tags: [], quantite: 1, disponible: true, ingredients: '' };
  editPlat: Partial<Plat> = {};
  newPlatTags = '';
  editPlatTags = '';
  loading = false;
  errorMsg = '';
  successMsg = '';

  analyseEnCours = false;
  analyseResultat: AnalyseAllergene | null = null;
  analyseEditResultat: AnalyseAllergene | null = null;
  nutritionResultat: any = null;
  nutritionEditResultat: any = null;

  constructor(
    private menuService: MenuService,
    public roleService: RoleService,
    public panier: RestaurantPanierService,
    private router: Router,
    private allergieIa: AllergieIaService
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

  analyserNouveauPlat(): void {
    const texte = (this.newPlat.ingredients || '') + ' ' + (this.newPlat.nom || '') + ' ' + (this.newPlat.description || '');
    if (!texte.trim()) return;
    this.analyseEnCours = true;
    this.analyseResultat = null;
    this.allergieIa.analyserIngredients(texte).subscribe({
      next: (res) => {
        this.analyseResultat = res;
        this.analyseEnCours = false;
        if (res.tags_suggeres.length > 0) {
          const existants = this.newPlatTags ? this.newPlatTags.split(',').map(t => t.trim()) : [];
          const nouveaux = res.tags_suggeres.filter(t => !existants.includes(t));
          if (nouveaux.length > 0) {
            this.newPlatTags = [...existants, ...nouveaux].filter(t => t).join(', ');
          }
        }
      },
      error: () => { this.analyseEnCours = false; this.errorMsg = 'Erreur connexion IA. Verifiez que le serveur Python tourne.'; }
    });
    this.allergieIa.analyserNutrition(
      this.newPlat.ingredients || '',
      this.newPlat.nom || ''
    ).subscribe({
      next: (res) => {
        this.nutritionResultat = res;
      },
      error: () => {}
    });
  }

  analyserEditPlat(): void {
    const texte = (this.editPlat.ingredients || '') + ' ' + (this.editPlat.nom || '') + ' ' + (this.editPlat.description || '');
    if (!texte.trim()) return;
    this.analyseEnCours = true;
    this.analyseEditResultat = null;
    this.nutritionEditResultat = null;
    this.allergieIa.analyserIngredients(texte).subscribe({
      next: (res) => {
        this.analyseEditResultat = res;
        this.analyseEnCours = false;
        if (res.tags_suggeres.length > 0) {
          const existants = this.editPlatTags ? this.editPlatTags.split(',').map(t => t.trim()) : [];
          const nouveaux = res.tags_suggeres.filter(t => !existants.includes(t));
          if (nouveaux.length > 0) {
            this.editPlatTags = [...existants, ...nouveaux].filter(t => t).join(', ');
          }
        }
        this.allergieIa.analyserNutrition(
          this.editPlat.ingredients || '',
          this.editPlat.nom || ''
        ).subscribe({
          next: (nutrition) => {
            this.nutritionEditResultat = nutrition;
            this.editPlat.calories = nutrition.calories;
            this.editPlat.proteines = nutrition.proteines;
            this.editPlat.glucides = nutrition.glucides;
            this.editPlat.lipides = nutrition.lipides;
            this.editPlat.sucres = nutrition.sucres;
            this.editPlat.fibres = nutrition.fibres;
            this.editPlat.pctProteines = nutrition.pct_proteines;
            this.editPlat.pctGlucides = nutrition.pct_glucides;
            this.editPlat.pctLipides = nutrition.pct_lipides;
            this.editPlat.pmrAdapte = nutrition.pmr_adapte;
            this.editPlat.pmrRaison = nutrition.pmr_raison;
            this.editPlat.niveauCalories = nutrition.niveau_calories;
          },
          error: () => {}
        });
      },
      error: () => { this.analyseEnCours = false; this.errorMsg = 'Erreur connexion IA.'; }
    });
  }

  getNiveauClass(niveau: string): string {
    switch (niveau) {
      case 'eleve': return 'bg-red-100 text-red-700 border border-red-300';
      case 'moyen': return 'bg-orange-100 text-orange-700 border border-orange-300';
      default: return 'bg-green-100 text-green-700 border border-green-300';
    }
  }

  libelleQuantiteRestante(plat: Plat): string {
    const q = plat.quantite != null ? Number(plat.quantite) : NaN;
    if (Number.isNaN(q)) return '';
    if (q <= 0) return 'Rupture de stock';
    return 'Il reste ' + q;
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
    this.router.navigate(['/apps/restaurant/commandes'],
      { queryParams: { menuId: menu.id, platId: plat.platId } });
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
      'hamburger': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400',
      'agneau': 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400',
      'tajine': 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400',
      'brik': 'https://images.unsplash.com/photo-1542010589005-d1eacc3918f2?w=400',
      'gateau': 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400',
      'tarte': 'https://images.unsplash.com/photo-1519915028121-7d3463d20b13?w=400',
      'cafe': 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400',
      'jus': 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400',
      'the': 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400',
      'macaron': 'https://images.unsplash.com/photo-1558326567-98ae2405596b?w=400',
      'croissant': 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400',
      'sandwich': 'https://images.unsplash.com/photo-1553909489-cd47e0907980?w=400',
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

  toggleMenu(id: string): void {
    this.expandedMenu = this.expandedMenu === id ? null : id;
  }

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
    this.newPlat = { nom: '', description: '', prix: 0, tags: [], quantite: 1, disponible: true, ingredients: '' };
    this.newPlatTags = '';
    this.analyseResultat = null;
    this.nutritionResultat = null;
  }

  addPlat(): void {
    if (!this.selectedMenuId || !this.newPlat.nom) { this.errorMsg = 'Nom obligatoire.'; return; }
    this.newPlat.tags = this.newPlatTags.split(',').map(t => t.trim()).filter(t => t);
    this.newPlat.image = this.getImageForPlat(this.newPlat.nom!);
    if (this.nutritionResultat) {
      this.newPlat.calories = this.nutritionResultat.calories;
      this.newPlat.proteines = this.nutritionResultat.proteines;
      this.newPlat.glucides = this.nutritionResultat.glucides;
      this.newPlat.lipides = this.nutritionResultat.lipides;
      this.newPlat.sucres = this.nutritionResultat.sucres;
      this.newPlat.fibres = this.nutritionResultat.fibres;
      this.newPlat.pctProteines = this.nutritionResultat.pct_proteines;
      this.newPlat.pctGlucides = this.nutritionResultat.pct_glucides;
      this.newPlat.pctLipides = this.nutritionResultat.pct_lipides;
      this.newPlat.pmrAdapte = this.nutritionResultat.pmr_adapte;
      this.newPlat.pmrRaison = this.nutritionResultat.pmr_raison;
      this.newPlat.niveauCalories = this.nutritionResultat.niveau_calories;
    }
    this.menuService.addPlat(this.selectedMenuId!, this.newPlat).subscribe({
      next: () => { this.loadMenus(); this.showAddPlatForm = false; this.expandedMenu = this.selectedMenuId; this.successMsg = 'Plat ajoute !'; setTimeout(() => this.successMsg = '', 3000); },
      error: () => { this.errorMsg = 'Erreur ajout plat.'; }
    });
  }

  openEditPlat(menuId: string, plat: Plat): void {
    this.selectedMenuId = menuId;
    this.selectedPlatId = plat.platId!;
    this.editPlat = {
      nom: plat.nom, description: plat.description, prix: plat.prix,
      quantite: plat.quantite, disponible: plat.disponible,
      image: plat.image, tags: plat.tags ? [...plat.tags] : [],
      ingredients: plat.ingredients || ''
    };
    this.editPlatTags = (plat.tags || []).join(', ');
    this.showEditPlatForm = true;
    this.analyseEditResultat = null;
  }

  saveEditPlat(): void {
    if (!this.selectedMenuId || !this.selectedPlatId) return;
    this.editPlat.tags = this.editPlatTags.split(',').map(t => t.trim()).filter(t => t);
    if (this.nutritionEditResultat) {
      this.editPlat.calories = this.nutritionEditResultat.calories;
      this.editPlat.proteines = this.nutritionEditResultat.proteines;
      this.editPlat.glucides = this.nutritionEditResultat.glucides;
      this.editPlat.lipides = this.nutritionEditResultat.lipides;
      this.editPlat.sucres = this.nutritionEditResultat.sucres;
      this.editPlat.fibres = this.nutritionEditResultat.fibres;
      this.editPlat.pctProteines = this.nutritionEditResultat.pct_proteines;
      this.editPlat.pctGlucides = this.nutritionEditResultat.pct_glucides;
      this.editPlat.pctLipides = this.nutritionEditResultat.pct_lipides;
      this.editPlat.pmrAdapte = this.nutritionEditResultat.pmr_adapte;
      this.editPlat.pmrRaison = this.nutritionEditResultat.pmr_raison;
      this.editPlat.niveauCalories = this.nutritionEditResultat.niveau_calories;
    }
    this.menuService.updatePlat(this.selectedMenuId, this.selectedPlatId, this.editPlat).subscribe({
      next: () => { this.loadMenus(); this.showEditPlatForm = false; this.successMsg = 'Plat modifie !'; setTimeout(() => this.successMsg = '', 3000); },
      error: () => { this.errorMsg = 'Erreur modification plat.'; }
    });
  }

  deletePlat(menuId: string, platId: string): void {
    if (!confirm('Supprimer ce plat ?')) return;
    this.menuService.deletePlat(menuId, platId).subscribe({
      next: () => { this.loadMenus(); this.successMsg = 'Plat supprime.'; setTimeout(() => this.successMsg = '', 3000); },
      error: () => { this.errorMsg = 'Erreur suppression.'; }
    });
  }
}












