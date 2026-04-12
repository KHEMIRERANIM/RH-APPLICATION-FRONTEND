import { CertificationType, EmployeeCertification } from './certification.model';

export enum EvolutionPlanStatus {
  DRAFT     = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  REVIEWED  = 'REVIEWED'
}

export interface Competence {
  nom:     string;
  niveau:  'DEBUTANT' | 'INTERMEDIAIRE' | 'EXPERT';
  annees?: number;
}

export interface GapItem {
  competenceNom:    string;
  niveauRequis:     string;
  niveauActuel?:    string;
  couverte:         boolean;
  couvertParCertif: boolean;
}

export interface EvolutionPlan {
  id?:                     string;
  employeeId:              string;
  employeeName?:           string;
  currentCareerId?:        string;
  currentCareerTitle?:     string;
  targetCareerId:          string;
  targetCareerTitle?:      string;
  status:                  EvolutionPlanStatus;
  createdAt?:              string;
  updatedAt?:              string;
  competencesActuelles:    Competence[];
  certifications:          EmployeeCertification[];
  scoreGlobal?:            number;
  scoreTechnique?:         number;
  scoreSoftSkill?:         number;
  gap?:                    GapItem[];
  formationsRecommandees?: string[];
  commentaireAdmin?:       string;
  poidsScoreTechnique?:    number;
  poidsScoreSoftSkill?:    number;
}

export function computeScores(plan: EvolutionPlan): EvolutionPlan {
  const certifs = plan.certifications ?? [];
  
  // âœ… Si pas de certifications du tout â†’ 0%
  if (!certifs.length) {
    plan.scoreTechnique = 0;
    plan.scoreSoftSkill = 0;
    plan.scoreGlobal = 0;
    return plan;
  }

  const tech = certifs.filter(c => c.type === CertificationType.TECHNIQUE);
  const soft = certifs.filter(c => c.type === CertificationType.SOFT_SKILL);

  const score = (list: EmployeeCertification[]) => {
    const req = list.filter(c => c.obligatoire);
    if (!req.length) return 0; // âœ… 0% si pas de certifs requises
    return Math.round(
      list.filter(c => c.obligatoire && c.statut === 'OBTENU').length / req.length * 100
    );
  };

  const wT = plan.poidsScoreTechnique ?? 70;
  const wS = plan.poidsScoreSoftSkill ?? 30;
  plan.scoreTechnique = score(tech);
  plan.scoreSoftSkill = score(soft);
  plan.scoreGlobal = Math.round(
    (plan.scoreTechnique * wT + plan.scoreSoftSkill * wS) / 100
  );
  return plan;
}
export function parseCompetences(plan: EvolutionPlan): Competence[] {
  const raw = (plan as any).competencesJson ?? plan.competencesActuelles ?? [];
  return raw.map((c: any) => {
    if (typeof c === 'string') {
      try { return JSON.parse(c); } catch { return { nom: c, niveau: 'INTERMEDIAIRE' }; }
    }
    return c as Competence;
  });
}
