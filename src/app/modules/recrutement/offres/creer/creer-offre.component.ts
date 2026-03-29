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
  niveauxExp   = ['Junior (0-2 ans)', 'Confirmé (3-5 ans)', 'Senior (5+ ans)', 'Expert'];
  niveauxEtudes = ['Bac', 'Bac+2', 'Bac+3', 'Bac+5', 'Doctorat'];

  competences: string[] = [];
  avantages: string[]   = [];
  readonly separatorKeysCodes = [ENTER, COMMA];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private offreService: OffreService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      titre:            ['', Validators.required],
      description:      ['', [Validators.required, Validators.minLength(50)]],
      departement:      ['', Validators.required],
      localisation:     ['', Validators.required],
      typeContrat:      ['CDI', Validators.required],
      niveauExperience: ['', Validators.required],
      niveauEtudes:     ['', Validators.required],
      salaireMin:       [null, [Validators.required, Validators.min(0)]],
      salaireMax:       [null, [Validators.required, Validators.min(0)]],
      nombrePostes:     [1, [Validators.required, Validators.min(1)]],
      dateExpiration:   ['', Validators.required],
    });
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
    if (this.form.invalid) return;
    this.loading = true;
    this.errorMsg = '';
    const user = this.authService.currentUser;
    this.offreService.createOffre({
      ...this.form.value,
      competencesRequises: this.competences,
      avantages: this.avantages,
    }, user.id).subscribe({
      next: () => { this.loading = false; this.router.navigate(['/recrutement/admin/offres']); },
      error: (e) => { this.loading = false; this.errorMsg = e?.error || 'Erreur lors de la création'; },
    });
  }

  retour(): void { this.router.navigate(['/recrutement/admin/offres']); }
}