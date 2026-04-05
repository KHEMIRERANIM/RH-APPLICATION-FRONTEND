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
}
export interface Menu {
  id?: string;
  titre: string;
  date: string;
  statut: string;
  plats: Plat[];
}
