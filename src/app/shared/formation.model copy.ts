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

export interface Inscription {
    id: string;
    formationId: string;
    formationTitre: string;
    employeId: string;
    employeNom?: string;
    statut: 'CONFIRME' | 'ANNULE' | 'TERMINE';
    dateInscription: Date;
    motifAnnulation?: string;
 presence_validee: boolean;
     datePresence?: Date;
    formateur?: string;
    lieu?: string;
    lienVisio?: string;
    lienGoogleMaps?: string;
    dateDebut?: Date;
    dateFin?: Date;
}