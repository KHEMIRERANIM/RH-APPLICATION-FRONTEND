import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatTabGroup } from '@angular/material/tabs';
import { Subject, takeUntil } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { AcademyService } from '../academy.service';
import { NotificationService } from 'src/app/services/notification.service';
import { PredictionResponse, FacteurPrediction, RecommandationEmployeResponse } from '../academy.types';
import { 
    DemandeConge, 
    BulletinSalaire, 
    User, 
    AlerteTendance, 
    AdminStats,
    StatutConge,
    TypeConge
} from '../academy.types';
import { CreateBulletinDialogComponent } from './dialogs/create-bulletin-dialog.component';
import { ValidateCongeDialogComponent } from './dialogs/validate-conge-dialog.component';
import { BulletinDetailDialogComponent } from './dialogs/bulletin-detail-dialog.component';
import { SoldeCongeDialogComponent } from './dialogs/solde-conge-dialog.component';
import { ConfirmDialogComponent } from './dialogs/confirm-dialog.component';
import { EditBulletinDialogComponent } from './dialogs/edit-bulletin-dialog.component';

@Component({
    selector: 'academy-dashboard',
    templateUrl: './dashboard.component.html',
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AcademyDashboardComponent implements OnInit, OnDestroy {
    
    @ViewChild('adminTabs', { static: false }) adminTabs?: MatTabGroup;
    
    demandes: DemandeConge[] = [];
    demandesFiltrees: DemandeConge[] = [];
    bulletins: BulletinSalaire[] = [];
    employes: User[] = [];
    alertes: AlerteTendance[] = [];
    stats: AdminStats | null = null;
    prediction: PredictionResponse | null = null;

    filtreStatut: string = 'all';
    searchQuery: string = '';
    demandesEnAttenteCount: number = 0;
    
    private _unsubscribeAll: Subject<any> = new Subject();

    constructor(
        private _academyService: AcademyService,
        private _changeDetectorRef: ChangeDetectorRef,
        private _dialog: MatDialog,
        private toastr: ToastrService,
        private notificationService: NotificationService
    ) {}

    ngOnInit(): void {
        this.loadData();
        this.loadPrediction();

        // ✅ CORRECTION : Garder TOUTES les demandes (y compris REFUSE)
        this._academyService.demandes$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(demandes => {
                this.demandes = demandes || [];
                this.demandesEnAttenteCount = this.demandes.filter(d => d.statut === 'EN_ATTENTE').length;
                this.applyFilters();
                this._changeDetectorRef.markForCheck();
            });
        
        this._academyService.bulletins$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(bulletins => {
                this.bulletins = bulletins || [];
                this._changeDetectorRef.markForCheck();
            });
        
        this._academyService.employes$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(employes => {
                this.employes = employes || [];
                this._changeDetectorRef.markForCheck();
            });
        
        this._academyService.stats$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(stats => {
                this.stats = stats;
                this._changeDetectorRef.markForCheck();
            });
        
        this.loadAlertes();

        // S'abonner aux notifications WebSocket
        this.notificationService.getNotifications().subscribe((notification: any) => {
            if (notification.type === 'NOUVELLE_DEMANDE') {
                this.toastr.info(notification.message, '📋 Nouvelle demande de congé', {
                    timeOut: 5000,
                    positionClass: 'toast-top-right',
                    closeButton: true
                });
                this.loadData();
            }
        });
    }
    
    ngOnDestroy(): void {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
        this.notificationService.disconnect();
    }
    
    loadData(): void {
        this._academyService.loadAdminData();
    }
    
    refreshData(): void {
        this.loadData();
        this.loadAlertes();
    }
    
    loadAlertes(): void {
        const managerId = "69c9c83763d00230b5311df9";
        
        this._academyService.detecterTendances(managerId).subscribe({
            next: (result) => {
                console.log('Alertes reçues du backend:', result);
                this.alertes = result.alertes || [];
                console.log('Alertes après affectation:', this.alertes);
                this._changeDetectorRef.markForCheck();
            },
            error: (err) => {
                console.error('Erreur chargement alertes:', err);
                this.alertes = [];
                this._changeDetectorRef.markForCheck();
            }
        });
    }
    
    onTabChange(index: number): void {
        if (index === 0 && this.demandes.length === 0) this.loadData();
        if (index === 1 && this.bulletins.length === 0) this.loadData();
        if (index === 2 && this.employes.length === 0) this.loadData();
    }
    
    goToDemandes(): void {
        if (this.adminTabs) {
            this.adminTabs.selectedIndex = 0;
        }
    }
    
    setFiltreStatut(statut: string): void {
        this.filtreStatut = statut;
        this.applyFilters();
    }
    
    searchDemandes(event: Event): void {
        this.searchQuery = (event.target as HTMLInputElement).value;
        this.applyFilters();
    }
    
    applyFilters(): void {
        let filtered = [...this.demandes];
        if (this.filtreStatut !== 'all') {
            filtered = filtered.filter(d => d.statut === this.filtreStatut);
        }
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            filtered = filtered.filter(d => 
                this.getEmployeNom(d.employeId).toLowerCase().includes(query) ||
                d.motif?.toLowerCase().includes(query) ||
                d.type?.toLowerCase().includes(query)
            );
        }
        this.demandesFiltrees = filtered;
        this._changeDetectorRef.markForCheck();
    }
    
    openValidationDialog(demande: DemandeConge, decision: 'APPROUVE' | 'REFUSE'): void {
        const dialogRef = this._dialog.open(ValidateCongeDialogComponent, {
            width: '500px',
            data: { demande, decision }
        });

        dialogRef.afterClosed().subscribe(result => {
            console.log('Dialogue fermé, résultat:', result);
            if (result === true) {
                this.loadData();
                this.loadAlertes();
                const message = decision === 'APPROUVE' 
                    ? '✅ Demande approuvée avec succès' 
                    : '❌ Demande refusée';
                this.toastr.success(message, 'Succès');
            }
        });
    }
    
    openCreateBulletinDialog(): void {
        const dialogRef = this._dialog.open(CreateBulletinDialogComponent, {
            width: '600px'
        });
        dialogRef.afterClosed().subscribe(result => {
            if (result) this.loadData();
        });
    }
    
    viewBulletinDetail(bulletin: BulletinSalaire): void {
        this._dialog.open(BulletinDetailDialogComponent, {
            width: '550px',
            data: bulletin
        });
    }
    
    deleteBulletin(id: string, mois?: number, annee?: number): void {
        const dialogRef = this._dialog.open(ConfirmDialogComponent, {
            width: '400px',
            data: {
                message: 'Supprimer ce bulletin de salaire ?',
                details: mois && annee ? `Bulletin de ${this.getMoisLabel(mois)} ${annee}` : 'Cette action est irréversible.'
            }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this._academyService.supprimerBulletin(id).subscribe(() => {
                    this.loadData();
                });
            }
        });
    }
    
    editBulletin(bulletin: BulletinSalaire): void {
        const dialogRef = this._dialog.open(EditBulletinDialogComponent, {
            width: '550px',
            data: { bulletin }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.loadData();
            }
        });
    }
    
    viewSoldeConge(employeId: string): void {
        this._academyService.getSoldeConge(employeId).subscribe({
            next: (solde) => {
                this._dialog.open(SoldeCongeDialogComponent, {
                    width: '400px',
                    data: solde
                });
            },
            error: (err) => {
                console.error('Erreur chargement solde:', err);
                this._dialog.open(SoldeCongeDialogComponent, {
                    width: '400px',
                    data: {
                        employeId: employeId,
                        annee: new Date().getFullYear(),
                        joursTotal: 30,
                        joursUtilises: 0,
                        joursEnAttente: 0,
                        joursRestants: 30
                    }
                });
            }
        });
    }
    
    getEmployeNom(employeId: string): string {
        const employe = this.employes.find(e => e.id === employeId);
        return employe ? `${employe.prenom} ${employe.nom}` : employeId.substring(0, 8);
    }
    
    getMoisLabel(mois: number): string {
        const moisLabels = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
        return moisLabels[mois - 1] || `${mois}`;
    }
    
    getStatutLabel(statut: string): string {
        const labels: Record<string, string> = {
            'EN_ATTENTE': 'En attente',
            'APPROUVE': 'Approuvé',
            'REFUSE': 'Refusé',
            'ANNULE': 'Annulé'
        };
        return labels[statut] || statut;
    }
    
    getStatutClass(statut: string): string {
        const classes: Record<string, string> = {
            'EN_ATTENTE': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
            'APPROUVE': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
            'REFUSE': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
            'ANNULE': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
        };
        return classes[statut] || '';
    }
    
    getTypeCongeLabel(type: string): string {
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

    telechargerPDF(id: string): void {
        console.log('📄 Téléchargement PDF pour bulletin:', id);
        this._academyService.telechargerPDF(id).subscribe({
            next: (blob: Blob) => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `bulletin_${id}.pdf`;
                a.click();
                window.URL.revokeObjectURL(url);
            },
            error: (err) => {
                console.error('Erreur téléchargement PDF:', err);
                alert('Erreur lors du téléchargement du PDF');
            }
        });
    }

    getDocumentUrl(fileName: string): string {
        if (!fileName) return '';
        return `http://localhost:8081/api/uploads/${fileName}`;
    }

    loadPrediction(): void {
        this._academyService.getPredictionCharge().subscribe({
            next: (prediction) => {
                this.prediction = prediction;
                this._changeDetectorRef.markForCheck();
            },
            error: (err) => {
                console.error('Erreur chargement prédiction:', err);
            }
        });
    }

    getRiskColor(percentage: number): string {
        if (percentage >= 80) return 'linear-gradient(90deg, #ef4444, #dc2626)';
        if (percentage >= 60) return 'linear-gradient(90deg, #f97316, #ea580c)';
        if (percentage >= 40) return 'linear-gradient(90deg, #eab308, #ca8a04)';
        return 'linear-gradient(90deg, #22c55e, #16a34a)';
    }

    genererDonneesSynthetiques(): void {
        this._academyService.genererDonneesSynthetiques().subscribe({
            next: (result) => {
                console.log('Résultat génération:', result);
                alert(result);
                this.loadPrediction();
                this.loadData();
            },
            error: (err) => {
                console.error('Erreur:', err);
                alert('Erreur lors de la génération des données');
            }
        });
    }
}