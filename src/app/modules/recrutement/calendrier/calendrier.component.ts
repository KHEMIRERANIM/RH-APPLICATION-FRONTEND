import { Component, OnInit } from '@angular/core';
import { EntretienService } from '../services/entretien.service';
import { AuthService } from 'app/core/auth/auth.service';
import { ExportService } from '../services/export.service';
import { Entretien } from '../models/recrutement.models';

interface JourCalendrier {
  date: Date;
  estMoisCourant: boolean;
  estAujourdhui: boolean;
  entretiens: Entretien[];
}

@Component({
  selector: 'app-calendrier',
  templateUrl: './calendrier.component.html',
})
export class CalendrierComponent implements OnInit {

  loading = true;
  entretiens: Entretien[] = [];
  selectedEntretien: Entretien | null = null;
  selectedJour: JourCalendrier | null = null;

  moisCourant: Date = new Date();
  semaines: JourCalendrier[][] = [];

  joursNoms = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  moisNoms = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  vueActive: 'mois' | 'semaine' | 'liste' = 'mois';

  constructor(
    private entretienService: EntretienService,
    private authService: AuthService,
    private exportService: ExportService,
  ) {}

  ngOnInit(): void {
    const user = this.authService.currentUser;
    const userId = user?.id || user?.['_id'];
    const role = (user?.role || '').toUpperCase();
    const source$ = role === 'CANDIDAT'
      ? this.entretienService.getEntretiensParCandidat(userId, true)
      : this.entretienService.getEntretiensParRecruteur(userId);

    source$.subscribe({
      next: (data) => {
        this.entretiens = data;
        this.genererCalendrier();
        this.loading = false;
      },
      error: () => this.loading = false,
    });
  }

  genererCalendrier(): void {
    const annee = this.moisCourant.getFullYear();
    const mois = this.moisCourant.getMonth();
    const aujourdhui = new Date();

    const premierJour = new Date(annee, mois, 1);
    const dernierJour = new Date(annee, mois + 1, 0);

    // Début du calendrier (lundi de la semaine du 1er)
    let debut = new Date(premierJour);
    const jourSemaine = debut.getDay();
    const offset = jourSemaine === 0 ? 6 : jourSemaine - 1;
    debut.setDate(debut.getDate() - offset);

    this.semaines = [];
    let semaine: JourCalendrier[] = [];
    let current = new Date(debut);

    while (current <= dernierJour || semaine.length > 0) {
      const dateStr = current.toDateString();
      const entretiensJour = this.entretiens.filter(e => {
        const d = new Date(e.dateHeure);
        return d.toDateString() === dateStr;
      });

      semaine.push({
        date: new Date(current),
        estMoisCourant: current.getMonth() === mois,
        estAujourdhui: current.toDateString() === aujourdhui.toDateString(),
        entretiens: entretiensJour,
      });

      if (semaine.length === 7) {
        this.semaines.push(semaine);
        semaine = [];
        if (current > dernierJour) break;
      }

      current.setDate(current.getDate() + 1);
    }
  }

  moisPrecedent(): void {
    this.moisCourant = new Date(
      this.moisCourant.getFullYear(),
      this.moisCourant.getMonth() - 1, 1
    );
    this.genererCalendrier();
    this.selectedJour = null;
  }

  moisSuivant(): void {
    this.moisCourant = new Date(
      this.moisCourant.getFullYear(),
      this.moisCourant.getMonth() + 1, 1
    );
    this.genererCalendrier();
    this.selectedJour = null;
  }

  aujourdhui(): void {
    this.moisCourant = new Date();
    this.genererCalendrier();
  }

  selectionnerJour(jour: JourCalendrier): void {
    this.selectedJour = jour;
    this.selectedEntretien = null;
  }

  selectionnerEntretien(e: Entretien): void {
    this.selectedEntretien = e;
  }

  fermer(): void {
    this.selectedEntretien = null;
    this.selectedJour = null;
  }

  get entretiensAVenir(): Entretien[] {
    const now = new Date();
    return this.entretiens
      .filter(e => new Date(e.dateHeure) >= now && e.statut === 'PLANIFIE')
      .sort((a, b) => new Date(a.dateHeure).getTime() - new Date(b.dateHeure).getTime())
      .slice(0, 5);
  }

  get titreCalendrier(): string {
    return `${this.moisNoms[this.moisCourant.getMonth()]} ${this.moisCourant.getFullYear()}`;
  }

  getCouleurStatut(statut: string): string {
    const map: Record<string, string> = {
      PLANIFIE: 'bg-indigo-500',
      REALISE:  'bg-green-500',
      ANNULE:   'bg-red-500',
      REPORTE:  'bg-yellow-500',
    };
    return map[statut] || 'bg-gray-400';
  }

  getBadgeStatut(statut: string): string {
    const map: Record<string, string> = {
      PLANIFIE: 'bg-indigo-100 text-indigo-800',
      REALISE:  'bg-green-100 text-green-800',
      ANNULE:   'bg-red-100 text-red-800',
      REPORTE:  'bg-yellow-100 text-yellow-800',
    };
    return map[statut] || 'bg-gray-100 text-gray-800';
  }

  getIconType(type: string): string {
    return type === 'VISIO' ? '🎥' : type === 'TELEPHONIQUE' ? '📞' : '🏢';
  }

  rejoindreMeet(lien: string): void {
    window.open(lien, '_blank');
  }

  exporterGoogleCalendar(e: Entretien): void {
    const debut = new Date(e.dateHeure);
    const fin = new Date(debut.getTime() + (e.dureeMinutes || 60) * 60000);
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    const params = new URLSearchParams({
      action:   'TEMPLATE',
      text:     `Entretien RH — ${e.type}`,
      dates:    `${fmt(debut)}/${fmt(fin)}`,
      details:  `Type: ${e.type}\nStatut: ${e.statut}${e.lienVisio ? '\nLien: ' + e.lienVisio : ''}`,
      location: e.lieu || e.lienVisio || '',
    });

    window.open(`https://calendar.google.com/calendar/render?${params}`, '_blank');
  }

  exporterExcel(): void {
    this.exportService.exporterEntretiensExcel(this.entretiens);
  }

  get totalPlanifies(): number {
    return this.entretiens.filter(e => e.statut === 'PLANIFIE').length;
  }

  get totalRealises(): number {
    return this.entretiens.filter(e => e.statut === 'REALISE').length;
  }

  get totalAnnules(): number {
    return this.entretiens.filter(e => e.statut === 'ANNULE').length;
  }
}
