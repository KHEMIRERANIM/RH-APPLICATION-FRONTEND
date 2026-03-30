import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { OffreService } from '../services/offre.service';
import { CandidatureService } from '../services/candidature.service';
import { EntretienService } from '../services/entretien.service';
import { AuthService } from 'app/core/auth/auth.service';
import { Offre, Candidature, Entretien, STATUT_LABELS } from '../models/recrutement.models';

@Component({
  selector: 'app-recrutement-dashboard',
  templateUrl: './dashboard.component.html',
  standalone: false,
})
export class DashboardComponent implements OnInit {

  loading = true;

  offres: Offre[] = [];
  candidaturesRecentes: Candidature[] = [];
  entretiensAVenir: Entretien[] = [];

  // KPIs
  get totalOffresPubliees(): number { return this.offres.filter(o => o.statut === 'PUBLIEE').length; }
  get totalCandidatures(): number { return this.offres.reduce((a, o) => a + o.nombreCandidatures, 0); }
  get entretiensCount(): number { return this.entretiensAVenir.length; }

  STATUT_LABELS = STATUT_LABELS;

  constructor(
    private offreService: OffreService,
    private candidatureService: CandidatureService,
    private entretienService: EntretienService,
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    const user = this.authService.currentUser;
    forkJoin({
      offres: this.offreService.getOffresByAdmin(user.id),
      entretiens: this.entretienService.getEntretiensParRecruteur(user.id),
    }).subscribe({
      next: ({ offres, entretiens }) => {
        this.offres = offres; // Toutes les offres incluant BROUILLON
        this.entretiensAVenir = entretiens.filter(e => e.statut === 'PLANIFIE');
        this.loading = false;
      },
    });
}

  voirPipeline(offre: Offre): void {
    this.router.navigate(['/recrutement/admin/pipeline', offre.id]);
  }

  creerOffre(): void {
    this.router.navigate(['/recrutement/admin/offres/creer']);
  }

  publierOffre(offre: Offre): void {
    this.offreService.publierOffre(offre.id).subscribe(() => {
      offre.statut = 'PUBLIEE';
    });
  }
}
