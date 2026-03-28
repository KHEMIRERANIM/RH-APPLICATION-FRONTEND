import { Component, OnInit } from '@angular/core';
import { Menu, Plat } from 'src/app/models/menu';
import { MenuService } from 'src/app/services/menu.service';

@Component({
  selector: 'app-plats',
  templateUrl: './plats.component.html',
  styleUrls: ['./plats.component.scss']
})
export class PlatsComponent implements OnInit {
  allPlats: (Plat & { menuTitre: string; menuDate: string })[] = [];
  filtered: (Plat & { menuTitre: string; menuDate: string })[] = [];
  loading = false;
  searchTerm = '';
  filterDispo: 'tous' | 'dispo' | 'indispo' = 'tous';
  filterTag = '';
  allTags: string[] = [];

  constructor(private menuService: MenuService) {}

  ngOnInit(): void {
    this.loadPlats();
  }

  loadPlats(): void {
    this.loading = true;
    this.menuService.getAllMenus().subscribe({
      next: (menus: Menu[]) => {
        this.allPlats = [];
        menus.forEach(menu => {
          (menu.plats || []).forEach(plat => {
            this.allPlats.push({ ...plat, menuTitre: menu.titre, menuDate: menu.date });
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
      const matchSearch = !this.searchTerm ||
        p.nom.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchDispo = this.filterDispo === 'tous' ||
        (this.filterDispo === 'dispo' && p.disponible) ||
        (this.filterDispo === 'indispo' && !p.disponible);
      const matchTag = !this.filterTag ||
        (p.tags || []).includes(this.filterTag);
      return matchSearch && matchDispo && matchTag;
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
      'pates': 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400',
      'gateau': 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400',
      'jus': 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400',
      'cafe': 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400',
    };
    for (const key of Object.keys(images)) {
      if (nom.includes(key)) return images[key];
    }
    return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400';
  }

  getTotalDispos(): number {
    return this.allPlats.filter(p => p.disponible).length;
  }

  getPrixMoyen(): number {
    if (!this.allPlats.length) return 0;
    return this.allPlats.reduce((s, p) => s + (p.prix || 0), 0) / this.allPlats.length;
  }
}
