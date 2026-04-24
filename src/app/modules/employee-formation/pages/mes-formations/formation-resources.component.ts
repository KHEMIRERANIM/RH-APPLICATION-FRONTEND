// formation-resources.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
    selector: 'app-formation-resources',
    templateUrl: './formation-resources.component.html'
})
export class FormationResourcesComponent implements OnInit {
    formationId: string = '';
    formationTitre: string = '';
    activeTab: string = 'documents'; // 'documents' ou 'examens'
    
    constructor(
        private route: ActivatedRoute,
        private router: Router
    ) {}

    ngOnInit(): void {
        this.route.params.subscribe(params => {
            this.formationId = params['formationId'];
            this.formationTitre = params['titre'] || 'Formation';
            
            // Récupérer l'onglet actif depuis l'URL ou les paramètres
            this.route.queryParams.subscribe(queryParams => {
                if (queryParams['tab']) {
                    this.activeTab = queryParams['tab'];
                }
            });
        });
    }

    setActiveTab(tab: string): void {
        this.activeTab = tab;
        // Mettre à jour l'URL sans recharger la page
        this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { tab: tab },
            queryParamsHandling: 'merge'
        });
    }

    retour(): void {
        this.router.navigate(['/employee/mes-inscriptions']);
    }
}