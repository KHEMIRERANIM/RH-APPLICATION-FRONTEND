import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { CandidatureService } from '../services/candidature.service';
import { OffreService } from '../services/offre.service';
import { EntretienService } from '../services/entretien.service';
import { AuthService } from 'app/core/auth/auth.service';
import {
  Candidature,
  Offre,
  KanbanData,
  StatutCandidature,
  STATUT_LABELS,
  STATUT_COLORS,
  KANBAN_COLUMNS,
  ChangerStatutRequest,
} from '../models/recrutement.models';

@Component({
  selector: 'app-pipeline',
  templateUrl: './pipeline.component.html',
  standalone: false,
})
export class PipelineComponent implements OnInit {

  offre: Offre | null = null;
  kanban: KanbanData = {};
  loading = true;

  selectedCandidature: Candidature | null = null;
  notesText = '';
  savingNotes = false;
  changingStatut = false;

  STATUT_LABELS = STATUT_LABELS;
  STATUT_COLORS = STATUT_COLORS;
  KANBAN_COLUMNS = KANBAN_COLUMNS;

  get allStatuts(): StatutCandidature[] {
    return KANBAN_COLUMNS;
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private candidatureService: CandidatureService,
    private offreService: OffreService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    const offreId = this.route.snapshot.paramMap.get('offreId');
    if (!offreId) { this.router.navigate(['/recrutement/admin/offres']); return; }

    this.offreService.getOffreById(offreId).subscribe(o => this.offre = o);
    this.loadKanban(offreId);
  }

  loadKanban(offreId?: string): void {
    const id = offreId || this.offre?.id;
    if (!id) return;
    this.loading = true;
    this.candidatureService.getKanban(id).subscribe({
      next: (data) => { 
        for (const k of Object.keys(data)) {
          data[k].sort((a, b) => (b.scoreMatching || 0) - (a.scoreMatching || 0));
        }
        this.kanban = data; 
        this.loading = false; 
      },
      error: () => this.loading = false,
    });
  }

  getCandidaturesForStatut(statut: StatutCandidature): Candidature[] {
    return this.kanban[statut] || [];
  }

  getTotalCandidatures(): number {
    return KANBAN_COLUMNS.reduce((acc, s) => acc + (this.kanban[s]?.length || 0), 0);
  }

  selectCandidature(c: Candidature): void {
    this.selectedCandidature = c;
    this.notesText = c.notesRecruteur || '';
  }

  closePanel(): void {
    this.selectedCandidature = null;
  }

  changerStatut(nouveauStatut: StatutCandidature): void {
    if (!this.selectedCandidature) return;
    this.changingStatut = true;
    const req: ChangerStatutRequest = { nouveauStatut, commentaire: '' };
    this.candidatureService.changerStatut(this.selectedCandidature.id, req).subscribe({
      next: () => {
        this.changingStatut = false;
        this.closePanel();
        this.loadKanban();
      },
      error: () => this.changingStatut = false,
    });
  }

  sauvegarderNotes(): void {
    if (!this.selectedCandidature) return;
    this.savingNotes = true;
    this.candidatureService.ajouterNotes(this.selectedCandidature.id, this.notesText).subscribe({
      next: (updated) => {
        this.savingNotes = false;
        this.selectedCandidature = updated;
      },
      error: () => this.savingNotes = false,
    });
  }

  planifierEntretien(): void {
    if (!this.selectedCandidature) return;
    this.router.navigate(['/recrutement/admin/entretiens/planifier'], {
      queryParams: { candidatureId: this.selectedCandidature.id }
    });
  }

  scoreColor(score: number): string {
    if (score >= 75) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-500';
  }

  scoreBg(score: number): string {
    if (score >= 75) return 'bg-green-100';
    if (score >= 50) return 'bg-yellow-100';
    return 'bg-red-100';
  }

  telechargerContrat(): void {
    if (!this.selectedCandidature) return;
    this.candidatureService.telechargerContratPdf(this.selectedCandidature.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `contrat_${this.selectedCandidature?.candidatId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
      },
      error: (err) => console.error("Erreur téléchargement contrat", err)
    });
  }

  retour(): void {
    this.router.navigate(['/recrutement/admin/offres']);
  }
}
