export type StatutOffre = 'BROUILLON' | 'PUBLIEE' | 'CLOTUREE' | 'ARCHIVEE';
export type TypeContrat = 'CDI' | 'CDD' | 'STAGE' | 'ALTERNANCE' | 'FREELANCE';
export type StatutCandidature = 'NOUVEAU' | 'EN_COURS_ANALYSE' | 'ENTRETIEN_RH' | 'ENTRETIEN_TECHNIQUE' | 'TEST_TECHNIQUE' | 'OFFRE_ENVOYEE' | 'ACCEPTE' | 'REFUSE';
export type TypeEntretien = 'TELEPHONIQUE' | 'VISIO' | 'PRESENTIEL';
export type StatutEntretien = 'PLANIFIE' | 'REALISE' | 'ANNULE' | 'REPORTE';

export interface Offre {
  id: string; titre: string; description: string; departement: string;
  localisation: string; typeContrat: TypeContrat; niveauExperience: string;
  niveauEtudes: string; salaireMin: number; salaireMax: number;
  competencesRequises: string[]; avantages: string[]; statut: StatutOffre;
  biasDetected: boolean; createurId: string; nombrePostes: number;
  nombreCandidatures: number; dateCreation: string; datePublication: string; dateExpiration: string;
}
export interface CreateOffreRequest {
  titre: string; description: string; departement: string; localisation: string;
  typeContrat: TypeContrat; niveauExperience: string; niveauEtudes: string;
  salaireMin: number; salaireMax: number; competencesRequises: string[];
  avantages: string[]; nombrePostes: number; dateExpiration: string;
}
export interface Candidature {
  id: string; candidatId: string; offreId: string; cvFileId: string;
  lettreMotivationFileId: string; statut: StatutCandidature; scoreMatching: number;
  etapeActuelle: string; notesRecruteur: string; historiqueStatuts: string[];
  competencesExtraites: string[]; competencesManquantes: string[]; comparaisonExplication: string; anneesExperienceDetecte: number;
  testLanguePasse: boolean; scoreLangue: number; formationRequise: boolean;
  scoreLeadership: number; scoreEmpathie: number; scoreAdaptabilite: number;
  scoreCommunication: number; scoreInnovation: number;
  datePostulation: string; dateDerniereMAJ: string;
}
export interface ChangerStatutRequest { nouveauStatut: StatutCandidature; commentaire: string; }
export interface Entretien {
  id: string; candidatureId: string; recruteurId: string; type: TypeEntretien;
  dateHeure: string; dureeMinutes: number; lieu: string; lienVisio: string;
  statut: StatutEntretien; feedbackGlobal: string; noteGlobale: number;
  pointsForts: string[]; pointsFaibles: string[]; recommandeEmbauche: boolean; createdAt: string;
  confirmeParCandidat?: boolean; dateConfirmationCandidat?: string;
}
export interface CreateEntretienRequest {
  candidatureId: string; recruteurId: string; type: TypeEntretien;
  dateHeure: string; dureeMinutes: number; lieu?: string; lienVisio?: string;
}
export interface FeedbackEntretienRequest {
  feedbackGlobal: string; noteGlobale: number; pointsForts: string[];
  pointsFaibles: string[]; recommandeEmbauche: boolean;
}
export interface KanbanData { [statut: string]: Candidature[]; }
export const STATUT_LABELS: Record<StatutCandidature, string> = {
  NOUVEAU: 'Nouveau', EN_COURS_ANALYSE: 'En analyse', ENTRETIEN_RH: 'Entretien RH',
  ENTRETIEN_TECHNIQUE: 'Entretien Technique', TEST_TECHNIQUE: 'Test Technique',
  OFFRE_ENVOYEE: 'Offre envoyee', ACCEPTE: 'Accepte', REFUSE: 'Refuse',
};
export const STATUT_COLORS: Record<StatutCandidature, string> = {
  NOUVEAU: 'bg-blue-100 text-blue-800', EN_COURS_ANALYSE: 'bg-yellow-100 text-yellow-800',
  ENTRETIEN_RH: 'bg-purple-100 text-purple-800', ENTRETIEN_TECHNIQUE: 'bg-indigo-100 text-indigo-800',
  TEST_TECHNIQUE: 'bg-orange-100 text-orange-800', OFFRE_ENVOYEE: 'bg-teal-100 text-teal-800',
  ACCEPTE: 'bg-green-100 text-green-800', REFUSE: 'bg-red-100 text-red-800',
};
export const KANBAN_COLUMNS: StatutCandidature[] = [
  'NOUVEAU','EN_COURS_ANALYSE','ENTRETIEN_RH','ENTRETIEN_TECHNIQUE',
  'TEST_TECHNIQUE','OFFRE_ENVOYEE','ACCEPTE','REFUSE'
];
