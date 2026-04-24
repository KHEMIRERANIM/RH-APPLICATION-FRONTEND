export interface Plat {
  platId?: string;
  nom: string;
  description: string;
  prix: number;
  tags: string[];
  image?: string;
  quantite: number;
  disponible: boolean;
  ingredients?: string;
  calories?: number;
  proteines?: number;
  glucides?: number;
  lipides?: number;
  sucres?: number;
  fibres?: number;
  pctProteines?: number;
  pctGlucides?: number;
  pctLipides?: number;
  pmrAdapte?: boolean;
  pmrRaison?: string;
  niveauCalories?: string;
}
export interface Menu {
  id?: string;
  titre: string;
  date: string;
  statut: string;
  plats: Plat[];
}
