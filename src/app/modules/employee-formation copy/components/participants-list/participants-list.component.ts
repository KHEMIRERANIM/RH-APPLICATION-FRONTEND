// src/app/modules/employee/components/participants-list/participants-list.component.ts
import { Component, OnInit, Input, OnChanges, SimpleChanges } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { ParticipantService, ParticipantInscription } from '../../services/participant.service';
import { DialogService } from '../../../../core/services/dialog.service';
import { EmployeeFormationService } from '../../services/employee-formation.service';
import { Formation } from '../../../../shared/models/formation.model';

@Component({
    selector: 'app-participants-list',
    standalone: false,
    templateUrl: './participants-list.component.html',
    styleUrls: ['./participants-list.component.scss']
})
export class ParticipantsListComponent implements OnInit, OnChanges {
    @Input() formationId!: string;
    @Input() inlineMode: boolean = false;
    
    participants: ParticipantInscription[] = [];
    isLoading = false;
    searchTerm = '';
    filtreStatut = 'TOUS';
    statistiques: any = null;
    
    // ✅ Nouvelle propriété pour la formation et son statut
    formation: Formation | null = null;
    isFormationEnCours: boolean = false;
    isLoadingFormation: boolean = false;

    constructor(
        private participantService: ParticipantService,
        private dialogService: DialogService,
        private route: ActivatedRoute,
        private location: Location,
        private formationService: EmployeeFormationService  // ✅ Injection du service
    ) {}

