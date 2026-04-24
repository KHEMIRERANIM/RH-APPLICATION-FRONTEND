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



