export interface FormationFormateur {
    id: string;
    formationId: string;
    formateurId: string;
    role: 'PRINCIPAL' | 'ASSISTANT';
    dateDebut?: Date;
    dateFin?: Date;
}
// models/formateur.model.ts
export interface Formateur {
    id: string;
    employeId?: string;
    userId?: string;
    nom: string;
    prenom: string;
    email: string;
    telephone?: string;
    specialite: string;
    bio?: string;
    photo?: string;
    status: 'ACTIF' | 'INACTIF';
    formationsAssignees?: string[];
    createdAt?: Date;
    updatedAt?: Date;
}

export interface Employe {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    telephone?: string;
    department?: string;
    position?: string;
    photo?: string;
    role?: string;
    status?: string;
}
