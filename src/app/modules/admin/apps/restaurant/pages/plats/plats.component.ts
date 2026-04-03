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

  libelleQuantiteRestante(plat: Plat): string {
    const q = plat.quantite != null ? Number(plat.quantite) : NaN;
    if (Number.isNaN(q)) return '';
    if (q <= 0) return 'Rupture de stock';
    return `Il reste ${q}`;
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

  getImageForPlat(nomPlat: string): string {
    const nom = nomPlat.toLowerCase();
    const images: { [key: string]: string } = {
      'poulet': 'https://images.unsplash.com/photo-1598103442097-8b74394b95c2?w=400',
      'boeuf': 'https://images.unsplash.com/photo-1546964124-0cce460c3a23?w=400',
      'saumon': 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400',
      'crevettes': 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=400',
      'pizza': 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400',
      'burger': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400',
      'salade': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400',
      'couscous': 'https://images.unsplash.com/photo-1644806671071-1b37d7e2f8f0?w=400',
      'lasagne': 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?w=400',
    };
    for (const key of Object.keys(images)) {
      if (nom.includes(key)) return images[key];
    }
    return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400';
  }

  getTotalDispos(): number { return this.allPlats.filter(p => p.disponible).length; }
  getPrixMoyen(): number {
    if (!this.allPlats.length) return 0;
    return this.allPlats.reduce((s, p) => s + (p.prix || 0), 0) / this.allPlats.length;
  }
}
