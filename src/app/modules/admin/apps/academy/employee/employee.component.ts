import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, ViewEncapsulation } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { AcademyService } from '../academy.service';
import { NotificationService } from 'src/app/services/notification.service';
import { DemandeConge, BulletinSalaire, SoldeConge } from '../academy.types';
import { NewDemandeDialogComponent } from './dialogs/new-demande-dialog.component';
import { BulletinDetailDialogComponent } from '../dashboard/dialogs/bulletin-detail-dialog.component';
import { EditDemandeDialogComponent } from './dialogs/edit-demande-dialog.component';
import { ConfirmDeleteDialogComponent } from './dialogs/confirm-delete-dialog.component';
import { RecommandationEmployeResponse } from '../academy.types';
@Component({
    selector: 'employee',
    templateUrl: './employee.component.html',
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmployeeComponent implements OnInit {
    recommandations: RecommandationEmployeResponse[] = [];

    mesDemandes: DemandeConge[] = [];
    mesBulletins: BulletinSalaire[] = [];
    solde: SoldeConge | null = null;
    demandesApprouvees: number = 0;
    demandesEnAttente: number = 0;
    demandesRefusees: number = 0;
    error: string | null = null;
    
    employeId: string = "";
    managerId: string = "69c9c83763d00230b5311df9";

    constructor(
        private academyService: AcademyService,
        private cdr: ChangeDetectorRef,
        private dialog: MatDialog,
        private toastr: ToastrService,
        private notificationService: NotificationService
    ) {}

    ngOnInit(): void {
        console.log('=== EmployeeComponent INIT ===');
        this.loadUserFromStorage();
        this.loadData();
        this.loadRecommandations();

        // S'abonner aux notifications WebSocket pour les validations
        this.notificationService.getNotifications().subscribe((notification: any) => {
            if (notification.type === 'VALIDATION_CONGE') {
                if (notification.statut === 'APPROUVE') {
                    this.toastr.success(notification.message, '✅ Congé approuvé', {
                        timeOut: 5000,
                        positionClass: 'toast-top-right',
                        closeButton: true
                    });
                } else {
                    this.toastr.error(notification.message + (notification.commentaire ? ' : ' + notification.commentaire : ''), '❌ Congé refusé', {
                        timeOut: 5000,
                        positionClass: 'toast-top-right',
                        closeButton: true
                    });
                }
                this.loadData(); // Rafraîchir les données
            }
        });
    }

    loadUserFromStorage(): void {
        try {
            const userStr = localStorage.getItem('currentUser');
            console.log('User from storage:', userStr);
            
            if (userStr) {
                const user = JSON.parse(userStr);
                this.employeId = user.id;
                console.log('Employé ID chargé:', this.employeId);
            } else {
                this.employeId = "69cead4bd6687448e32d3606";
                console.log('Fallback employeId:', this.employeId);
            }
        } catch(e) {
            console.error('Erreur chargement user:', e);
            this.error = 'Erreur de chargement de l\'utilisateur';
        }
    }

    loadData(): void {
        if (!this.employeId) {
            console.error('Pas d\'employeId disponible');
            this.error = 'ID employé non trouvé';
            return;
        }

        console.log('Chargement des données pour employeId:', this.employeId);
        
        this.academyService.getMesDemandes(this.employeId).subscribe({
            next: (demandes) => {
                console.log('Toutes demandes reçues:', demandes);
                this.mesDemandes = demandes || [];
                this.demandesApprouvees = this.mesDemandes.filter(d => d.statut === 'APPROUVE').length;
                this.demandesEnAttente = this.mesDemandes.filter(d => d.statut === 'EN_ATTENTE').length;
                this.demandesRefusees = this.mesDemandes.filter(d => d.statut === 'REFUSE').length;
                this.cdr.markForCheck();
            },
            error: (err) => {
                console.error('Erreur chargement demandes:', err);
                this.error = 'Erreur de chargement des demandes';
                this.cdr.markForCheck();
            }
        });

        this.academyService.getMesBulletins(this.employeId).subscribe({
            next: (bulletins) => {
                console.log('Bulletins reçus:', bulletins);
                this.mesBulletins = bulletins || [];
                this.cdr.markForCheck();
            },
            error: (err) => {
                console.error('Erreur chargement bulletins:', err);
            }
        });

        this.academyService.getSoldeConge(this.employeId).subscribe({
            next: (solde) => {
                console.log('Solde reçu:', solde);
                this.solde = solde;
                this.cdr.markForCheck();
            },
            error: (err) => {
                console.error('Erreur chargement solde:', err);
            }
        });
    }

    nouvelleDemande(): void {
        const dialogRef = this.dialog.open(NewDemandeDialogComponent, {
            width: '550px',
            data: { employeId: this.employeId, managerId: this.managerId }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) this.loadData();
        });
    }

    supprimerDemande(demande: DemandeConge): void {
        const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
            width: '400px',
            data: {
                message: 'Supprimer cette demande de congé ?',
                details: `Période: ${new Date(demande.dateDebut).toLocaleDateString()} - ${new Date(demande.dateFin).toLocaleDateString()}`,
                motif: demande.motif
            }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.academyService.supprimerDemande(demande.id, this.employeId).subscribe({
                    next: () => {
                        this.loadData();
                    },
                    error: (err) => console.error('Erreur suppression:', err)
                });
            }
        });
    }

    modifierDemande(demande: DemandeConge): void {
        const dialogRef = this.dialog.open(EditDemandeDialogComponent, {
            width: '550px',
            data: { demande }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.loadData();
            }
        });
    }

    voirDetails(bulletin: BulletinSalaire): void {
        this.dialog.open(BulletinDetailDialogComponent, {
            width: '550px',
            data: bulletin
        });
    }

    getTypeLabel(type: string): string {
        const labels: Record<string, string> = {
            'CONGE_ANNUEL': 'Annuel',
            'CONGE_MALADIE': 'Maladie',
            'CONGE_MATERNITE': 'Maternité',
            'CONGE_PATERNITE': 'Paternité',
            'CONGE_SANS_SOLDE': 'Sans solde',
            'AUTRE': 'Autre'
        };
        return labels[type] || type;
    }

    getStatutLabel(statut: string): string {
        const labels: Record<string, string> = {
            'EN_ATTENTE': 'En attente',
            'APPROUVE': 'Approuvé',
            'REFUSE': 'Refusé'
        };
        return labels[statut] || statut;
    }

    getStatutClass(statut: string): string {
        const classes: Record<string, string> = {
            'EN_ATTENTE': 'bg-amber-100 text-amber-800',
            'APPROUVE': 'bg-green-100 text-green-800',
            'REFUSE': 'bg-red-100 text-red-800'
        };
        return classes[statut] || '';
    }

    getTypeCongeClass(type: string): string {
        const classes: Record<string, string> = {
            'CONGE_ANNUEL': 'bg-blue-100 text-blue-800',
            'CONGE_MALADIE': 'bg-red-100 text-red-800',
            'CONGE_MATERNITE': 'bg-pink-100 text-pink-800',
            'CONGE_PATERNITE': 'bg-cyan-100 text-cyan-800',
            'CONGE_SANS_SOLDE': 'bg-gray-100 text-gray-800',
            'AUTRE': 'bg-purple-100 text-purple-800'
        };
        return classes[type] || 'bg-gray-100 text-gray-800';
    }

    getMoisLabel(mois: number): string {
        const moisLabels = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                           'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
        return moisLabels[mois - 1] || `${mois}`;
    }

    telechargerPDF(id: string): void {
    this.academyService.telechargerPDF(id).subscribe({
        next: (blob) => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `bulletin_${id}.pdf`;
            a.click();
            window.URL.revokeObjectURL(url);
        },
        error: (err) => console.error('Erreur téléchargement:', err)
    });
}

loadRecommandations(): void {
    if (!this.employeId) return;
    
    this.academyService.getRecommandationsEmploye(this.employeId).subscribe({
        next: (recommandations) => {
            this.recommandations = recommandations;
            this.cdr.markForCheck();
        },
        error: (err) => {
            console.error('Erreur chargement recommandations:', err);
        }
    });
}

utiliserSuggestion(dateSuggestion: string): void {
    const dialogRef = this.dialog.open(NewDemandeDialogComponent, {
        width: '550px',
        data: { 
            employeId: this.employeId, 
            managerId: this.managerId,
            dateSuggestion: dateSuggestion
        }
    });

    dialogRef.afterClosed().subscribe(result => {
        if (result) this.loadData();
    });
}
}