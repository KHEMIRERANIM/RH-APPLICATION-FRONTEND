export enum PlanStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export interface CareerPlan {
  id: string;

  employeeId: string;
  employeeName?: string;

  currentCareerId: string;
  currentCareerTitle?: string;

  currentSkills: string[];

  targetCareerId: string;
  targetCareerTitle?: string;

  targetSkills?: string[];
  skillsAlreadyMet?: string[];
  skillsToAcquire?: string[];

  progressPercent?: number;

  status: PlanStatus;

  createdBy?: string;
  notes?: string;

  createdAt?: string;
  updatedAt?: string;
}