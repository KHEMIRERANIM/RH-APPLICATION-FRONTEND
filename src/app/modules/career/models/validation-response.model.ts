export interface ValidationResponse {
  userId: string;
  validated: boolean;
  pointsAdded: number;
  totalPoints: number;
  level: string;
  badges: string[];

  nom?: string;
  prenom?: string;
  email?: string;
}