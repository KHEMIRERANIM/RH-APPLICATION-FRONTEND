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
}