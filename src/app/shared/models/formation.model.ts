// src/app/shared/models/formation.model.ts

export interface Formation {
    id?: string;
    titre: string;
    description: string;
    objectifs: string;
    preRequis: string;
    type: string;
    dureeHeures: number;
    nombrePlaces: number;
    placesDisponibles: number;
    formateurId?: string;
    niveau: string;
    formateur: string;
    formateurBio: string;
    lieu: string;
    lienVisio?: string;
    lienGoogleMaps?: string;
    dateDebut: Date;
    dateFin: Date;
    dateLimiteInscription: Date;
    imageUrl?: string;
    active: boolean;
    noteMoyenne?: number;
    nombreInscrits?: number;
    prerequisFormationId?: string;
    prerequisFormationTitre?: string;
}

export interface FormationStats {
    total: number;
    actives: number;
    inactives: number;
    parType: { [key: string]: number };
    placesTotales: number;
    placesDisponibles: number;
    placesOccupees: number;
    tauxRemplissage: number;
}

export interface FormationSearchParams {
    keyword?: string;
    type?: string;
    niveau?: string;
    active?: boolean;
    dateDebut?: Date;
    dateFin?: Date;
    formateur?: string;
}

export interface Inscription {
    id: string;
    formationId: string;
    formationTitre: string;
    employeId: string;
    employeNom?: string;
    employePrenom?: string;
    employeEmail?: string;
    statut: 'CONFIRME' | 'EN_ATTENTE' | 'ANNULE' | 'TERMINE' | 'INSCRIT' | 'PRESENT' | 'ABSENT' | 'VALIDE';
    dateInscription: Date;
    motifAnnulation?: string;
    presenceConfirmee: boolean;
    datePresence?: Date;
    formateur?: string;
    lieu?: string;
    lienVisio?: string;
    lienGoogleMaps?: string;
    dateDebut?: Date;
    dateFin?: Date;
    dureeHeures?: number;
    type?: string;
    niveau?: string;
    commentaire?: string;
}

export interface DocumentFormation {
    id: string;
    formationId: string;
    formateurId: string;
    titre: string;
    description: string;
    type: 'COURS' | 'EXERCICE' | 'EXAMEN' | 'RESSOURCE';
    url: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    uploadedAt: Date;
    valide: boolean;
}

export interface DocumentRendu {
    id: string;
    titre: string;
    url: string;
    fileName: string;
    fileSize: number;
    uploadedAt: Date;
    valide: boolean;
    commentaire?: string;
}

export interface Examen {
    id: string;
    formationId: string;
    titre: string;
    description: string;
    dureeMinutes: number;
    dateLimite: Date;
    questions: Question[];
    createdAt?: Date;
    updatedAt?: Date;
}

export interface Question {
    id: string;
    texte: string;
    type: 'QCM' | 'TEXTE' | 'CODE';
    points: number;
    options?: OptionQuestion[];
    correctAnswer?: string;
    codeTemplate?: string;
}

export interface OptionQuestion {
    id: string;
    texte: string;
    estCorrect: boolean;
}


export interface ResultatExamen {
    id: string;
    examenId: string;
    formationId?: string;
    employeId: string;
    employeNom: string;
    employePrenom: string;
    employeEmail?: string;
    note: number;
    reponses: Reponse[];
    submittedAt: Date;
    valide: boolean;
}

export interface ParticipantInscription {
    id: string;
    formationId: string;
    employeId: string;
    employeNom: string;
    employePrenom: string;
    employeEmail: string;
    statut: 'INSCRIT' | 'PRESENT' | 'ABSENT' | 'VALIDE';
    presenceValidee: boolean;
    dateInscription: Date;
    datePresence?: Date;
    commentaire?: string;
    createdAt: Date;
    updatedAt: Date;
}

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

export interface FormationFormateur {
    id: string;
    formationId: string;
    formateurId: string;
    role: 'PRINCIPAL' | 'ASSISTANT';
    dateDebut?: Date;
    dateFin?: Date;
}

export interface Examen {
    id: string;
    formationId: string;
    titre: string;
    description: string;
    dureeMinutes: number;
    dateLimite: Date;
    questions: Question[];
    createdAt?: Date;
    updatedAt?: Date;
}
/// src/app/shared/models/formation.model.ts
export interface ResultatExamen {
    id: string;
    examenId: string;
    employeId: string;
    employeNom: string;
    employePrenom: string;
    employeEmail?: string;
    note: number;
    reponses: Reponse[];
    submittedAt: Date;
    valide: boolean;
    feedbackIA?: string;           // ✅ Feedback global
    correctionDetaillee?: string;   // ✅ JSON des corrections détaillées
    tempsPriseMs?: number;          // ✅ Temps passé
    iaUtilisee?: boolean;           // ✅ IA utilisée ?
}

export interface Reponse {
    questionId: string;
    reponse: string;
    pointsObtenus: number;
    feedback?: string;      // ✅ Feedback par question
    commentaireIa?: string; // ✅ Commentaire détaillé IA
}

export interface CorrectionDetaillee {
    [questionId: string]: {
        pointsObtenus: number;
        feedback: string;
        commentaireIa: string;
    };
}

export interface Question {
    id: string;
    texte: string;
    type: 'QCM' | 'TEXTE' | 'CODE';
    points: number;
    options?: OptionQuestion[];
    correctAnswer?: string;
    codeTemplate?: string;
}

export interface OptionQuestion {
    id: string;
    texte: string;
    estCorrect: boolean;
}



