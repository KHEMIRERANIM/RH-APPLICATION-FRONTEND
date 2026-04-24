import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormControl } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { OffreService } from '../../services/offre.service';
import { AuthService } from 'app/core/auth/auth.service';
import { Offre, TypeContrat } from '../../models/recrutement.models';

@Component({
  selector: 'app-offres-list',
  templateUrl: './offres-list.component.html',
})
export class OffresListComponent implements OnInit {

  offres: Offre[] = [];
  loading = true;

  searchCtrl       = new FormControl('');
  departementCtrl  = new FormControl('');
  typeContratCtrl  = new FormControl('');
  localisationCtrl = new FormControl('');

  departements = ['IT', 'RH', 'Finance', 'Marketing', 'Commercial', 'Logistique'];
  typesContrat: TypeContrat[] = ['CDI', 'CDD', 'STAGE', 'ALTERNANCE', 'FREELANCE'];

  get isAdmin(): boolean { return this.authService.isAdmin(); }

  constructor(
    private offreService: OffreService,
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadOffres();
    this.searchCtrl.valueChanges
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe(() => this.loadOffres());
  }

  loadOffres(): void {
    this.loading = true;
    this.offreService.getOffresPubliees({
      search:       this.searchCtrl.value || undefined,
      departement:  this.departementCtrl.value || undefined,
      typeContrat:  this.typeContratCtrl.value || undefined,
      localisation: this.localisationCtrl.value || undefined,
    }).subscribe({
      next: (data) => { this.offres = data; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  applyFilters(): void { this.loadOffres(); }

  resetFilters(): void {
    this.searchCtrl.setValue('');
    this.departementCtrl.setValue('');
    this.typeContratCtrl.setValue('');
    this.localisationCtrl.setValue('');
    this.loadOffres();
  }

  voirDetail(offre: Offre): void {
    this.router.navigate(['/recrutement/offres', offre.id]);
  }

  postuler(offre: Offre): void {
    this.router.navigate(['/recrutement/postuler', offre.id]);
  }

  creerOffre(): void {
    this.router.navigate(['/recrutement/admin/offres/creer']);
  }

  allerAuDashboard(): void {
    this.router.navigate(['/recrutement/admin/dashboard']);
  }

  voirMesCandidatures(): void {
    this.router.navigate(['/recrutement/mes-candidatures']);
  }

  voirPipeline(offre: Offre): void {
    this.router.navigate(['/recrutement/admin/pipeline', offre.id]);
  }

  publier(offre: Offre, event: Event): void {
    event.stopPropagation();
    this.offreService.publierOffre(offre.id).subscribe(() => this.loadOffres());
  }

  badgeContrat(type: TypeContrat): string {
    const map: Record<TypeContrat, string> = {
      CDI:        'bg-green-100 text-green-800',
      CDD:        'bg-blue-100 text-blue-800',
      STAGE:      'bg-yellow-100 text-yellow-800',
      ALTERNANCE: 'bg-purple-100 text-purple-800',
      FREELANCE:  'bg-orange-100 text-orange-800',
    };
    return map[type] || 'bg-gray-100 text-gray-800';
  }
}
