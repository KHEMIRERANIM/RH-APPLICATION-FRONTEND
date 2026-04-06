// ============================================================
// Module Mutuelle & Avantages Sociaux — Modèles TypeScript
// ============================================================

export type CategorieOffre = 'VOYAGE' | 'HOTEL' | 'FESTIVAL';
export type StatutReservation = 'CONFIRMEE' | 'ANNULEE';
export type StatutOffre = 'ACTIVE' | 'INACTIVE';
export type FormulePension = 'PD' | 'DP' | 'PC';

export interface DetailsHotel {
    prixAdulte: number;
    prixEnfant: number;
    ageLimiteEnfant: number;
    nombreNuits: number;
    formulesDisponibles: FormulePension[];
    surprixFormules: { [key in FormulePension]?: number };
    typeChambres?: string;
}


// ─────────────────────────────────────────
// Partenaire
// ─────────────────────────────────────────
export interface Partenaire {
    id?: string;
    nom: string;
    type: CategorieOffre;
    logoUrl?: string;
    emailContact?: string;
    dateConvention?: string; // ISO date string (LocalDate)
    actif: boolean;
    createdAt?: string;
}

export interface CreatePartenaireRequest {
    nom: string;
    type: CategorieOffre;
    logoUrl?: string;
    emailContact?: string;
    dateConvention?: string;
}

// ─────────────────────────────────────────
// Offre
// ─────────────────────────────────────────
export interface Offre {
    id?: string;
    idPartenaire: string;
    titre: string;
    description?: string;
    categorie: CategorieOffre;
    prixReel: number;
    prixConvention?: number; // Optionnel pour les hôtels

    nbPlacesTotal: number;
    nbPlacesDispo: number;
    imageUrl?: string;       // Base64 ou URL
    localisation?: string;
    dateDebut?: string;      // ISO date string
    dateFin?: string;        // ISO date string
    statut: StatutOffre;
    createdAt?: string;
    detailsHotel?: DetailsHotel;


    nomPartenaire?: string;
}

export interface CreateOffreRequest {
    idPartenaire: string;
    titre: string;
    description?: string;
    categorie: CategorieOffre;
    prixReel: number;
    prixConvention?: number;

    nbPlacesTotal: number;
    imageUrl?: string;
    localisation?: string;
    dateDebut?: string;
    dateFin?: string;
    detailsHotel?: DetailsHotel;
}


// ─────────────────────────────────────────
// Réservation
// ─────────────────────────────────────────
export interface AvantageReservation {
    id?: string;
    idUser: string;
    idOffre: string;
    nbPersonnes: number;
    prixUnitaire: number;
    prixTotal: number;
    statut: StatutReservation;
    dateReservation?: string;
    dateAnnulation?: string;
    nbAdultes?: number;
    nbEnfants?: number;
    formule?: string;
    checkIn?: string;
    checkOut?: string;
    titreOffre?: string;
    nomUser?: string;
}


// ─────────────────────────────────────────
// Filtres & UI
// ─────────────────────────────────────────

export interface Wishlist {
    id?: string;
    idUser: string;
    idOffre: string;
    dateAjout?: string;
    dernierPrixConnu?: number;
}

export interface OffreFiltres {
    categorie: CategorieOffre | 'TOUS';
}

export const CATEGORIE_LABELS: Record<CategorieOffre | 'TOUS', string> = {
    TOUS: 'Toutes les offres',
    VOYAGE: 'Voyages',
    HOTEL: 'Hôtels',
    FESTIVAL: 'Festivals'
};

export const CATEGORIE_ICONS: Record<CategorieOffre, string> = {
    VOYAGE: 'heroicons_outline:paper-airplane',
    HOTEL: 'heroicons_outline:office-building',
    FESTIVAL: 'heroicons_outline:music-note'
};

export const CATEGORIE_COLORS: Record<CategorieOffre, string> = {
    VOYAGE: '#6366f1',
    HOTEL: '#0ea5e9',
    FESTIVAL: '#f59e0b'
};

// ─────────────────────────────────────────
// Statistiques (Dashboard)
// ─────────────────────────────────────────

export interface StatAvantageKpi {
    totalReservations: number;
    reservationsCeMois: number;
    offresActives: number;
    partenairesActifs: number;
}

export interface StatCategorie {
    categorie: string;
    count: number;
    pourcentage: number;
}

export interface StatTopOffre {
    idOffre: string;
    titreOffre: string;
    count: number;
}

export interface StatMensuelle {
    mois: number;
    count: number;
}

export interface StatStatut {
    statut: string;
    count: number;
    pourcentage: number;
}
