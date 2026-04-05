export enum MobilityStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ON_HOLD = 'ON_HOLD'
}

export enum PlanStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export interface MobilityRequest {
  id?: string;
  employeeId: string;
  employeeName?: string;
  currentCareerTitle?: string;
  currentDepartement?: string;
  targetCareerId: string;
  targetCareerTitle?: string;
  targetDepartement?: string;
  motivationLetter?: string;
  motivationFileName?: string;
  motivationFileBase64?: string;
  status?: MobilityStatus;
  reviewedBy?: string;
  reviewComment?: string;
  reviewedAt?: string;
  requestedAt?: string;
  updatedAt?: string;
}

export interface CareerPlan {
  id?: string;
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
  status?: PlanStatus;
  createdBy?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}
