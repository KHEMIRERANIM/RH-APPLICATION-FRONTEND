import { EmployeeCertification } from './certification.model';

export enum EvolutionPlanStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  REVIEWED = 'REVIEWED'
}

export interface Competence {
  nom: string;
  niveau: 'DEBUTANT' | 'INTERMEDIAIRE' | 'EXPERT';
  annees?: number;
}

export interface GapItem {
  competenceNom: string;
  niveauRequis: string;
  niveauActuel?: string;
  couverte: boolean;
  couvertParCertif: boolean;
}

export interface EvolutionPlan {
  id?: string;
  employeeId: string;
  employeeName?: string;
  currentCareerId?: string;
  currentCareerTitle?: string;
  targetCareerId: string;
  targetCareerTitle?: string;
  status: EvolutionPlanStatus;
  createdAt?: string;
  updatedAt?: string;

  competencesActuelles: Competence[];
  certifications: EmployeeCertification[];

  // Scores calculés côté backend
  scoreGlobal?: number;
  scoreTechnique?: number;
  scoreSoftSkill?: number;

  gap?: GapItem[];
  formationsRecommandees?: string[];
  commentaireAdmin?: string;
  poidsScoreTechnique?: number;
  poidsScoreSoftSkill?: number;
}

export function parseCompetences(plan: EvolutionPlan): Competence[] {
  const raw = (plan as any).competencesJson ?? plan.competencesActuelles ?? [];

  return raw.map((c: any) => {
    if (typeof c === 'string') {
      try {
        return JSON.parse(c) as Competence;
      } catch {
        return {
          nom: c,
          niveau: 'INTERMEDIAIRE'
        } as Competence;
      }
    }

    return c as Competence;
  });
}