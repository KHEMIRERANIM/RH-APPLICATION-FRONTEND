import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { OffreService } from '../services/offre.service';
import { EntretienService } from '../services/entretien.service';
import { AuthService } from 'app/core/auth/auth.service';
import { Offre, Entretien, STATUT_LABELS } from '../models/recrutement.models';

@Component({
  selector: 'app-recrutement-dashboard',
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {

  loading = true;
  offres: Offre[] = [];
  tousEntretiens: Entretien[] = [];
  STATUT_LABELS = STATUT_LABELS;

  // KPIs
  get totalOffres(): number { return this.offres.length; }
  get offresPubliees(): number { return this.offres.filter(o => o.statut === 'PUBLIEE').length; }
  get offresBrouillon(): number { return this.offres.filter(o => o.statut === 'BROUILLON').length; }
  get totalCandidatures(): number { return this.offres.reduce((a, o) => a + o.nombreCandidatures, 0); }

  // Entretiens filtrés
  get entretiensAVenir(): Entretien[] {
    const now = new Date();
    return this.tousEntretiens.filter(e =>
      e.statut === 'PLANIFIE' && new Date(e.dateHeure) >= now
    );
  }

  get entretiensPasses(): Entretien[] {
    const now = new Date();
    return this.tousEntretiens.filter(e =>
      e.statut === 'PLANIFIE' && new Date(e.dateHeure) < now
    );
  }

  get entretiensRealises(): Entretien[] {
    return this.tousEntretiens.filter(e => e.statut === 'REALISE');
  }

  constructor(
    private offreService: OffreService,
    private entretienService: EntretienService,
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    const user = this.authService.currentUser;
    const userId = user?.id || user?.['_id'];

    forkJoin({
      offres: this.offreService.getOffresByAdmin(userId),
      entretiens: this.entretienService.getEntretiensParRecruteur(userId),
    }).subscribe({
      next: ({ offres, entretiens }) => {
        this.offres = offres;
        this.tousEntretiens = entretiens;
        this.loading = false;
      },
      error: () => this.loading = false,
    });
  }

  // Navigation
  voirPipeline(offre: Offre): void {
    this.router.navigate(['/recrutement/admin/pipeline', offre.id]);
  }

  creerOffre(): void {
    this.router.navigate(['/recrutement/admin/offres/creer']);
  }

  // Actions offres
  publierOffre(offre: Offre, event: Event): void {
    event.stopPropagation();
    this.offreService.publierOffre(offre.id).subscribe(() => {
      offre.statut = 'PUBLIEE';
    });
  }

  supprimerOffre(offre: Offre, event: Event): void {
    event.stopPropagation();
    if (!confirm(`Supprimer l'offre "${offre.titre}" ?`)) return;
    this.offreService.deleteOffre(offre.id).subscribe(() => {
      this.offres = this.offres.filter(o => o.id !== offre.id);
    });
  }

  // Actions entretiens
  marquerRealise(entretien: Entretien, event: Event): void {
    event.stopPropagation();
    this.entretienService.marquerRealise(entretien.id).subscribe(() => {
      entretien.statut = 'REALISE';
    });
  }

  supprimerEntretienPasse(entretien: Entretien, event: Event): void {
    event.stopPropagation();
    if (!confirm('Supprimer cet entretien passé ?')) return;
    this.entretienService.annulerEntretien(entretien.id).subscribe(() => {
      this.tousEntretiens = this.tousEntretiens.filter(e => e.id !== entretien.id);
    });
  }

  modifierEntretien(entretien: Entretien): void {
    this.router.navigate(['/recrutement/admin/entretiens/modifier', entretien.id]);
  }

  rejoindreMeet(lienVisio: string): void {
    window.open(lienVisio, '_blank');
  }

  isEntretienPasse(entretien: Entretien): boolean {
    return new Date(entretien.dateHeure) < new Date();
  }
}