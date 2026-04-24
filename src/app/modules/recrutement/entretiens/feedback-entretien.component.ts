import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { EntretienService } from '../services/entretien.service';
import { Entretien } from '../models/recrutement.models';

@Component({
  selector: 'app-feedback-entretien',
  templateUrl: './feedback-entretien.component.html',
})
export class FeedbackEntretienComponent implements OnInit {

  form: FormGroup;
  entretien: Entretien | null = null;
  loading = false;
  submitted = false;
  errorMsg = '';

  pointsFortsList: string[] = [];
  pointsFaiblesList: string[] = [];
  newPointFort = '';
  newPointFaible = '';

  noteLabels = ['', 'Très mauvais', 'Mauvais', 'Insuffisant', 'Passable', 'Moyen',
                'Correct', 'Bien', 'Très bien', 'Excellent', 'Parfait'];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private entretienService: EntretienService,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.form = this.fb.group({
      feedbackGlobal:    ['', Validators.required],
      noteGlobale:       [5, [Validators.required, Validators.min(1), Validators.max(10)]],
      recommandeEmbauche:[false],
    });

    if (id) {
      this.entretienService.getEntretienById(id).subscribe(e => this.entretien = e);
    }
  }

  addPointFort(): void {
    if (this.newPointFort.trim()) {
      this.pointsFortsList.push(this.newPointFort.trim());
      this.newPointFort = '';
    }
  }

  removePointFort(i: number): void { this.pointsFortsList.splice(i, 1); }

  addPointFaible(): void {
    if (this.newPointFaible.trim()) {
      this.pointsFaiblesList.push(this.newPointFaible.trim());
      this.newPointFaible = '';
    }
  }

  removePointFaible(i: number): void { this.pointsFaiblesList.splice(i, 1); }

  submit(): void {
    if (this.form.invalid || !this.entretien) return;
    this.loading = true;
    this.entretienService.ajouterFeedback(this.entretien.id, {
      ...this.form.value,
      pointsForts: this.pointsFortsList,
      pointsFaibles: this.pointsFaiblesList,
    }).subscribe({
      next: () => { this.submitted = true; this.loading = false; },
      error: (e) => { this.loading = false; this.errorMsg = e?.error || 'Erreur'; },
    });
  }

  retour(): void { this.router.navigate(['/recrutement/admin/entretiens']); }
}
