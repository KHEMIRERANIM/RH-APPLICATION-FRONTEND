import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { MatChipInputEvent } from '@angular/material/chips';
import { OffreService } from '../../services/offre.service';
import { AuthService } from 'app/core/auth/auth.service';
import { TypeContrat } from '../../models/recrutement.models';

@Component({
  selector: 'app-creer-offre',
  templateUrl: './creer-offre.component.html',
})
export class CreerOffreComponent implements OnInit {

  form: FormGroup;
  loading = false;
  errorMsg = '';

  typesContrat: TypeContrat[] = ['CDI', 'CDD', 'STAGE', 'ALTERNANCE', 'FREELANCE'];
  departements = ['IT', 'RH', 'Finance', 'Marketing', 'Commercial', 'Logistique', 'Direction'];
  niveauxExp = ['Junior (0-2 ans)', 'Confirmé (3-5 ans)', 'Senior (5+ ans)', 'Expert'];
  niveauxEtudes = ['Bac', 'Bac+2', 'Bac+3', 'Bac+5', 'Doctorat'];

  competences: string[] = [];
  avantages: string[] = [];
  readonly separatorKeysCodes = [ENTER, COMMA];

  // ANTI-BIAIS RSE
  inclusionScore = 100;
  biasedWordsFound: string[] = [];
  readonly BIASED_WORDS = ['jeune diplômé', 'ninja', 'viril', 'résistance à la pression', 'digital native', 'rockstar', 'jeune et dynamique', 'homme', 'femme', 'sans attache'];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private offreService: OffreService,
    private authService: AuthService,
  ) { }

  ngOnInit(): void {
    // Debug — vérifie le user connecté
    console.log('USER CONNECTÉ:', this.authService.currentUser);

    this.form = this.fb.group({
      titre: ['', Validators.required],
      description: ['', [Validators.required, Validators.minLength(50)]],
      departement: ['', Validators.required],
      localisation: ['', Validators.required],
      typeContrat: ['CDI', Validators.required],
      niveauExperience: ['', Validators.required],
      niveauEtudes: ['', Validators.required],
      salaireMin: [null, [Validators.required, Validators.min(0)]],
      salaireMax: [null, [Validators.required, Validators.min(0)]],
      nombrePostes: [1, [Validators.required, Validators.min(1)]],
      dateExpiration: ['', Validators.required],
    });

    // ÉCOUTEUR TEMPS-RÉEL RSE
    this.form.get('description')?.valueChanges.subscribe(val => this.analyzeBias(val));
  }

  analyzeBias(text: string): void {
    if (!text) {
      this.inclusionScore = 100;
      this.biasedWordsFound = [];
      return;
    }
    const lower = text.toLowerCase();
    this.biasedWordsFound = this.BIASED_WORDS.filter(w => lower.includes(w));
    this.inclusionScore = Math.max(0, 100 - (this.biasedWordsFound.length * 20));
  }

  addCompetence(event: MatChipInputEvent): void {
    const v = (event.value || '').trim();
    if (v) this.competences.push(v);
    event.chipInput!.clear();
  }

  removeCompetence(c: string): void {
    this.competences = this.competences.filter(x => x !== c);
  }

  addAvantage(event: MatChipInputEvent): void {
    const v = (event.value || '').trim();
    if (v) this.avantages.push(v);
    event.chipInput!.clear();
  }

  removeAvantage(a: string): void {
    this.avantages = this.avantages.filter(x => x !== a);
  }

  submit(): void {
    if (this.form.invalid || this.inclusionScore < 70) {
      if (this.inclusionScore < 70) {
        this.errorMsg = 'Bloqué par la politique RSE ⛔ : Veuillez retirer les expressions discriminatoires pour atteindre au moins 70% d\'inclusion.';
      }
      return;
    }

    this.loading = true;
    this.errorMsg = '';

    // Récupère le user connecté
    const user = this.authService.currentUser;
    console.log('SUBMIT - USER:', user);
    console.log('SUBMIT - FORM:', this.form.value);

    // Récupère l'ID du user (essaie plusieurs propriétés possibles)
    const createurId = user?.id || user?.['_id'] || user?.['userId'] || 'admin';
    console.log('CREATEUR ID:', createurId);

    this.offreService.createOffre({
      ...this.form.value,
      competencesRequises: this.competences,
      avantages: this.avantages,
    }, createurId).subscribe({
      next: (offre) => {
        console.log('OFFRE CRÉÉE:', offre);
        this.loading = false;
        this.router.navigate(['/recrutement/admin/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        console.error('ERREUR CRÉATION:', err);
        if (err?.status === 0) {
          this.errorMsg = 'Backend non démarré sur le port 8081.';
        } else if (err?.status === 401) {
          this.errorMsg = 'Non autorisé. Vérifiez votre connexion.';
        } else if (typeof err?.error === 'string') {
          this.errorMsg = err.error;
        } else {
          this.errorMsg = 'Erreur ' + (err?.status || '') + ' lors de la création.';
        }
      },
    });
  }

  retour(): void { this.router.navigate(['/recrutement/admin/offres']); }
}
