import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { OffreService } from './offre.service';
import { CandidatureService } from './candidature.service';
import { AuthService } from 'app/core/auth/auth.service';
import { interval, Subscription, catchError, of, forkJoin } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class RecrutementSchedulerService implements OnDestroy {
    private _subscription = new Subscription();
    private hasRemindedInterviews = false;
    private hasCuratedSkills = false;

    constructor(
        private http: HttpClient,
        private offreService: OffreService,
        private candidatureService: CandidatureService,
        private authService: AuthService
    ) { }

    demarrer(): void {
        console.log('🚀 [Scheduler] Démarrage du moteur de tâches planifiées (Mock)...');

        // Exécute les vérifications toutes les 30 secondes pour une démonstration rapide.
        this._subscription.add(
            interval(30000).subscribe(() => {
                this.verifierRappelsEntretiens();
                this.lancerCurateurDeFormation();
            })
        );

        // Première passe immédiate
        setTimeout(() => {
            this.verifierRappelsEntretiens();
            this.lancerCurateurDeFormation();
        }, 5000);
    }

    /**
     * JOB : Le Curateur de Formation Continu (Smart Skill-Gap Matcher)
     */
    private lancerCurateurDeFormation(): void {
        // Éviter de spamer les notifications en boucle pour la démonstration
        if (this.hasCuratedSkills) return;

        const user = this.authService.currentUser;
        // On s'assure que c'est un recruteur/RH (ADMIN) qui analyse ses données
        if (!user || user.role?.toUpperCase() !== 'ADMIN') return;

        this.offreService.getOffresByAdmin(user.id).subscribe({
            next: (offres) => {
                if (!offres || offres.length === 0) return;

                // 1. Récupération asynchrone par lots de toutes les candidatures liées à chaque offre
                const candidatureRequests = offres.map(o => this.candidatureService.getCandidaturesParOffre(o.id));

                forkJoin(candidatureRequests).subscribe({
                    next: (results) => {
                        // results est un tableau 2D [ [cand1, cand2], [cand3] ], on l'aplatit avec flat()
                        const toutesCandidatures = results.flat();

                        // 2. Cibler uniquement les talents qui ont été définitivement retenus/acceptés
                        const candidatsAcceptes = toutesCandidatures.filter(c => c.statut === 'ACCEPTE');

                        if (candidatsAcceptes.length === 0) return;

                        // 3. Algorithme de fréquence pour comptabiliser les lacunes d'apprentissage
                        const missingSkillsCount: { [key: string]: number } = {};

                        candidatsAcceptes.forEach(c => {
                            if (c.competencesManquantes && c.competencesManquantes.length > 0) {
                                c.competencesManquantes.forEach(skill => {
                                    // Nettoyage et normalisation NLP basique
                                    const normalizedSkill = skill.toLowerCase().trim();
                                    missingSkillsCount[normalizedSkill] = (missingSkillsCount[normalizedSkill] || 0) + 1;
                                });
                            }
                        });

                        // 4. Identifier la lacune la plus fréquente (The core missing gap)
                        let mostMissingSkill = '';
                        let maxCount = 0;

                        for (const skill in missingSkillsCount) {
                            if (missingSkillsCount[skill] > maxCount) {
                                maxCount = missingSkillsCount[skill];
                                mostMissingSkill = skill;
                            }
                        }

                        // 5. Pousser la recommandation e-learning intelligente si un trou de compétence récurrent est avéré
                        if (mostMissingSkill) {
                            console.log(`🧠 [Scheduler Analytic] Macro Skill-Gap Détecté: "${mostMissingSkill}" manque chez ${maxCount} talent(s) embauché(s).`);
                            this.pushNotification(
                                'heroicons_solid:academic-cap',
                                'Alerte : Skill-Gap Macro Détecté',
                                `L'IA a noté que la compétence "<b>${mostMissingSkill.toUpperCase()}</b>" manque de manière récurrente chez <b>${maxCount}</b> de vos tout derniers talents embauchés.<br/><br/><i>⚡ Action requise : Pensez prioritairement à intégrer ce module à vos programmes de formation (E-Learning) d'intégration RH.</i>`,
                                '/apps/academy'
                            );
                        }

                        this.hasCuratedSkills = true;
                    }
                });
            }
        });
    }

    private verifierRappelsEntretiens(): void {
        if (this.hasRemindedInterviews) {
            return;
        }

        const user = this.authService.currentUser;
        if (!user) return;

        this.pushNotification(
            'heroicons_solid:video-camera',
            'Rappel Intelligent d\'Agenda',
            'Vous avez un entretien AI Vidéo ou un point Technique programmé prochainement dans votre pipeline.',
            '/recrutement/calendrier'
        );
        this.hasRemindedInterviews = true;
    }

    /**
     * Injecte une notification dans la barre supérieure de fuse-theme via une requête HTTP Mockée
     */
    private pushNotification(icon: string, title: string, description: string, link?: string): void {
        const payload: any = {
            icon,
            title,
            description,
            time: new Date().toISOString(),
            read: false,
            useRouter: !!link
        };
        if (link) payload.link = link;

        this.http.post('api/common/notifications', { notification: payload })
            .pipe(catchError(() => of(null)))
            .subscribe(() => {
                console.log(`🔔 [Scheduler Notifié] -> ${title}`);
            });
    }

    ngOnDestroy(): void {
        this._subscription.unsubscribe();
    }
}
