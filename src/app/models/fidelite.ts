export interface Fidelite {
  id?: string;
  userId: string;
  points: number;
  totalDepense: number;
  reductionDisponible: boolean;
  montantReduction: number;
  historique: string[];
}