    ngOnInit(): void {
        if (!this.inlineMode) {
            this.route.params.subscribe(params => {
                this.formationId = params['formationId'];
                if (this.formationId) {
                    this.loadFormation();  // ✅ Charger d'abord la formation
                    this.loadParticipants();
                    this.loadStatistiques();
                }
            });
        } else if (this.formationId) {
            this.loadFormation();  // ✅ Charger d'abord la formation
            this.loadParticipants();
            this.loadStatistiques();
        }
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['formationId'] && this.formationId) {
            this.loadFormation();  // ✅ Recharger la formation
            this.loadParticipants();
            this.loadStatistiques();
        }
    }

    goBack(): void {
        this.location.back();
    }

    // ✅ Nouvelle méthode pour charger la formation
    loadFormation(): void {
        if (!this.formationId) return;
        
        this.isLoadingFormation = true;
        this.formationService.getFormationById(this.formationId).subscribe({
            next: (formation) => {
                this.formation = formation;
                this.checkIfFormationEnCours();
                this.isLoadingFormation = false;
            },
            error: (err) => {
                console.error('Erreur chargement formation', err);
                this.isLoadingFormation = false;
            }
        });
    }

    loadParticipants(): void {
        if (!this.formationId) return;
        
        this.isLoading = true;
        this.participantService.getParticipantsByFormation(this.formationId).subscribe({
            next: (data) => {
                this.participants = data;
                this.isLoading = false;
            },
            error: (err) => {
                console.error('Erreur chargement participants', err);
                this.dialogService.alert({
                    title: 'Erreur',
                    message: 'Impossible de charger la liste des participants',
                    type: 'error'
                });
                this.isLoading = false;
            }
        });
    }

    loadStatistiques(): void {
        if (!this.formationId) return;
        
        this.participantService.getStatistiquesFormation(this.formationId).subscribe({
            next: (data) => {
                this.statistiques = data;
            },
            error: (err) => {
                console.error('Erreur chargement statistiques', err);
            }
        });
    }

    validerPresence(participant: ParticipantInscription): void {
        // ✅ Vérifier si la formation est en cours
        if (!this.isFormationEnCours) {
            this.dialogService.alert({
                title: 'Action non disponible',
                message: 'La validation de présence n\'est possible que pendant la période de formation.',
                type: 'warning'
            });
            return;
        }
        
        this.dialogService.confirm({
            title: 'Validation de présence',
            message: `Valider la présence de ${participant.employePrenom || ''} ${participant.employeNom || ''} ?`,
            confirmText: 'Valider',
            cancelText: 'Annuler'
        }).subscribe((confirmed: boolean) => {
            if (confirmed) {
                this.participantService.validerPresence(this.formationId, participant.employeId).subscribe({
                    next: (updated) => {
                        Object.assign(participant, updated);
                        this.loadStatistiques();
                        this.dialogService.alert({
                            title: 'Succès',
                            message: 'Présence validée avec succès',
                            type: 'success'
                        });
                    },
                    error: (err) => {
                        console.error('Erreur validation présence', err);
                        this.dialogService.alert({
                            title: 'Erreur',
                            message: 'Impossible de valider la présence',
                            type: 'error'
                        });
                    }
                });
            }
        });
    }

    marquerAbsent(participant: ParticipantInscription): void {
        // ✅ Vérifier si la formation est en cours
        if (!this.isFormationEnCours) {
            this.dialogService.alert({
                title: 'Action non disponible',
                message: 'Le marquage d\'absence n\'est possible que pendant la période de formation.',
                type: 'warning'
            });
            return;
        }
        
        this.dialogService.confirm({
            title: 'Marquer comme absent',
            message: `Marquer ${participant.employePrenom || ''} ${participant.employeNom || ''} comme absent ?`,
            confirmText: 'Marquer absent',
            cancelText: 'Annuler',
            type: 'warning'
        }).subscribe((confirmed: boolean) => {
            if (confirmed) {
                this.participantService.marquerAbsent(this.formationId, participant.employeId).subscribe({
                    next: (updated) => {
                        Object.assign(participant, updated);
                        this.loadStatistiques();
                        this.dialogService.alert({
                            title: 'Succès',
                            message: `${participant.employePrenom} ${participant.employeNom} a été marqué comme absent`,
                            type: 'warning'
                        });
                    },
                    error: (err) => {
                        console.error('Erreur marquage absent', err);
                        this.dialogService.alert({
                            title: 'Erreur',
                            message: 'Impossible de marquer l\'absence',
                            type: 'error'
                        });
                    }
                });
            }
        });
    }

    reinitialiserStatut(participant: ParticipantInscription): void {
        // ✅ Vérifier si la formation est en cours
        if (!this.isFormationEnCours) {
            this.dialogService.alert({
                title: 'Action non disponible',
                message: 'La réinitialisation du statut n\'est possible que pendant la période de formation.',
                type: 'warning'
            });
            return;
        }
        
        this.dialogService.confirm({
            title: 'Réinitialiser le statut',
            message: `Réinitialiser le statut de ${participant.employePrenom || ''} ${participant.employeNom || ''} à "Confirmé" ?`,
            confirmText: 'Réinitialiser',
            cancelText: 'Annuler',
            type: 'info'
        }).subscribe((confirmed: boolean) => {
            if (confirmed) {
                this.participantService.reinitialiserStatut(this.formationId, participant.employeId).subscribe({
                    next: (updated) => {
                        Object.assign(participant, updated);
                        this.loadStatistiques();
                        this.dialogService.alert({
                            title: 'Succès',
                            message: 'Statut réinitialisé avec succès',
                            type: 'success'
                        });
                    },
                    error: (err) => {
                        console.error('Erreur réinitialisation', err);
                        this.dialogService.alert({
                            title: 'Erreur',
                            message: 'Impossible de réinitialiser le statut',
                            type: 'error'
                        });
                    }
                });
            }
        });
    }

    annulerInscription(participant: ParticipantInscription): void {
        this.dialogService.confirm({
            title: 'Annulation d\'inscription',
            message: `Annuler l'inscription de ${participant.employePrenom || ''} ${participant.employeNom || ''} ?`,
            confirmText: 'Annuler',
            cancelText: 'Retour',
            type: 'warning'
        }).subscribe((confirmed: boolean) => {
            if (confirmed) {
                this.participantService.annulerInscription(this.formationId, participant.employeId).subscribe({
                    next: () => {
                        this.participants = this.participants.filter(p => p.id !== participant.id);
                        this.loadStatistiques();
                        this.dialogService.alert({
                            title: 'Succès',
                            message: 'Inscription annulée',
                            type: 'success'
                        });
                    },
                    error: (err) => {
                        console.error('Erreur annulation', err);
                        this.dialogService.alert({
                            title: 'Erreur',
                            message: 'Impossible d\'annuler l\'inscription',
                            type: 'error'
                        });
                    }
                });
            }
        });
    }

    getParticipantsFiltres(): ParticipantInscription[] {
        let filtered = this.participants;
        
        if (this.searchTerm) {
            const term = this.searchTerm.toLowerCase();
            filtered = filtered.filter(p => 
                p.employeNom?.toLowerCase().includes(term) ||
                p.employePrenom?.toLowerCase().includes(term) ||
                p.employeEmail?.toLowerCase().includes(term)
            );
        }
        
        if (this.filtreStatut !== 'TOUS') {
            filtered = filtered.filter(p => p.statut === this.filtreStatut);
        }
        
        return filtered;
    }

    // ✅ Méthodes corrigées avec vérification isFormationEnCours
    canValidatePresence(statut: string): boolean {
        // Uniquement si la formation est en cours ET le statut n'est pas déjà PRESENT ou ABSENT
        return this.isFormationEnCours && 
               (statut === 'CONFIRME' || statut === 'EN_ATTENTE');
    }

    canMarkAbsent(statut: string): boolean {
        // Uniquement si la formation est en cours ET le statut n'est pas déjà ABSENT
        return this.isFormationEnCours && 
               (statut === 'CONFIRME' || statut === 'EN_ATTENTE' || statut === 'PRESENT');
    }

    canResetStatus(statut: string): boolean {
        // Uniquement si la formation est en cours ET le statut est PRESENT ou ABSENT
        return this.isFormationEnCours && 
               (statut === 'PRESENT' || statut === 'ABSENT');
    }

    // ✅ Nouvelle méthode pour obtenir la période de formation
    getPeriodeFormation(): string {
        if (!this.formation) return '';
        
        const debut = this.formation.dateDebut ? new Date(this.formation.dateDebut) : null;
        const fin = this.formation.dateFin ? new Date(this.formation.dateFin) : null;
        
        if (debut && fin) {
            return `du ${debut.toLocaleDateString()} au ${fin.toLocaleDateString()}`;
        }
        return '';
    }

    getStatutBadgeClass(statut: string): string {
        const classes: { [key: string]: string } = {
            'CONFIRME': 'badge-success',
            'EN_ATTENTE': 'badge-warning',
            'PRESENT': 'badge-info',
            'ABSENT': 'badge-danger',
            'VALIDE': 'badge-primary'
        };
        return classes[statut] || 'badge-secondary';
    }

    getStatutText(statut: string): string {
        const texts: { [key: string]: string } = {
            'CONFIRME': '✅ Inscrit',
            'EN_ATTENTE': '⏳ En attente',
            'PRESENT': '📍 Présent',
            'ABSENT': '❌ Absent',
            'VALIDE': '✓ Validé'
        };
        return texts[statut] || statut;
    }

    exporterListe(): void {
        const data = this.getParticipantsFiltres();
        const csv = this.convertToCSV(data);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `participants_${this.formationId}_${new Date().toISOString()}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    }

    convertToCSV(data: ParticipantInscription[]): string {
        const headers = ['Nom', 'Prénom', 'Email', 'Statut', 'Présence validée', 'Date inscription'];
        const rows = data.map(p => [
            this.escapeCSV(p.employeNom || ''),
            this.escapeCSV(p.employePrenom || ''),
            this.escapeCSV(p.employeEmail || ''),
            this.getStatutText(p.statut),
            p.presenceValidee ? 'Oui' : 'Non',
            new Date(p.dateInscription).toLocaleDateString()
        ]);
        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    private escapeCSV(value: string): string {
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
    }

    trackById(index: number, participant: ParticipantInscription): string {
        return participant.id;
    }

    // Dans participants-list.component.ts

// Ajoutez ces propriétés
isFormationAVenir: boolean = false;
isFormationTerminee: boolean = false;

// Dans checkIfFormationEnCours(), mettez à jour :
checkIfFormationEnCours(): void {
    if (!this.formation) {
        this.isFormationEnCours = false;
        this.isFormationAVenir = false;
        this.isFormationTerminee = false;
        return;
    }
    
    const maintenant = new Date();
    const dateDebut = this.formation.dateDebut ? new Date(this.formation.dateDebut) : null;
    const dateFin = this.formation.dateFin ? new Date(this.formation.dateFin) : null;
    
    if (dateDebut && dateFin) {
        this.isFormationEnCours = maintenant >= dateDebut && maintenant <= dateFin;
        this.isFormationAVenir = maintenant < dateDebut;
        this.isFormationTerminee = maintenant > dateFin;
    } else {
        this.isFormationEnCours = false;
        this.isFormationAVenir = false;
        this.isFormationTerminee = false;
    }
}
}