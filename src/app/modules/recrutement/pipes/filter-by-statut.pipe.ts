import { Pipe, PipeTransform } from '@angular/core';
import { Entretien } from '../models/recrutement.models';

@Pipe({ name: 'filterByStatut' })
export class FilterByStatutPipe implements PipeTransform {
  transform(entretiens: Entretien[], statut: string): number {
    if (!entretiens) return 0;
    return entretiens.filter(e => e.statut === statut).length;
  }
}
