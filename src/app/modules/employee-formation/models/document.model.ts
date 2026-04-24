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
