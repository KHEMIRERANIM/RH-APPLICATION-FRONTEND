export enum CareerDomain {
  IT = 'IT',
  FINANCE = 'FINANCE',
  RH = 'RH',
  MARKETING = 'MARKETING',
  LEGAL = 'LEGAL',
  OPERATIONS = 'OPERATIONS',
  SALES = 'SALES',
  ENGINEERING = 'ENGINEERING',
  HEALTH = 'HEALTH',
  EDUCATION = 'EDUCATION'
}

export enum CareerLevel {
  INTERN = 'INTERN',
  JUNIOR = 'JUNIOR',
  MID = 'MID',
  SENIOR = 'SENIOR',
  LEAD = 'LEAD',
  MANAGER = 'MANAGER',
  DIRECTOR = 'DIRECTOR',
  EXECUTIVE = 'EXECUTIVE'
}

export interface Career {
  id?: string;

  title: string;
  description?: string;

  level: CareerLevel;
  domain: CareerDomain;

  requiredSkills?: string[];

  departement?: string;
  poste?: string;

  salaryMin?: number;
  salaryMax?: number;

  isRemoteFriendly?: boolean;
  isAccessibleForDisabled?: boolean;

  userId?: string;

  createdAt?: string;
  updatedAt?: string;
}