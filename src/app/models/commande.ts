export interface Commande {
  id?: string;
  userId: string;
  menuId: string;
  plats: string[];
  dateCommande: string;
  statut?: string;
  montantTotal?: number;
  codeRetrait?: string;
  datePrete?: string;
  reductionAppliquee?: boolean;
  montantReduction?: number;
}
