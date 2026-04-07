import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin } from 'rxjs';
import { take } from 'rxjs/operators';
import { OffreService } from '../services/offre.service';
import { EntretienService } from '../services/entretien.service';
import { NotificationsService } from 'app/layout/common/notifications/notifications.service';
import { AuthService } from 'app/core/auth/auth.service';
import { Notification } from 'app/layout/common/notifications/notifications.types';
import { Offre, Entretien, STATUT_LABELS } from '../models/recrutement.models';

@Component({
  selector: 'app-recrutement-dashboard',
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit, OnDestroy {

  loading = true;
  offres: Offre[] = [];
  tousEntretiens: Entretien[] = [];
  STATUT_LABELS = STATUT_LABELS;
  private _alertInterval: any;

  // KPIs
  get totalOffres(): number { return this.offres.length; }
  get offresPubliees(): number { return this.offres.filter(o => o.statut === 'PUBLIEE').length; }
  get offresBrouillon(): number { return this.offres.filter(o => o.statut === 'BROUILLON').length; }
  get totalCandidatures(): number { return this.offres.reduce((a, o) => a + o.nombreCandidatures, 0); }

  // Entretiens filtrés
  get entretiensAVenir(): Entretien[] {
    const now = new Date();
    return this.tousEntretiens.filter(e =>
      e.statut === 'PLANIFIE' && new Date(e.dateHeure) >= now
    );
  }

  get entretiensPasses(): Entretien[] {
    const now = new Date();
    return this.tousEntretiens.filter(e =>
      e.statut === 'PLANIFIE' && new Date(e.dateHeure) < now
    );
  }

  get entretiensRealises(): Entretien[] {
    return this.tousEntretiens.filter(e => e.statut === 'REALISE');
  }

  private _entretienAlertedIds: Set<string> = new Set();

  constructor(
    private offreService: OffreService,
    private entretienService: EntretienService,
    private notificationsService: NotificationsService,
    private _snackBar: MatSnackBar,
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    const user = this.authService.currentUser;
    const userId = user?.id || user?.['_id'];

    forkJoin({
      offres: this.offreService.getOffresByAdmin(userId),
      entretiens: this.entretienService.getEntretiensParRecruteur(userId),
    }).subscribe({
      next: ({ offres, entretiens }) => {
        this.offres = offres;
        this.tousEntretiens = entretiens;
        this.loading = false;
        this.checkEntretienAlerts();
        this._alertInterval = setInterval(() => this.checkEntretienAlerts(), 60000);
      },
      error: () => this.loading = false,
    });
  }

  ngOnDestroy(): void {
    if (this._alertInterval) {
      clearInterval(this._alertInterval);
    }
  }

  // Navigation
  voirPipeline(offre: Offre): void {
    this.router.navigate(['/recrutement/admin/pipeline', offre.id]);
  }

  modifierOffre(offre: Offre): void {
    this.router.navigate(['/recrutement/admin/offres/modifier', offre.id]);
  }

  voirDetail(offre: Offre): void {
    this.router.navigate(['/recrutement/offres', offre.id]);
  }

  creerOffre(): void {
    this.router.navigate(['/recrutement/admin/offres/creer']);
  }

  // Actions offres
  publierOffre(offre: Offre, event: Event): void {
    event.stopPropagation();
    this.offreService.publierOffre(offre.id).subscribe(() => {
      offre.statut = 'PUBLIEE';
    });
  }

  supprimerOffre(offre: Offre, event: Event): void {
    event.stopPropagation();
    if (!confirm(`Supprimer l'offre "${offre.titre}" ?`)) return;
    this.offreService.deleteOffre(offre.id).subscribe(() => {
      this.offres = this.offres.filter(o => o.id !== offre.id);
    });
  }

  // Actions entretiens
  marquerRealise(entretien: Entretien, event: Event): void {
    event.stopPropagation();
    this.entretienService.marquerRealise(entretien.id).subscribe(() => {
      entretien.statut = 'REALISE';
    });
  }

  annulerEntretien(entretien: Entretien, event: Event): void {
    event.stopPropagation();
    if (!confirm('Voulez-vous vraiment annuler cet entretien ?')) return;
    this.entretienService.annulerEntretien(entretien.id).subscribe(() => {
      this.tousEntretiens = this.tousEntretiens.filter(e => e.id !== entretien.id);
    });
  }

  supprimerEntretienPasse(entretien: Entretien, event: Event): void {
    event.stopPropagation();
    if (!confirm('Supprimer cet entretien passé ?')) return;
    this.entretienService.annulerEntretien(entretien.id).subscribe(() => {
      this.tousEntretiens = this.tousEntretiens.filter(e => e.id !== entretien.id);
    });
  }

  modifierEntretien(entretien: Entretien): void {
    this.router.navigate(['/recrutement/admin/entretiens/modifier', entretien.id]);
  }

  private checkEntretienAlerts(): void {
    const now = new Date().getTime();
    const prochainEntretien = this.tousEntretiens.find(entretien => {
      if (entretien.statut !== 'PLANIFIE') {
        return false;
      }

      const diff = new Date(entretien.dateHeure).getTime() - now;
      return diff > 0 && diff <= 3600000 && !this._entretienAlertedIds.has(entretien.id);
    });

    if (!prochainEntretien) {
      return;
    }

    this._entretienAlertedIds.add(prochainEntretien.id);

    const notification: Notification = {
      id: '',
      icon: 'notification_important',
      title: 'Entretien dans 1 heure',
      description: `Entretien ${prochainEntretien.type} prévu à ${new Date(prochainEntretien.dateHeure).toLocaleTimeString()}`,
      time: 'Maintenant',
      link: `/recrutement/admin/entretiens/${prochainEntretien.id}`,
      useRouter: true,
      read: false,
    };

    this.notificationsService.create(notification).pipe(take(1)).subscribe();

    this._snackBar.open(
      `Entretien ${prochainEntretien.type} dans 1 heure`,
      'Voir',
      { duration: 8000 }
    ).onAction().subscribe(() => {
      this.router.navigate([notification.link]);
    });
  }

  supprimerTousEntretiensRealises(): void {
    if (!confirm('Voulez-vous vraiment supprimer tous les entretiens réalisés ?')) return;
    const demandes = this.entretiensRealises.map(entretien =>
      this.entretienService.annulerEntretien(entretien.id)
    );

    if (demandes.length === 0) {
      return;
    }

    forkJoin(demandes).subscribe(() => {
      this.tousEntretiens = this.tousEntretiens.filter(e => e.statut !== 'REALISE');
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

  telechargerTousEntretiensAVenir(): void {
    const contenu = this.entretiensAVenir.map((entretien, index) => [
      `Entretien ${index + 1}`,
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
    ].join('\r\n')).join('\r\n\r\n');

    const blob = new Blob([contenu], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `entretiens-a-venir.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  isEntretienPasse(entretien: Entretien): boolean {
    return new Date(entretien.dateHeure) < new Date();
  }
}