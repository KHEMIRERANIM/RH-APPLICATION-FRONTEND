import { ResultatExamen } from './examen.model';
import { DocumentRendu } from './document.model';

export interface InscriptionFormation {
    id: string;
    formationId: string;
    employeId: string;
    employeNom: string;
    statut: 'INSCRIT' | 'EN_COURS' | 'VALIDE' | 'ECHEC';
    dateInscription: Date;
    motifAnnulation?: string;
    presenceConfirmee: boolean;
    datePresence?: Date;
    formationTitre: string;
    formateur: string;
    lieu: string;
    lienVisio?: string;
    lienGoogleMaps?: string;
    dateDebut: Date;
    dateFin: Date;
    dureeHeures: number;
    dateValidation?: Date;
    note?: number;
    commentaire?: string;
    resultatsExamens?: ResultatExamen[];
    documentsRendus?: DocumentRendu[];
    formateurValidateur?: string;
    validationCommentaire?: string;
}
