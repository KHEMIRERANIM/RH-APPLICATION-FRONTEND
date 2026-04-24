// src/app/modules/employee/components/examen-resultats/examen-resultats.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ExamenService } from '../../services/examen.service';
import { DialogService } from '../../../../core/services/dialog.service';
import { ResultatExamen } from '../../../../shared/models/formation.model';

@Component({
    selector: 'app-examen-resultats',
    templateUrl: './examen-resultats.component.html',
    styleUrls: ['./examen-resultats.component.scss']
})
export class ExamenResultatsComponent implements OnInit {
    examenId: string = '';
    formationId: string = '';
    examenTitre: string = '';
    resultats: ResultatExamen[] = [];
    statistiques: any = null;
    isLoading = true;
    userRole: string | null = null;
    searchTerm: string = '';
    filtreNote: string = 'TOUS';

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private examenService: ExamenService,
        private dialogService: DialogService
    ) {}

    ngOnInit(): void {
        this.userRole = localStorage.getItem('userRole');
        
        // Récupérer les paramètres de la route
        this.route.params.subscribe(params => {
            this.formationId = params['formationId'];
            this.examenId = params['examenId'];
            
            if (this.examenId) {
                this.loadExamenDetails();
                this.loadResultats();
                this.loadStatistiques();
            }
        });
    }

    loadExamenDetails(): void {
        this.examenService.getExamenById(this.examenId).subscribe({
            next: (examen) => {
                this.examenTitre = examen.titre;
            },
            error: (err) => {
                console.error('Erreur chargement examen', err);
            }
        });
    }

    loadResultats(): void {
        this.isLoading = true;
        this.examenService.getResultatsByExamen(this.examenId).subscribe({
            next: (resultats) => {
                // Trier par note décroissante
                this.resultats = resultats.sort((a, b) => b.note - a.note);
                this.isLoading = false;
            },
            error: (err) => {
                console.error('Erreur chargement résultats', err);
                this.dialogService.alert({
                    title: 'Erreur',
                    message: 'Impossible de charger les résultats',
                    type: 'error'
                });
                this.isLoading = false;
            }
        });
    }

    loadStatistiques(): void {
        this.examenService.getStatistiquesExamen(this.examenId).subscribe({
            next: (stats) => {
                this.statistiques = stats;
            },
            error: (err) => {
                console.error('Erreur chargement statistiques', err);
            }
        });
    }

    // Filtrer les résultats
    getResultatsFiltres(): ResultatExamen[] {
        let filtered = [...this.resultats];
        
        // Filtre par recherche
        if (this.searchTerm) {
            const term = this.searchTerm.toLowerCase();
            filtered = filtered.filter(r => 
                r.employeNom?.toLowerCase().includes(term) ||
                r.employePrenom?.toLowerCase().includes(term) ||
                r.employeEmail?.toLowerCase().includes(term)
            );
        }
        
        // Filtre par note
        if (this.filtreNote !== 'TOUS') {
            switch(this.filtreNote) {
                case 'EXCELLENT':
                    filtered = filtered.filter(r => r.note >= 15);
                    break;
                case 'BIEN':
                    filtered = filtered.filter(r => r.note >= 12 && r.note < 15);
                    break;
                case 'PASSABLE':
                    filtered = filtered.filter(r => r.note >= 10 && r.note < 12);
                    break;
                case 'ECHOUE':
                    filtered = filtered.filter(r => r.note < 10);
                    break;
            }
        }
        
        return filtered;
    }

    getNoteClass(note: number): string {
        if (note >= 15) return 'note-excellent';
        if (note >= 12) return 'note-bien';
        if (note >= 10) return 'note-passable';
        return 'note-insuffisant';
    }

    getNoteIcon(note: number): string {
        if (note >= 15) return '🏆';
        if (note >= 12) return '👍';
        if (note >= 10) return '✅';
        return '⚠️';
    }

    getPourcentage(note: number): number {
        return Math.round((note / 20) * 100);
    }

    getStatutText(note: number): string {
        return note >= 10 ? 'Réussi' : 'Échoué';
    }

    getStatutClass(note: number): string {
        return note >= 10 ? 'statut-reussi' : 'statut-echoue';
    }

    // Exporter les résultats en CSV
    exporterResultats(): void {
        const data = this.getResultatsFiltres();
        const csv = this.convertToCSV(data);
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `resultats_${this.examenTitre}_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        this.dialogService.alert({
            title: 'Succès',
            message: 'Exportation terminée',
            type: 'success'
        });
    }

    convertToCSV(data: ResultatExamen[]): string {
        const headers = ['Nom', 'Prénom', 'Email', 'Note /20', 'Pourcentage', 'Statut', 'Date soumission'];
        const rows = data.map(r => [
            this.escapeCSV(r.employeNom || ''),
            this.escapeCSV(r.employePrenom || ''),
            this.escapeCSV(r.employeEmail || ''),
            r.note.toString(),
            this.getPourcentage(r.note) + '%',
            this.getStatutText(r.note),
            new Date(r.submittedAt).toLocaleString('fr-FR')
        ]);
        return [headers, ...rows].map(row => row.join(';')).join('\n');
    }

    private escapeCSV(value: string): string {
        if (value.includes(';') || value.includes('"') || value.includes('\n')) {
            return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
    }

    // Statistiques additionnelles
    getTauxReussite(): number {
        if (!this.resultats.length) return 0;
        const reussis = this.resultats.filter(r => r.note >= 10).length;
        return Math.round((reussis / this.resultats.length) * 100);
    }

    getNoteMoyenne(): number {
        if (!this.resultats.length) return 0;
        const somme = this.resultats.reduce((acc, r) => acc + r.note, 0);
        return Math.round((somme / this.resultats.length) * 10) / 10;
    }

    getNoteMin(): number {
        if (!this.resultats.length) return 0;
        return Math.min(...this.resultats.map(r => r.note));
    }

    getNoteMax(): number {
        if (!this.resultats.length) return 0;
        return Math.max(...this.resultats.map(r => r.note));
    }

    // Retour à la liste des examens
    retour(): void {
        this.router.navigate(['/employee/formations', this.formationId]);
    }
}