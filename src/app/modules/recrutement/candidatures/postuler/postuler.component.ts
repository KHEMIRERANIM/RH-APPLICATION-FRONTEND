import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { OffreService } from '../../services/offre.service';
import { CandidatureService } from '../../services/candidature.service';
import { AuthService } from 'app/core/auth/auth.service';
import { Offre } from '../../models/recrutement.models';

@Component({
  selector: 'app-postuler',
  templateUrl: './postuler.component.html',
})
export class PostulerComponent implements OnInit {

  offre: Offre | null = null;
  form: FormGroup;
  cvFile: File | null = null;
  lettreFile: File | null = null;
  loading = false;
  submitted = false;
  errorMsg = '';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private offreService: OffreService,
    private candidatureService: CandidatureService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      cvFile: [null, Validators.required],
      lettreFile: [null],
    });

    const id = this.route.snapshot.paramMap.get('offreId');
    if (id) {
      this.offreService.getOffreById(id).subscribe({
        next: (o) => this.offre = o,
        error: () => this.router.navigate(['/recrutement/offres']),
      });
    }
  }

  onCvChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.cvFile = input.files[0];
      this.form.patchValue({ cvFile: this.cvFile });
    }
  }

  onLettreChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) this.lettreFile = input.files[0];
  }

  submit(): void {
    if (this.form.invalid || !this.cvFile || !this.offre) return;

    this.loading = true;
    this.errorMsg = '';
    const user = this.authService.currentUser;

    this.candidatureService.postuler(
      user.id, this.offre.id, this.cvFile, this.lettreFile || undefined
    ).subscribe({
      next: () => {
        this.submitted = true;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        if (typeof err?.error === 'string') {
          this.errorMsg = err.error;
        } else if (err?.error?.message) {
          this.errorMsg = err.error.message;
        } else if (err?.status === 0) {
          this.errorMsg = 'Backend non démarré. Lancez le serveur Spring Boot sur le port 8081.';
        } else if (err?.status === 401) {
          this.errorMsg = 'Session expirée. Veuillez vous reconnecter.';
        } else if (err?.status === 409) {
          this.errorMsg = 'Vous avez déjà postulé à cette offre.';
        } else if (err?.status === 404) {
          this.errorMsg = 'Offre introuvable.';
        } else {
          this.errorMsg = 'Une erreur est survenue. Veuillez réessayer.';
        }
      },
    });
  }

  retour(): void {
    this.router.navigate(['/recrutement/offres', this.offre?.id]);
  }
}