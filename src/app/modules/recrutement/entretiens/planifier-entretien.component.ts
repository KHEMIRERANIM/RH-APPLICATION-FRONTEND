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
      lienVisio:     [''],
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

  submit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.errorMsg = '';

    const isVisio = this.form.get('type')?.value === 'VISIO';

    this.entretienService.planifierEntretien(this.form.value).subscribe({
      next: (entretien) => {
        this.loading = false;
        this.submitted = true;
        // Vérifie si un lien Meet a été créé
        this.meetLinkCreated = isVisio && !!entretien.lienVisio;
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