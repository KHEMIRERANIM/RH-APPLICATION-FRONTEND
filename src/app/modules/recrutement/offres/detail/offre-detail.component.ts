import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { OffreService } from '../../services/offre.service';
import { AuthService } from 'app/core/auth/auth.service';
import { Offre } from '../../models/recrutement.models';

@Component({
  selector: 'app-offre-detail',
  templateUrl: './offre-detail.component.html',
})
export class OffreDetailComponent implements OnInit {

  offre: Offre | null = null;
  loading = true;

  get isAdmin(): boolean { return this.authService.isAdmin(); }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private offreService: OffreService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.offreService.getOffreById(id).subscribe({
        next: (o) => { this.offre = o; this.loading = false; },
        error: () => this.loading = false,
      });
    }
  }

  postuler(): void {
    this.router.navigate(['/recrutement/postuler', this.offre?.id]);
  }

  voirPipeline(): void {
    this.router.navigate(['/recrutement/admin/pipeline', this.offre?.id]);
  }

  retour(): void {
    this.router.navigate(['/recrutement/offres']);
  }

  publier(): void {
    if (!this.offre) return;
    this.offreService.publierOffre(this.offre.id).subscribe(() => {
      if (this.offre) this.offre.statut = 'PUBLIEE';
    });
  }
}
