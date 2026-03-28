import { Component, OnInit } from '@angular/core';
import { Avis } from 'src/app/models/avis';
import { AvisService } from 'src/app/services/avis.service';
import { CommandeService } from 'src/app/services/commande.service';
import { MenuService } from 'src/app/services/menu.service';
import { HttpClient } from '@angular/common/http';
import { RoleService } from 'app/core/auth/role.service';
import { Plat } from 'src/app/models/menu';

@Component({
  selector: 'app-avis',
  templateUrl: './avis.component.html',
  styleUrls: ['./avis.component.scss']
})
export class AvisComponent implements OnInit {
  avisList: Avis[] = [];
  platsCommandes: Plat[] = [];
  loading = false;
  errorMsg = '';
  successMsg = '';
  showForm = false;
  filterNote = 0;
  usersCache: { [id: string]: string } = {};

  newAvis: Partial<Avis> = { note: 5, commentaire: '', platId: '' };

  constructor(
    private avisService: AvisService,
    private commandeService: CommandeService,
    private menuService: MenuService,
    private http: HttpClient,
    public roleService: RoleService
  ) {}

  ngOnInit(): void {
    this.loadAvis();
    this.loadPlatsCommandes();
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

  loadAvis(): void {
    this.loading = true;
    this.avisService.getAllAvis().subscribe({
      next: (data) => {
        let filtered = data;
        if (this.roleService.isEmploye()) {
          filtered = data.filter(a => a.userId === this.roleService.userId);
        }
        if (this.roleService.isAdmin()) {
          const ids = [...new Set(data.map(a => a.userId))];
          ids.forEach(id => this.loadUserNom(id));
        }
        this.avisList = filtered.sort((a, b) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        this.loading = false;
      },
      error: () => { this.errorMsg = 'Erreur chargement.'; this.loading = false; }
    });
  }

  loadPlatsCommandes(): void {
    this.menuService.getAllMenus().subscribe({
      next: (menus) => {
        if (this.roleService.isAdmin()) {
          this.platsCommandes = menus.flatMap(m => m.plats || []);
        } else {
          this.commandeService.getCommandesByUser(this.roleService.userId).subscribe({
            next: (commandes) => {
              const platIds = [...new Set(commandes.flatMap(c => c.plats || []))];
              const allPlats = menus.flatMap(m => m.plats || []);
              this.platsCommandes = allPlats.filter(p => p.platId && platIds.includes(p.platId));
            }
          });
        }
      }
    });
  }

  getFiltered(): Avis[] {
    if (!this.filterNote) return this.avisList;
    return this.avisList.filter(a => a.note === this.filterNote);
  }

  getStars(note: number): string {
    return '⭐'.repeat(note) + '☆'.repeat(5 - note);
  }

  getMoyenne(): number {
    if (!this.avisList.length) return 0;
    return this.avisList.reduce((s, a) => s + a.note, 0) / this.avisList.length;
  }

  getPlatNom(platId: string): string {
    const plat = this.platsCommandes.find(p => p.platId === platId);
    return plat ? plat.nom : '—';
  }

  dejaAvis(platId: string): boolean {
    return this.avisList.some(a => a.platId === platId && a.userId === this.roleService.userId);
  }

  createAvis(): void {
    if (!this.newAvis.platId) { this.errorMsg = 'Choisissez un plat.'; return; }
    if (this.dejaAvis(this.newAvis.platId)) {
      this.errorMsg = 'Vous avez deja donne un avis pour ce plat.'; return;
    }
    const avis: Avis = {
      userId: this.roleService.userId,
      platId: this.newAvis.platId!,
      note: this.newAvis.note || 5,
      commentaire: this.newAvis.commentaire || '',
      date: new Date().toISOString().split('T')[0]
    };
    this.avisService.createAvis(avis).subscribe({
      next: () => {
        this.successMsg = 'Avis envoye !';
        setTimeout(() => this.successMsg = '', 3000);
        this.showForm = false;
        this.newAvis = { note: 5, commentaire: '', platId: '' };
        this.loadAvis();
      },
      error: (err) => { this.errorMsg = err.error?.message || 'Erreur ajout avis.'; }
    });
  }

  deleteAvis(id: string): void {
    if (!confirm('Supprimer cet avis ?')) return;
    this.avisService.deleteAvis(id).subscribe({
      next: () => {
        this.successMsg = 'Avis supprime.';
        setTimeout(() => this.successMsg = '', 3000);
        this.loadAvis();
      },
      error: () => { this.errorMsg = 'Erreur suppression.'; }
    });
  }
}
