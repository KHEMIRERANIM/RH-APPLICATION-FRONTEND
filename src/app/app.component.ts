import { Component, OnInit } from '@angular/core';
import { RecrutementSchedulerService } from './modules/recrutement/services/scheduler.service';

@Component({
    selector   : 'app-root',
    templateUrl: './app.component.html',
    styleUrls  : ['./app.component.scss']
})
export class AppComponent implements OnInit
{
    /**
     * Constructor
     */
    constructor(private schedulerService: RecrutementSchedulerService)
    {
    }
    ngOnInit(): void {
        // Démarrage du moteur de tâches planifiées (Mock Frontend pour la soutenance)
        this.schedulerService.demarrer();
    }
}
