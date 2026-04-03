import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { RestaurantPanierService, PanierLigne } from '../services/restaurant-panier.service';
import { RoleService } from 'app/core/auth/role.service';

@Component({
  selector: 'app-restaurant-mini-panier',
  templateUrl: './restaurant-mini-panier.component.html',
  styleUrls: ['./restaurant-mini-panier.component.scss']
})
export class RestaurantMiniPanierComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  lignes: PanierLigne[] = [];
  errorMsg = '';
  loading = false;
  ajustementMsg = '';

  constructor(
    public panier: RestaurantPanierService,
    public roleService: RoleService
  ) {}

  ngOnInit(): void {
    this.panier.lignes$.pipe(takeUntil(this.destroy$)).subscribe(l => {
      this.lignes = l;
      if (l.length === 0) {
        this.panier.panierOuvert = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggle(): void {
    if (this.lignes.length === 0) {
      return;
    }
    this.panier.panierOuvert = !this.panier.panierOuvert;
  }

  inc(platId: string): void {
    this.ajustementMsg = '';
    const err = this.panier.incrementer(platId);
    if (err) {
      this.ajustementMsg = err;
      setTimeout(() => this.ajustementMsg = '', 3500);
    }
  }

  dec(platId: string): void {
    this.panier.decrementer(platId);
  }

  retirer(platId: string): void {
    this.panier.retirerLigne(platId);
  }

  vider(): void {
    this.panier.vider();
    this.errorMsg = '';
  }

  confirmer(): void {
    this.errorMsg = '';
    this.loading = true;
    this.panier.confirmerCommande().subscribe({
      next: () => {
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.errorMsg = err?.error?.message || 'Impossible de valider la commande.';
      }
    });
  }
}
