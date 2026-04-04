import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { EntretienService } from '../services/entretien.service';
import { CandidatureService } from '../services/candidature.service';
import { AuthService } from 'app/core/auth/auth.service';
import { Candidature, TypeEntretien } from '../models/recrutement.models';

@Component({
  selector: 'app-planifier-entretien',
  templateUrl: './planifier-entretien.component.html',
})
export class PlanifierEntretienComponent implements OnInit {

  form: FormGroup;
  candidature: Candidature | null = null;
  loading = false;
  submitted = false;
  meetLinkCreated = false;
  meetLink = '';
  errorMsg = '';
  typesEntretien: TypeEntretien[] = ['TELEPHONIQUE', 'VISIO', 'PRESENTIEL'];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private entretienService: EntretienService,
    private candidatureService: CandidatureService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    const candidatureId = this.route.snapshot.queryParamMap.get('candidatureId');
    const user = this.authService.currentUser;

    this.form = this.fb.group({
      candidatureId: [candidatureId, Validators.required],
      recruteurId:   [user?.id || user?.['_id'], Validators.required],
      type:          ['VISIO', Validators.required],
      dateHeure:     ['', Validators.required],
      dureeMinutes:  [60, [Validators.required, Validators.min(15)]],
      lieu:          [''],
      // ✅ PAS de lienVisio ici — généré automatiquement par le backend
    });

    if (candidatureId) {
      this.candidatureService.getCandidatureById(candidatureId).subscribe({
        next: (c) => this.candidature = c,
      });
    }
  }

  get showLieu(): boolean {
    return this.form.get('type')?.value === 'PRESENTIEL';
  }

  get isVisio(): boolean {
    return this.form.get('type')?.value === 'VISIO';
  }

  submit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.errorMsg = '';

    // ✅ N'envoie PAS lienVisio — le backend le génère automatiquement
    const payload = {
      candidatureId: this.form.value.candidatureId,
      recruteurId:   this.form.value.recruteurId,
      type:          this.form.value.type,
      dateHeure:     this.form.value.dateHeure,
      dureeMinutes:  this.form.value.dureeMinutes,
      lieu:          this.form.value.lieu || null,
      lienVisio:     null, // ← null pour forcer la génération backend
    };

    this.entretienService.planifierEntretien(payload).subscribe({
      next: (entretien) => {
        this.loading = false;
        this.submitted = true;
        // Récupère le lien Meet généré par le backend
        if (entretien.lienVisio) {
          this.meetLinkCreated = true;
          this.meetLink = entretien.lienVisio;
        }
      },
      error: (err) => {
        this.loading = false;
        if (err?.status === 0) {
          this.errorMsg = 'Backend non démarré sur le port 8081.';
        } else {
          this.errorMsg = 'Erreur lors de la planification.';
        }
      },
    });
  }

  retour(): void {
    if (this.candidature) {
      this.router.navigate(['/recrutement/admin/pipeline', this.candidature.offreId]);
    } else {
      this.router.navigate(['/recrutement/admin/dashboard']);
    }
  }
}