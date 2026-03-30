import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

const APP_CONFIG: Record<string, { title: string; icon: string; description: string; features: string[] }> = {
    partnerships: {
        title      : 'Partnerships',
        icon       : 'iconsmind:handshake',
        description: 'Gestion des partenariats et collaborations externes',
        features   : ['Annuaire des partenaires', 'Suivi des contrats', 'Tableau de bord partenariats', 'Gestion des événements conjoints']
    },
    rse: {
        title      : 'RSE',
        icon       : 'heroicons_outline:globe-alt',
        description: 'Responsabilité Sociétale des Entreprises',
        features   : ['Indicateurs RSE', 'Actions et initiatives', 'Rapports de durabilité', 'Engagement des collaborateurs']
    },
    restaurant: {
        title      : 'Restaurant d\'entreprise',
        icon       : 'heroicons_outline:office-building',
        description: 'Réservation et gestion du restaurant d\'entreprise',
        features   : ['Réservation des repas', 'Menu du jour', 'Horaires et planning', 'Gestion des allergies']
    },
    covoiturage: {
        title      : 'Covoiturage',
        icon       : 'heroicons_outline:truck',
        description: 'Mise en relation pour le covoiturage entre collaborateurs',
        features   : ['Recherche de trajets', 'Proposition de places', 'Planification des trajets', 'Suivi des économies CO₂']
    },
    carriere: {
        title      : 'Carrière',
        icon       : 'heroicons_outline:briefcase',
        description: 'Gestion des parcours professionnels et évolutions',
        features   : ['Parcours et compétences', 'Objectifs et évaluations', 'Formations recommandées', 'Offres internes']
    }
};

@Component({
    selector   : 'hr-app',
    templateUrl: './hr-app.component.html',
    styleUrls  : ['./hr-app.component.scss']
})
export class HrAppComponent implements OnInit
{
    title: string;
    icon: string;
    description: string;
    features: string[];

    constructor(
        private _route: ActivatedRoute,
        private _router: Router
    ) {}

    ngOnInit(): void
    {
        const path = this._router.url.split('/').filter(Boolean).pop()?.split('?')[0] || 'partnerships';
        const config = APP_CONFIG[path] || APP_CONFIG.partnerships;

        this.title = config.title;
        this.icon = config.icon;
        this.description = config.description;
        this.features = config.features;
    }
}
