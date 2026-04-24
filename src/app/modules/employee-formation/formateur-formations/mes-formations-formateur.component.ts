// src/app/modules/employee/formateur-formations/mes-formations-formateur.component.ts
import { Component, OnInit } from '@angular/core';
import { FormateurService } from '../formateurs/formateur.service';
import { Formation } from '../../../shared/models/formation.model';
import { Router, ActivatedRoute } from '@angular/router';
import { DialogService } from '../../../core/services/dialog.service';

@Component({
    selector: 'app-mes-formations-formateur',
    templateUrl: './mes-formations-formateur.component.html',
    styleUrls: ['./mes-formations-formateur.component.scss']
})
export class MesFormationsFormateurComponent implements OnInit {
    formations: Formation[] = [];
    isLoading = false;
    selectedFormation: Formation | null = null;
    errorMessage: string = '';
    formateurId: string = '';
    formateurNom: string = 'Formateur';
    isFormateurRoute = false;
    
    // ✅ CORRECTION: Ajouter 'participants' au type
    activeSection: { [formationId: string]: 'examens' | 'documents' | 'participants' | null } = {};

    typeColors: { [key: string]: string } = {
        'TECHNIQUE': '#3b82f6',
        'MANAGERIAL': '#10b981',
        'RSE': '#8b5cf6',
        'SOFT_SKILLS': '#f59e0b',
        'SECURITE': '#ef4444'
    };

    typeBgColors: { [key: string]: string } = {
        'TECHNIQUE': '#eff6ff',
        'MANAGERIAL': '#ecfdf5',
        'RSE': '#f5f3ff',
        'SOFT_SKILLS': '#fffbeb',
        'SECURITE': '#fef2f2'
    };

    constructor(
        private formateurService: FormateurService,
        private router: Router,
        private route: ActivatedRoute,
        private dialogService: DialogService
    ) {}

    ngOnInit(): void {
        this.isFormateurRoute = this.router.url.includes('formateur');
        this.loadFormateurInfo();
    }

    loadFormateurInfo(): void {
        const userId = localStorage.getItem('userId');
        const savedUser = localStorage.getItem('currentUser');
        let email: string | null = null;

        if (savedUser) {
            try {
                const userData = JSON.parse(savedUser);
                email = userData.email || null;
                this.formateurNom = userData.prenom && userData.nom
                    ? `${userData.prenom} ${userData.nom}`
                    : userData.nom || 'Formateur';
            } catch (e) {
                console.error('Erreur parsing currentUser:', e);
            }
        }

        if (!userId && !email) {
            this.errorMessage = 'Impossible d\'identifier le formateur. Veuillez vous reconnecter.';
            return;
        }

        this.formateurService.getFormateurs().subscribe({
            next: (formateurs) => {
                const formateur = formateurs.find(f =>
                    (userId && f.userId === userId) ||
                    (email && f.email === email)
                );

                if (formateur) {
                    this.formateurId = formateur.id;
                    this.formateurNom = formateur.prenom && formateur.nom
                        ? `${formateur.prenom} ${formateur.nom}`
                        : formateur.nom || 'Formateur';
                    this.loadMesFormations();
                } else {
                    this.errorMessage = 'Vous n\'êtes pas enregistré comme formateur.';
                }
            },
            error: (err) => {
                console.error('Erreur recherche formateur:', err);
                this.errorMessage = 'Impossible de charger les informations du formateur.';
            }
        });
    }
    
    loadMesFormations(): void {
        if (!this.formateurId) {
            this.errorMessage = 'Impossible d\'identifier le formateur.';
            return;
        }

        this.isLoading = true;
        this.errorMessage = '';

        this.formateurService.getFormationsByFormateur(this.formateurId).subscribe({
            next: (formations) => {
                this.formations = formations;
                this.isLoading = false;
            },
            error: (err) => {
                console.error('Erreur chargement formations', err);
                this.errorMessage = 'Impossible de charger vos formations.';
                this.isLoading = false;
            }
        });
    }

    // ==================== MÉTHODES DE NAVIGATION ====================

