import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CandidatureService } from '../../services/candidature.service';
import { OffreService } from '../../services/offre.service';
import { AuthService } from 'app/core/auth/auth.service';
import { Candidature, Offre, STATUT_LABELS, STATUT_COLORS, KANBAN_COLUMNS } from '../../models/recrutement.models';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-mes-candidatures',
  templateUrl: './mes-candidatures.component.html',
})
export class MesCandidaturesComponent implements OnInit {

  candidatures: Candidature[] = [];
  offresMap: Record<string, Offre> = {};
  loading = true;

  STATUT_LABELS = STATUT_LABELS;
  STATUT_COLORS = STATUT_COLORS;
  KANBAN_COLUMNS = KANBAN_COLUMNS;

  constructor(
    private candidatureService: CandidatureService,
    private offreService: OffreService,
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    const user = this.authService.currentUser;
    this.candidatureService.getMesCandidatures(user.id).subscribe({
      next: (data) => {
        this.candidatures = data;
        // Charger les offres correspondantes
        const offresRequests = data.map(c =>
          this.offreService.getOffreById(c.offreId).pipe(catchError(() => of(null)))
        );
        forkJoin(offresRequests).subscribe(offres => {
          offres.forEach((o, i) => {
            if (o) this.offresMap[data[i].offreId] = o;
          });
          this.loading = false;
        });
      },
      error: () => this.loading = false,
    });
  }

  getProgressStep(statut: string): number {
    return KANBAN_COLUMNS.indexOf(statut as any) + 1;
  }

  voirDetail(candidature: Candidature): void {
    this.router.navigate(['/recrutement/offres', candidature.offreId]);
  }
}
