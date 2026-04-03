import { Component, OnInit } from '@angular/core';
import { Menu, Plat } from 'src/app/models/menu';
import { MenuService } from 'src/app/services/menu.service';
import { CommandeService } from 'src/app/services/commande.service';
import { RoleService } from 'app/core/auth/role.service';
import { Commande } from 'src/app/models/commande';

@Component({
  selector: 'app-plats',
  templateUrl: './plats.component.html',
  styleUrls: ['./plats.component.scss']
})
export class PlatsComponent implements OnInit {
  allPlats: (Plat & { menuTitre: string; menuDate: string; menuId: string })[] = [];
  filtered: (Plat & { menuTitre: string; menuDate: string; menuId: string })[] = [];
  panier: (Plat & { menuTitre: string; menuDate: string; menuId: string })[] = [];
  platSelectionne: (Plat & { menuTitre: string; menuDate: string; menuId: string }) | null = null;
  loading = false;
  searchTerm = '';
  filterDispo: 'tous' | 'dispo' | 'indispo' = 'tous';
  filterTag = '';
  allTags: string[] = [];
  successMsg = '';
  errorMsg = '';
  menusCommandesIds: string[] = [];
  showPanier = false;

  constructor(
    private menuService: MenuService,
    private commandeService: CommandeService,
    public roleService: RoleService
  ) {}

  ngOnInit(): void {
    this.loadPlats();
    if (this.roleService.isEmploye()) this.loadMesCommandes();
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

  loadMesCommandes(): void {
    this.commandeService.getCommandesByUser(this.roleService.userId).subscribe({
      next: (data) => { this.menusCommandesIds = data.map(c => c.menuId); }
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

  isMenuDejaCommande(menuId: string): boolean {
    return this.menusCommandesIds.includes(menuId);
  }

  onPlatClick(plat: Plat & { menuTitre: string; menuDate: string; menuId: string }): void {
    this.platSelectionne = plat;
  }

  ajouterAuPanier(): void {
    if (!this.platSelectionne) return;
    if (this.isPlatInPanier(this.platSelectionne.platId!)) {
      this.panier = this.panier.filter(p => p.platId !== this.platSelectionne!.platId);
    } else {
      if (this.panier.length > 0 && this.panier[0].menuId !== this.platSelectionne.menuId) {
        this.errorMsg = 'Vous ne pouvez commander que des plats du meme menu.';
        setTimeout(() => this.errorMsg = '', 3000);
        this.platSelectionne = null;
        return;
      }
      this.panier.push(this.platSelectionne);
    }
  }

  commanderMaintenant(): void {
    if (!this.platSelectionne) return;
    if (!this.isPlatInPanier(this.platSelectionne.platId!)) {
      this.panier.push(this.platSelectionne);
    }
    this.platSelectionne = null;
    this.showPanier = true;
  }

  togglePanier(plat: Plat & { menuTitre: string; menuDate: string; menuId: string }): void {
    const idx = this.panier.findIndex(p => p.platId === plat.platId);
    if (idx >= 0) {
      this.panier.splice(idx, 1);
    } else {
      if (this.panier.length > 0 && this.panier[0].menuId !== plat.menuId) {
        this.errorMsg = 'Meme menu uniquement.';
        setTimeout(() => this.errorMsg = '', 3000);
        return;
      }
      this.panier.push(plat);
    }
  }

  isPlatInPanier(platId: string): boolean {
    return this.panier.some(p => p.platId === platId);
  }

  getMontantPanier(): number {
    return this.panier.reduce((sum, p) => sum + (p.prix || 0), 0);
  }

  commander(): void {
    if (this.panier.length === 0) return;
    const commande: Commande = {
      userId: this.roleService.userId,
      menuId: this.panier[0].menuId,
      plats: this.panier.map(p => p.platId!),
      dateCommande: new Date().toISOString().split('T')[0],
      statut: 'en_attente'
    };
    this.commandeService.createCommande(commande).subscribe({
      next: () => {
        this.successMsg = 'Commande passee avec succes !';
        setTimeout(() => this.successMsg = '', 4000);
        this.panier = [];
        this.showPanier = false;
        this.loadMesCommandes();
      },
      error: (err) => { this.errorMsg = err.error?.message || 'Erreur commande.'; }
    });
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
