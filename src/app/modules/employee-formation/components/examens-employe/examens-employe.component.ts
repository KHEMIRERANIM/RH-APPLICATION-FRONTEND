// examens-employe.component.ts
import { Component, OnInit, Input } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ExamenService } from '../../services/examen.service';
import { DialogService } from '../../../../core/services/dialog.service';
import { Examen } from '../../../../shared/models/formation.model';

@Component({
    selector: 'app-examens-employe',
    templateUrl: './examens-employe.component.html',
    styleUrls: ['./examens-employe.component.scss']
})
export class ExamensEmployeComponent implements OnInit {
    @Input() formationId: string = '';
    @Input() formationTitre: string = '';
    
    examens: Examen[] = [];
    isLoading = false;
    examensDejaPasses: { [key: string]: boolean } = {};
    notesExamens: { [key: string]: number } = {};

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private examenService: ExamenService,
        private dialogService: DialogService
    ) {}

    ngOnInit(): void {
        // Si pas de @Input, essayer de récupérer depuis la route
        if (!this.formationId) {
            this.route.params.subscribe(params => {
                this.formationId = params['formationId'];
                this.loadExamens();
            });
        } else {
            this.loadExamens();
        }
    }

    loadExamens(): void {
        if (!this.formationId) return;
        
        this.isLoading = true;
        this.examenService.getExamensByFormation(this.formationId).subscribe({
            next: (examens) => {
                this.examens = examens;
                this.isLoading = false;
                this.verifierExamensDejaPasses();
            },
            error: (err) => {
                console.error('Erreur chargement examens', err);
                this.isLoading = false;
                this.dialogService.alert({
                    title: 'Erreur',
                    message: 'Impossible de charger les examens',
                    type: 'error'
                });
            }
        });
    }

    verifierExamensDejaPasses(): void {
        const employeId = localStorage.getItem('userId');
        if (!employeId) return;
        
        this.examenService.getResultatsByEmploye(employeId).subscribe({
            next: (resultats) => {
                resultats.forEach(r => {
                    this.examenService.getExamenById(r.examenId).subscribe({
                        next: (examen) => {
                            this.examensDejaPasses[r.examenId] = true;
                            this.notesExamens[r.examenId] = r.note;
                        },
                        error: (err) => console.error('Erreur chargement examen', err)
                    });
                });
            },
            error: (err) => console.error('Erreur vérification examens passés', err)
        });
    }

    passerExamen(examenId: string): void {
        this.router.navigate(['/employee/examens', examenId, 'passer']);
    }

    voirResultats(examenId: string): void {
        this.router.navigate(['/employee/examens', examenId, 'resultats']);
    }

    getStatutLabel(examen: Examen): string {
        if (this.examensDejaPasses[examen.id]) {
            const note = this.notesExamens[examen.id];
            if (note >= 10) {
                return '✅ Réussi';
            } else {
                return '❌ Échoué';
            }
        }
        
        const dateLimite = new Date(examen.dateLimite);
        const aujourdhui = new Date();
        
        if (dateLimite < aujourdhui) {
            return '⏰ Date dépassée';
        }
        
        return '📝 À passer';
    }

    getStatutClass(examen: Examen): string {
        if (this.examensDejaPasses[examen.id]) {
            const note = this.notesExamens[examen.id];
            if (note >= 10) return 'status-success';
            return 'status-failed';
        }
        
        const dateLimite = new Date(examen.dateLimite);
        const aujourdhui = new Date();
        
        if (dateLimite < aujourdhui) {
            return 'status-expired';
        }
        
        return 'status-pending';
    }

    isExamenDisponible(examen: Examen): boolean {
        if (this.examensDejaPasses[examen.id]) return false;
        const dateLimite = new Date(examen.dateLimite);
        const aujourdhui = new Date();
        if (dateLimite < aujourdhui) return false;
        return true;
    }

    getTotalPoints(examen: Examen): number {
        if (!examen.questions || examen.questions.length === 0) return 0;
        return examen.questions.reduce((total, q) => total + (q.points || 1), 0);
    }

    retour(): void {
        this.router.navigate(['/employee/mes-inscriptions']);
    }
}