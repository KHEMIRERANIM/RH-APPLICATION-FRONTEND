export interface Notification
{
    id: string;
    icon?: string;
    image?: string;
    title?: string;
    description?: string;
    time: string;
    link?: string;
    useRouter?: boolean;
    read: boolean;

    // Backend properties
    destinataireId?: string;
    expediteurId?: string;
    trajetId?: string;
    reservationId?: string;
    type?: string;
    contenu?: string;
    lu?: boolean;
    dateCreation?: string;
}
