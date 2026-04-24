// models/fraud.models.ts
export interface FraudEvent {
  examenId: string;
  employeId: string;
  employeNom: string;
  employePrenom: string;
  employeEmail: string;
  eventType: 'TAB_SWITCH' | 'WINDOW_BLUR' | 'VISIBILITY_HIDDEN' | 'FOCUS_LOST';
  timestamp: number;
  description: string;
}

export interface FraudResponse {
  saved: boolean;
  totalViolations: number;
  blocked: boolean;
  message: string;
  remainingAttempts: number;
}

export interface FraudSummary {
  employeId: string;
  employeNom: string;
  employePrenom: string;
  violationCount: number;
  maxRiskScore: number;
  isBlocked: boolean;
  examenBloque: boolean;
}

export interface BlockedStatus {
  blocked: boolean;
  violationCount: number;
  maxViolations: number;
  remainingAttempts: number;
}