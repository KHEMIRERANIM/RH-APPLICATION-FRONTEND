import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject, of, Observable } from 'rxjs';
import { map, switchMap, catchError, tap } from 'rxjs/operators';
import { Plat } from 'src/app/models/menu';
import { Commande } from 'src/app/models/commande';
import { CommandeService } from 'src/app/services/commande.service';
import { MenuService } from 'src/app/services/menu.service';
import { RoleService } from 'app/core/auth/role.service';

export interface PanierLigne {
  menuId: string;
  platId: string;
  nom: string;
  menuTitre: string;
  prix: number;
  image?: string;
  /** quantité commandée dans le panier */
  quantite: number;
  /** stock max (quantité API) au moment de l’ajout — borne supérieure pour ce plat */
  stockMax: number;
}

@Injectable({ providedIn: 'root' })
export class RestaurantPanierService {
  private readonly _lignes = new BehaviorSubject<PanierLigne[]>([]);
  readonly lignes$ = this._lignes.asObservable();

  /** émis après une commande réussie (recharger menus / catalogue) */
  readonly commandePassee$ = new Subject<void>();

  panierOuvert = false;

  constructor(
    private commandeService: CommandeService,
    private menuService: MenuService,
    private roleService: RoleService
  ) {}

  get lignes(): PanierLigne[] {
    return this._lignes.value;
  }

  get totalArticles(): number {
    return this.lignes.reduce((s, l) => s + l.quantite, 0);
  }

  get montantTotal(): number {
    return this.lignes.reduce((s, l) => s + l.quantite * (l.prix || 0), 0);
  }

  get menuIdCourant(): string | null {
    return this.lignes.length ? this.lignes[0].menuId : null;
  }

  getQtyPourPlat(platId: string): number {
    const l = this.lignes.find(x => x.platId === platId);
    return l ? l.quantite : 0;
  }

  /** Stock API moins ce qui est déjà dans le panier pour ce plat */
  quantiteRestanteCommandable(plat: Plat): number {
    const stock = Math.max(0, Number(plat.quantite) || 0);
    return Math.max(0, stock - this.getQtyPourPlat(plat.platId!));
  }

  /**
   * Ajoute des unités d’un plat. Un seul menu par panier.
   * @returns message d’erreur ou null si OK
   */
  ajouterPlat(menuId: string, menuTitre: string, plat: Plat, quantite: number): string | null {
    if (!this.roleService.isEmploye()) {
      return 'Connexion employe requise.';
    }
    if (!plat.platId || quantite < 1) {
      return 'Quantite invalide.';
    }
    if (this.lignes.length > 0 && this.lignes[0].menuId !== menuId) {
      return 'Vous ne pouvez commander que des plats du meme menu. Videz le panier ou validez la commande.';
    }
    const stock = Math.max(0, Number(plat.quantite) || 0);
    const deja = this.getQtyPourPlat(plat.platId);
    if (deja + quantite > stock) {
      const reste = Math.max(0, stock - deja);
      return reste <= 0
        ? 'Plus de stock pour ce plat.'
        : `Il ne reste que ${reste} unité(s) pour ce plat.`;
    }

    const next = [...this.lignes];
    const i = next.findIndex(l => l.platId === plat.platId);
    if (i >= 0) {
      next[i] = {
        ...next[i],
        quantite: next[i].quantite + quantite,
        stockMax: stock
      };
    } else {
      next.push({
        menuId,
        platId: plat.platId,
        nom: plat.nom,
        menuTitre,
        prix: plat.prix || 0,
        image: plat.image,
        quantite,
        stockMax: stock
      });
    }
    this._lignes.next(next);
    return null;
  }

  /** Met à la quantité exacte (1..stockMax) */
  setQuantitePlat(platId: string, q: number): string | null {
    const next = [...this.lignes];
    const i = next.findIndex(l => l.platId === platId);
    if (i < 0) {
      return null;
    }
    const line = next[i];
    const max = Math.max(0, line.stockMax);
    if (q < 1) {
      next.splice(i, 1);
      this._lignes.next(next);
      return null;
    }
    if (q > max) {
      return `Maximum ${max} selon le stock.`;
    }
    next[i] = { ...line, quantite: q };
    this._lignes.next(next);
    return null;
  }

  incrementer(platId: string): string | null {
    const line = this.lignes.find(l => l.platId === platId);
    if (!line) {
      return null;
    }
    return this.setQuantitePlat(platId, line.quantite + 1);
  }

  decrementer(platId: string): void {
    const line = this.lignes.find(l => l.platId === platId);
    if (!line) {
      return;
    }
    this.setQuantitePlat(platId, line.quantite - 1);
  }

  retirerLigne(platId: string): void {
    this._lignes.next(this.lignes.filter(l => l.platId !== platId));
  }

  vider(): void {
    this._lignes.next([]);
  }

  /** Répète chaque platId selon la quantité (contrat API existant) */
  private buildPlatsIdsPourApi(): string[] {
    const out: string[] = [];
    this.lignes.forEach(l => {
      for (let i = 0; i < l.quantite; i++) {
        out.push(l.platId);
      }
    });
    return out;
  }

  confirmerCommande(): Observable<void> {
    if (!this.roleService.isEmploye()) {
      return of(undefined);
    }
    const lignes = this.lignes;
    if (lignes.length === 0) {
      return of(undefined);
    }
    const menuId = lignes[0].menuId;
    const plats = this.buildPlatsIdsPourApi();
    const commande: Commande = {
      userId: this.roleService.userId,
      menuId,
      plats,
      dateCommande: new Date().toISOString().split('T')[0],
      statut: 'en_attente'
    };
    return this.commandeService.createCommande(commande).pipe(
      switchMap(() =>
        this.menuService.decrementPlatsApresCommande(menuId, plats).pipe(
          catchError(() => of(null))
        )
      ),
      tap(() => this.apresCommandeOk()),
      map(() => void 0)
    );
  }

  private apresCommandeOk(): void {
    this.vider();
    this.panierOuvert = false;
    this.commandePassee$.next();
  }
}
