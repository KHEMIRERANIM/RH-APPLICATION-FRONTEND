export enum CertificationType {
  TECHNIQUE  = 'TECHNIQUE',
  SOFT_SKILL = 'SOFT_SKILL'
}

export enum CertificationLevel {
  DEBUTANT      = 'DEBUTANT',
  INTERMEDIAIRE = 'INTERMEDIAIRE',
  EXPERT        = 'EXPERT'
}

export enum CertificationStatus {
  NON_COMMENCE = 'NON_COMMENCE',
  EN_COURS     = 'EN_COURS',
  OBTENU       = 'OBTENU'
}

export enum EvaluationMethod {
  CERTIFICATION = 'CERTIFICATION',
  AUTO_EVAL     = 'AUTO_EVAL'
}

export interface EmployeeCertification {
  id?:                 string;
  templateId?:         string;
  nom:                 string;
  type:                CertificationType;
  niveauRequis:        CertificationLevel;
  obligatoire:         boolean;
  methodeEval:         EvaluationMethod;
  organismeUrl?:       string;
  statut:              CertificationStatus;
  niveauObtenu?:       CertificationLevel;
  dateObtention?:      string;
  datePrevisionnelle?: string;
  fichierNom?:         string;
  fichierUrl?:         string;
  commentaireEmploye?: string;
  commentaireAdmin?:   string;
  valideParAdmin?:     boolean;
}