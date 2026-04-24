import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Menu, Plat } from 'src/app/models/menu';
import { MenuService } from 'src/app/services/menu.service';
import { RoleService } from 'app/core/auth/role.service';
import { RestaurantPanierService } from '../../services/restaurant-panier.service';

type PlatVue = Plat & { menuTitre: string; menuDate: string; menuId: string };

@Component({
  selector: 'app-plats',
  templateUrl: './plats.component.html',
  styleUrls: ['./plats.component.scss']
})
export class PlatsComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  allPlats: PlatVue[] = [];
  filtered: PlatVue[] = [];
  loading = false;
  searchTerm = '';
  filterDispo: 'tous' | 'dispo' | 'indispo' = 'tous';
  filterTag = '';
  allTags: string[] = [];
  successMsg = '';
  errorMsg = '';

  private imageMap: { [key: string]: string } = {
    // Viandes
    'poulet': 'https://images.unsplash.com/photo-1598103442097-8b74394b95c2?w=400',
    'boeuf': 'https://images.unsplash.com/photo-1546964124-0cce460c3a23?w=400',
    'agneau': 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400',
    'veau': 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=400',
    'dinde': 'https://images.unsplash.com/photo-1574672280600-4accfa5b6f98?w=400',
    'merguez': 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400',
    'kebab': 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400',
    // Poissons
    'saumon': 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400',
    'thon': 'https://images.unsplash.com/photo-1559737558-2f5a35f4523b?w=400',
    'sardine': 'https://images.unsplash.com/photo-1580476262798-bddd9f4b7369?w=400',
    'crevette': 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=400',
    'poisson': 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400',
    // Plats cuisines
    'pizza': 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400',
    'burger': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400',
    'hamburger': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400',
    'pasta': 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400',
    'pates': 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400',
    'lasagne': 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?w=400',
    'couscous': 'https://images.unsplash.com/photo-1644806671071-1b37d7e2f8f0?w=400',
    'tajine': 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400',
    'riz': 'https://images.unsplash.com/photo-1516684732162-798a0062be99?w=400',
    'soupe': 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400',
    'sandwich': 'https://images.unsplash.com/photo-1553909489-cd47e0907980?w=400',
    'wrap': 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=400',
    'omelette': 'https://images.unsplash.com/photo-1510693206972-df098062cb71?w=400',
    'quiche': 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400',
    // Salades
    'salade': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400',
    'taboulé': 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400',
    'taboul': 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400',
    // Desserts
    'gateau': 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400',
    'cake': 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400',
    'tarte': 'https://images.unsplash.com/photo-1519915028121-7d3463d20b13?w=400',
    'tiramisu': 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400',
    'creme': 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400',
    'glace': 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=400',
    'macaron': 'https://images.unsplash.com/photo-1558326567-98ae2405596b?w=400',
    'brownie': 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400',
    'muffin': 'https://images.unsplash.com/photo-1587668178277-295251f900ce?w=400',
    'croissant': 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400',
    'pain': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400',
    'beignet': 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400',
    'baklava': 'https://images.unsplash.com/photo-1519676867240-f03562e64548?w=400',
    'makroud': 'https://images.unsplash.com/photo-1519676867240-f03562e64548?w=400',
    'fruit': 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=400',
    'salade de fruit': 'https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=400',
    // Boissons
    'cafe': 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400',
    'coffee': 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400',
    'espresso': 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=400',
    'cappuccino': 'https://images.unsplash.com/photo-1534778101976-62847782c213?w=400',
    'latte': 'https://images.unsplash.com/photo-1561047029-3000c68339ca?w=400',
    'the': 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400',
    'thé': 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400',
    'jus': 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400',
    'smoothie': 'https://images.unsplash.com/photo-1505252585461-04db1eb84625?w=400',
    'eau': 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400',
    'lait': 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400',
    'chocolat': 'https://images.unsplash.com/photo-1511381939415-e44015466834?w=400',
    // Tunisien
    'brik': 'https://images.unsplash.com/photo-1542010589005-d1eacc3918f2?w=400',
    'lablabi': 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400',
    'ojja': 'https://images.unsplash.com/photo-1510693206972-df098062cb71?w=400',
    'fricasse': 'https://images.unsplash.com/photo-1553909489-cd47e0907980?w=400',
  };

  constructor(
    private menuService: MenuService,
    public roleService: RoleService,
    public panier: RestaurantPanierService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadPlats();
    if (this.roleService.isEmploye()) {
      this.panier.commandePassee$.pipe(takeUntil(this.destroy$)).subscribe(() => {
        this.loadPlats();
        this.successMsg = 'Commande passee avec succes !';
        setTimeout(() => this.successMsg = '', 4000);
      });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadPlats(): void {
    this.loading = true;
    this.menuService.getAllMenus().subscribe({
      next: (menus: Menu[]) => {
        const filtered = this.roleService.isAdmin() ? menus : menus.filter(m => m.statut === 'publie');
        this.allPlats = [];
        filtered.forEach(menu => {
          (menu.plats || []).forEach(plat => {
            this.allPlats.push({ ...plat, menuTitre: menu.titre, menuDate: menu.date, menuId: menu.id! });
          });
        });
        const tagsSet = new Set<string>();
        this.allPlats.forEach(p => (p.tags || []).forEach(t => tagsSet.add(t)));
        this.allTags = Array.from(tagsSet);
        this.applyFilters();
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  applyFilters(): void {
    this.filtered = this.allPlats.filter(p => {
      const s = !this.searchTerm || p.nom.toLowerCase().includes(this.searchTerm.toLowerCase());
      const d = this.filterDispo === 'tous' || (this.filterDispo === 'dispo' && p.disponible) || (this.filterDispo === 'indispo' && !p.disponible);
      const t = !this.filterTag || (p.tags || []).includes(this.filterTag);
      return s && d && t;
    });
  }

  getImageForPlat(nomPlat: string): string {
    const nom = nomPlat.toLowerCase();
    for (const key of Object.keys(this.imageMap)) {
      if (nom.includes(key)) return this.imageMap[key];
    }
    return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400';
  }

  libelleQuantiteRestante(plat: Plat): string {
    const q = plat.quantite != null ? Number(plat.quantite) : NaN;
    if (Number.isNaN(q)) return '';
    if (q <= 0) return 'Rupture de stock';
    return 'Il reste ' + q;
  }

  peutCommanderPlat(plat: PlatVue): boolean {
    if (!this.roleService.isEmploye()) return false;
    if (!plat.disponible) return false;
    const q = plat.quantite != null ? Number(plat.quantite) : NaN;
    if (!Number.isNaN(q) && q <= 0) return false;
    return true;
  }

  commanderPlat(plat: PlatVue): void {
    if (!this.roleService.isEmploye()) return;
    if (!this.peutCommanderPlat(plat)) return;
    this.router.navigate(
      ['/apps/restaurant/commandes'],
      { queryParams: { menuId: plat.menuId, platId: plat.platId } }
    );
  }

  getTotalDispos(): number { return this.allPlats.filter(p => p.disponible).length; }
  getPrixMoyen(): number {
    if (!this.allPlats.length) return 0;
    return this.allPlats.reduce((s, p) => s + (p.prix || 0), 0) / this.allPlats.length;
  }

  supprimerPlat(plat: PlatVue): void {
    if (!confirm('Supprimer "' + plat.nom + '" ?')) return;
    this.menuService.deletePlat(plat.menuId, plat.platId!).subscribe({
      next: () => {
        this.successMsg = '"' + plat.nom + '" supprime avec succes.';
        setTimeout(() => this.successMsg = '', 4000);
        this.loadPlats();
      },
      error: () => { this.errorMsg = 'Erreur lors de la suppression.'; }
    });
  }
  showEditModal = false;
  platEnEdition: Partial<PlatVue> = {};

  ouvrirEditionPlat(plat: PlatVue): void {
    this.platEnEdition = { ...plat };
    this.showEditModal = true;
  }

  fermerModal(): void {
    this.showEditModal = false;
    this.platEnEdition = {};
  }

  sauvegarderPlat(): void {
    if (!this.platEnEdition.menuId || !this.platEnEdition.platId) return;
    this.menuService.updatePlat(
      this.platEnEdition.menuId,
      this.platEnEdition.platId,
      this.platEnEdition
    ).subscribe({
      next: () => {
        this.successMsg = '"' + this.platEnEdition.nom + '" mis a jour avec succes.';
        setTimeout(() => this.successMsg = '', 4000);
        this.showEditModal = false;
        this.platEnEdition = {};
        this.loadPlats();
      },
      error: () => { this.errorMsg = 'Erreur lors de la mise a jour.'; }
    });
  }
}
