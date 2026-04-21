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
  readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

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
      const file = input.files[0];
      if (file.type !== 'application/pdf') {
        this.errorMsg = 'Le CV doit être un fichier PDF.';
        this.cvFile = null;
        this.form.patchValue({ cvFile: null });
        return;
      }
      if (file.size > this.MAX_FILE_SIZE) {
        this.errorMsg = 'Le fichier est trop volumineux (max 5 Mo).';
        this.cvFile = null;
        this.form.patchValue({ cvFile: null });
        return;
      }
      this.cvFile = file;
      this.form.patchValue({ cvFile: this.cvFile });
      this.errorMsg = '';
    }
  }

  onLettreChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      const file = input.files[0];
      if (file.type !== 'application/pdf') {
        this.errorMsg = 'La lettre de motivation doit être un fichier PDF.';
        this.lettreFile = null;
        return;
      }
      if (file.size > this.MAX_FILE_SIZE) {
        this.errorMsg = 'La lettre est trop volumineuse (max 5 Mo).';
        this.lettreFile = null;
        return;
      }
      this.lettreFile = file;
      this.errorMsg = '';
    }
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