    voirParticipants(formationId: string): void {
        if (!formationId) {
            this.dialogService.alert({
                title: 'Erreur',
                message: 'Formation non identifiée',
                type: 'error'
            });
            return;
        }
        this.router.navigateByUrl(`/employee/formations/${formationId}/participants`);
    }

    // ==================== GESTION DES SECTIONS INLINE ====================
    
    // ✅ CORRECTION: Ajouter 'participants' au type du paramètre
    toggleSection(formationId: string, section: 'examens' | 'documents' | 'participants'): void {
        if (this.activeSection[formationId] === section) {
            this.activeSection[formationId] = null;
        } else {
            this.activeSection[formationId] = section;
        }
    }

    // ✅ CORRECTION: Ajouter 'participants' au type du paramètre
    isSectionActive(formationId: string, section: 'examens' | 'documents' | 'participants'): boolean {
        return this.activeSection[formationId] === section;
    }

    // ==================== MÉTHODES DE DATE ====================

    formatDate(date: any): string {
        if (!date) return '---';
        try {
            const d = new Date(date);
            if (isNaN(d.getTime())) return '---';
            const day = d.getDate().toString().padStart(2, '0');
            const month = (d.getMonth() + 1).toString().padStart(2, '0');
            const year = d.getFullYear();
            return `${day}/${month}/${year}`;
        } catch (e) {
            return '---';
        }
    }

    getValidDate(date: any): Date {
        if (!date) return new Date();
        if (date instanceof Date) return date;
        const d = new Date(date);
        return isNaN(d.getTime()) ? new Date() : d;
    }

    toggleDetails(formation: Formation): void {
        if (this.selectedFormation?.id === formation.id) {
            this.selectedFormation = null;
        } else {
            this.selectedFormation = formation;
        }
    }

    // ==================== MÉTHODES STATISTIQUES ====================

    getFormationsEnCours(): number {
        const now = new Date();
        return this.formations.filter(f => {
            const debut = this.getValidDate(f.dateDebut);
            const fin = this.getValidDate(f.dateFin);
            return now >= debut && now <= fin;
        }).length;
    }

    getFormationsTerminees(): number {
        const now = new Date();
        return this.formations.filter(f => {
            const fin = this.getValidDate(f.dateFin);
            return now > fin;
        }).length;
    }

    getFormationsAVenir(): number {
        const now = new Date();
        return this.formations.filter(f => {
            const debut = this.getValidDate(f.dateDebut);
            return now < debut;
        }).length;
    }

    // ==================== MÉTHODES D'AFFICHAGE ====================

    getStatusClass(dateDebut: any, dateFin: any): string {
        const now = new Date();
        const debut = this.getValidDate(dateDebut);
        const fin = this.getValidDate(dateFin);

        if (now < debut) return 'status-a-venir';
        if (now > fin) return 'status-termine';
        return 'status-en-cours';
    }

    getStatusText(dateDebut: any, dateFin: any): string {
        const now = new Date();
        const debut = this.getValidDate(dateDebut);
        const fin = this.getValidDate(dateFin);

        if (now < debut) return 'À venir';
        if (now > fin) return 'Terminé';
        return 'En cours';
    }

    getTypeColor(type: string): string {
        return this.typeColors[type] || '#6366f1';
    }

    getTypeBgColor(type: string): string {
        return this.typeBgColors[type] || '#f3f4f6';
    }

    // ==================== MÉTHODE POUR COPIER LE LIEN ====================

    copierLien(lien: string): void {
        navigator.clipboard.writeText(lien).then(() => {
            this.dialogService.alert({
                title: 'Lien copié',
                message: 'Le lien a été copié dans le presse-papier.',
                type: 'success',
                confirmText: 'Fermer'
            });
        }).catch(() => {
            this.dialogService.alert({
                title: 'Erreur',
                message: 'Impossible de copier le lien.',
                type: 'error',
                confirmText: 'Fermer'
            });
        });
    }

    retry(): void {
        this.loadMesFormations();
    }
}