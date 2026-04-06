export interface Category {
    id?: string;
    title?: string;
    slug?: string;
}


// ========== CONGÉ ==========
export interface DemandeConge {
    id: string;
    employeId: string;
    employeNom?: string;
    employePrenom?: string;
    managerId: string;
    dateDebut: Date;
    dateFin: Date;
    nombreJours: number;
    motif: string;
    type: TypeConge;
    statut: StatutConge;
    commentaireManager?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface DemandeCongeRequest {
    employeId: string;
    managerId: string;
    dateDebut: Date;
    dateFin: Date;
    motif: string;
    type: TypeConge;
}

export interface ValidationCongeRequest {
    statut: StatutConge;
    commentaireManager: string;
}

export interface SoldeConge {
    employeId: string;
    annee: number;
    joursTotal: number;
    joursUtilises: number;
    joursEnAttente: number;
    joursRestants: number;
}

export enum TypeConge {
    CONGE_ANNUEL = 'CONGE_ANNUEL',
    CONGE_MALADIE = 'CONGE_MALADIE',
    CONGE_MATERNITE = 'CONGE_MATERNITE',
    CONGE_PATERNITE = 'CONGE_PATERNITE',
    CONGE_SANS_SOLDE = 'CONGE_SANS_SOLDE',
    AUTRE = 'AUTRE'
}

export enum StatutConge {
    EN_ATTENTE = 'EN_ATTENTE',
    APPROUVE = 'APPROUVE',
    REFUSE = 'REFUSE',
    ANNULE = 'ANNULE'
}

// ========== SALAIRE ==========
export interface BulletinSalaire {
    id: string;
    employeId: string;
    employeNom?: string;
    employePrenom?: string;
    mois: number;
    annee: number;
    salaireBrut: number;
    primes: number;
    heuresSupplementaires: number;
    cotisationsCNSS: number;
    irpp: number;
    autresRetenues: number;
    salaireNet: number;
    dateGeneration: Date;
    pdfUrl?: string;
}

export interface BulletinSalaireRequest {
    employeId: string;
    mois: number;
    annee: number;
    salaireBrut: number;
    primes: number;
    heuresSupplementaires: number;
    autresRetenues: number;
}

// ========== UTILISATEUR ==========
export interface User {
    id: string;
    nom: string;
    prenom: string;
    email: string;
    role: Role;
    status: UserStatus;
    departement?: string;
    poste?: string;
    managerId?: string;
    photoUrl?: string;
    dateEmbauche?: Date;
    createdAt: Date;
}

export enum Role {
    ADMIN = 'ADMIN',
    MANAGER = 'MANAGER',
    EMPLOYEE = 'EMPLOYE'
}


// ========== ALERTES ==========
export interface AlerteTendance {
    employeId: string;
    jourSuspect?: string;
    nombreOccurrences?: number;
    type?: string;
    nombreDemandes30Jours?: number;
    message: string;
}

// ========== POUR L'INTERFACE ADMIN ==========
export interface AdminStats {
    totalDemandesEnAttente: number;
    totalDemandesApprouvees: number;
    totalEmployes: number;
    moyenneJoursConge: number;
}

export enum UserStatus {
    ACTIF = 'ACTIF',
    INACTIF = 'INACTIF'
}