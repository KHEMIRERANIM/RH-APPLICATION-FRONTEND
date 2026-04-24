export interface AlerteFormation {
  risque: number;
  recommandation: string;
  action: string;
}

export interface KPIsDTO {
  tauxRemplissageMoyen: number;
  tauxReussiteGlobal: number;
  totalInscrits: number;
  totalCertifies: number;
  totalAbandons: number;
  npsMoyen: number;
  chiffreAffairesTotal: number;
  tauxRemplissageParFormation: { [key: string]: number };
  tauxReussiteParFormation: { [key: string]: number };
  tauxRisqueEchecGlobal: number;
  risqueEchecParFormation: { [key: string]: number };
  alertesFormations: { [key: string]: AlerteFormation };
}