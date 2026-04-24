export interface Notification
{
    id: string;
    icon?: string;
    image?: string;
    title?: string;
    description?: string;
    time: string | Date;
    link?: string;
    useRouter?: boolean;
    read: boolean;

    // Backend properties
    destinataireId?: string;
    expediteurId?: string;
    trajetId?: string;
    reservationId?: string;
    type?: string;
    trajetAnnuleId?: string;
    contenu?: string;
    lu?: boolean;
    dateCreation?: string;
    idUser?: string;
}
