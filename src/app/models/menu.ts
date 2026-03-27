export interface Plat {
  nom: string;
  prix: number;
  tags: string[];
  image: string;
}

export interface Menu {
  id: string;
  titre: string;
  date: string;
  statut: string;
  plats: Plat[];
}
