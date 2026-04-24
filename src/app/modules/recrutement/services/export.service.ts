import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { Candidature, Offre, Entretien, STATUT_LABELS } from '../models/recrutement.models';

@Injectable({ providedIn: 'root' })
export class ExportService {

  exporterCandidaturesExcel(
      candidatures: Candidature[],
      offresMap: Record<string, Offre> = {},
      nomFichier: string = 'candidatures'): void {

    const data = candidatures.map(c => ({
      'ID':             c.id,
      'Offre':          offresMap[c.offreId]?.titre || c.offreId,
      'Département':    offresMap[c.offreId]?.departement || '',
      'Statut':         STATUT_LABELS[c.statut],
      'Étape':          c.etapeActuelle,
      'Score IA (%)':   c.scoreMatching || 0,
      'Date postulation': c.datePostulation
        ? new Date(c.datePostulation).toLocaleDateString('fr-FR') : '',
      'Dernière MAJ': c.dateDerniereMAJ
        ? new Date(c.dateDerniereMAJ).toLocaleDateString('fr-FR') : '',
      'Notes recruteur': c.notesRecruteur || '',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [
      { wch: 28 }, { wch: 30 }, { wch: 15 }, { wch: 20 },
      { wch: 25 }, { wch: 12 }, { wch: 16 }, { wch: 16 }, { wch: 40 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Candidatures');

    const date = new Date().toLocaleDateString('fr-FR').replace(/\//g, '-');
    XLSX.writeFile(wb, `${nomFichier}_${date}.xlsx`);
  }

  exporterEntretiensExcel(entretiens: Entretien[]): void {
    const data = entretiens.map(e => ({
      'ID':          e.id,
      'Type':        e.type,
      'Date':        e.dateHeure
        ? new Date(e.dateHeure).toLocaleString('fr-FR') : '',
      'Durée (min)': e.dureeMinutes,
      'Statut':      e.statut,
      'Lieu':        e.lieu || '',
      'Lien Meet':   e.lienVisio || '',
      'Note (/10)':  e.noteGlobale || '',
      'Recommandé':  e.recommandeEmbauche ? 'Oui' : 'Non',
      'Feedback':    e.feedbackGlobal || '',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [
      { wch: 28 }, { wch: 14 }, { wch: 20 }, { wch: 12 },
      { wch: 14 }, { wch: 20 }, { wch: 45 }, { wch: 10 },
      { wch: 12 }, { wch: 40 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Entretiens');

    const date = new Date().toLocaleDateString('fr-FR').replace(/\//g, '-');
    XLSX.writeFile(wb, `entretiens_${date}.xlsx`);
  }
}
