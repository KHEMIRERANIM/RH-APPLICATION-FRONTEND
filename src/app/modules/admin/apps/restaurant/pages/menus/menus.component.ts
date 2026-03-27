import { Component, OnInit } from '@angular/core';
import { Menu, Plat } from 'src/app/models/menu';
import { MenuService } from 'src/app/services/menu.service';

@Component({
  selector: 'app-menu',
  templateUrl: './menus.component.html',
  styleUrls: ['./menus.component.scss']
})
export class MenusComponent implements OnInit {
  menus: Menu[] = [];
  searchTerm: string = '';
  filters: string[] = ['gluten-free', 'vegetarian', 'diabetic'];
  selectedFilters: string[] = [];
  expandedMenu: string | null = null;

  constructor(private menuService: MenuService) {}

  ngOnInit(): void {
    this.menuService.getAllMenus().subscribe((data) => {
      this.menus = data;
      console.log('Menus récupérés :', this.menus);
    });
  }

  toggleFilter(filter: string) {
    if (this.selectedFilters.includes(filter)) {
      this.selectedFilters = this.selectedFilters.filter(f => f !== filter);
    } else {
      this.selectedFilters.push(filter);
    }
  }

  toggleMenu(menuId: string) {
    this.expandedMenu = this.expandedMenu === menuId ? null : menuId;
  }

  filteredMenus(): Menu[] {
    return this.menus.map(menu => ({
      ...menu,
      plats: this.filterPlats(menu.plats)
    }));
  }

  filterPlats(plats: Plat[]): Plat[] {
    return plats.filter(plat => {
      const matchesSearch = plat.nom.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchesFilters =
        this.selectedFilters.length === 0 || 
        (plat.tags && plat.tags.some(tag => this.selectedFilters.includes(tag)));
      return matchesSearch && matchesFilters;
    });
  }
}
