import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CandidatureService } from '../../services/candidature.service';
import { OffreService } from '../../services/offre.service';
import { EntretienService } from '../../services/entretien.service';
import { AuthService } from 'app/core/auth/auth.service';
import { Candidature, Offre, Entretien, STATUT_LABELS, STATUT_COLORS, KANBAN_COLUMNS } from '../../models/recrutement.models';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-mes-candidatures',
  templateUrl: './mes-candidatures.component.html',
})
export class MesCandidaturesComponent implements OnInit {

  candidatures: Candidature[] = [];
  offresMap: Record<string, Offre> = {};
  entretiensMap: Record<string, Entretien[]> = {};
  loading = true;

  STATUT_LABELS = STATUT_LABELS;
  STATUT_COLORS = STATUT_COLORS;
  KANBAN_COLUMNS = KANBAN_COLUMNS;

  constructor(
    private candidatureService: CandidatureService,
    private offreService: OffreService,
    private entretienService: EntretienService,
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
        // Charger les entretiens pour chaque candidature
        const entretiensRequests = data.map(c =>
          this.entretienService.getEntretiensParCandidature(c.id).pipe(catchError(() => of([])))
        );

        forkJoin([forkJoin(offresRequests), forkJoin(entretiensRequests)]).subscribe(([offres, entretiens]) => {
          offres.forEach((o, i) => {
            if (o) this.offresMap[data[i].offreId] = o;
          });
          entretiens.forEach((e, i) => {
            this.entretiensMap[data[i].id] = e;
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

  supprimerCandidature(candidature: Candidature, event: Event): void {
    event.stopPropagation();
    if (!confirm('Voulez-vous vraiment supprimer cette candidature ?')) {
      return;
    }

    this.candidatureService.deleteCandidature(candidature.id).subscribe(() => {
      this.candidatures = this.candidatures.filter(c => c.id !== candidature.id);
      delete this.offresMap[candidature.offreId];
      delete this.entretiensMap[candidature.id];
    });
  }

  telechargerEntretien(entretien: Entretien): void {
    const contenu = [
      'Entretien',
      '-------------------------',
      `ID : ${entretien.id}`,
      `Candidature : ${entretien.candidatureId}`,
      `Recruteur : ${entretien.recruteurId}`,
      `Type : ${entretien.type}`,
      `Date / heure : ${new Date(entretien.dateHeure).toLocaleString()}`,
      `Durée : ${entretien.dureeMinutes} minutes`,
      `Lieu : ${entretien.lieu || 'Non spécifié'}`,
      `Lien visio : ${entretien.lienVisio || 'Aucun'}`,
      `Statut : ${entretien.statut}`,
      `Feedback global : ${entretien.feedbackGlobal || 'Aucun'}`,
      `Note globale : ${entretien.noteGlobale ?? 'N/A'}`,
      `Points forts : ${entretien.pointsForts?.join(', ') || 'Aucun'}`,
      `Points faibles : ${entretien.pointsFaibles?.join(', ') || 'Aucun'}`,
      `Recommandation : ${entretien.recommandeEmbauche ? 'Oui' : 'Non'}`,
      `Créé le : ${new Date(entretien.createdAt).toLocaleString()}`,
    ].join('\r\n');

    const blob = new Blob([contenu], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `entretien-${entretien.id}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  rejoindreMeet(lienVisio: string): void {
    window.open(lienVisio, '_blank');
  }
}
