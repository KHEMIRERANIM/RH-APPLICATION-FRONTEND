import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatTabGroup } from '@angular/material/tabs';
import { Subject, takeUntil } from 'rxjs';
import { AcademyService } from '../academy.service';
import { 
    DemandeConge, 
    BulletinSalaire, 
    User, 
    AlerteTendance, 
    AdminStats,
    StatutConge,
    TypeConge
} from '../academy.types';

@Component({
    selector: 'academy-dashboard',
    templateUrl: './dashboard.component.html',
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AcademyDashboardComponent implements OnInit, OnDestroy {
    
    @ViewChild('adminTabs') adminTabs: MatTabGroup;
    
    demandes: DemandeConge[] = [];
    demandesFiltrees: DemandeConge[] = [];
    bulletins: BulletinSalaire[] = [];
    employes: User[] = [];
    alertes: AlerteTendance[] = [];
    stats: AdminStats | null = null;
    
    filtreStatut: string = 'all';
    searchQuery: string = '';
    demandesEnAttenteCount: number = 0;
    
    private _unsubscribeAll: Subject<any> = new Subject();

    constructor(
        private _academyService: AcademyService,
        private _changeDetectorRef: ChangeDetectorRef,
        private _dialog: MatDialog
    ) {}

    ngOnInit(): void {
        this.loadData();
        
        // Subscribe to data changes
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
        
        // Load alerts
        this.loadAlertes();
    }
    
    ngOnDestroy(): void {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }
    
    loadData(): void {
        this._academyService.loadAdminData();
    }
    
    refreshData(): void {
        this.loadData();
        this.loadAlertes();
    }
    
    loadAlertes(): void {
        this._academyService.detecterTendances().subscribe(result => {
            this.alertes = result.alertes || [];
            this._changeDetectorRef.markForCheck();
        });
    }
    
    onTabChange(index: number): void {
        if (index === 0 && this.demandes.length === 0) {
            this.loadData();
        }
        if (index === 1 && this.bulletins.length === 0) {
            this.loadData();
        }
        if (index === 2 && this.employes.length === 0) {
            this.loadData();
        }
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
        
        // Filter by status
        if (this.filtreStatut !== 'all') {
            filtered = filtered.filter(d => d.statut === this.filtreStatut);
        }
        
        // Filter by search query
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
        const commentaire = prompt(
            decision === 'APPROUVE' 
                ? 'Ajouter un commentaire (optionnel) :' 
                : 'Motif du refus :'
        );
        
        this._academyService.validerDemande(demande.id, {
            statut: decision as StatutConge,
            commentaireManager: commentaire || ''
        }).subscribe(() => {
            this.loadData();
            this.loadAlertes();
        });
    }
    
    openCreateBulletinDialog(): void {
        // TODO: Implémenter un dialogue modal pour création de bulletin
        alert('Fonctionnalité de création de bulletin à implémenter');
    }
    
    viewBulletinDetail(bulletin: BulletinSalaire): void {
        // TODO: Implémenter un dialogue modal pour afficher les détails
        const details = `
        Détails du bulletin - ${this.getMoisLabel(bulletin.mois)} ${bulletin.annee}
        
        Salaire brut: ${bulletin.salaireBrut} TND
        Primes: ${bulletin.primes} TND
        Heures supp.: ${bulletin.heuresSupplementaires} TND
        CNSS: ${bulletin.cotisationsCNSS} TND
        IRPP: ${bulletin.irpp} TND
        Autres retenues: ${bulletin.autresRetenues} TND
        ----------------------------------------
        Salaire NET: ${bulletin.salaireNet} TND
        `;
        alert(details);
    }
    
    deleteBulletin(id: string): void {
        if (confirm('Supprimer ce bulletin de salaire ? Cette action est irréversible.')) {
            this._academyService.supprimerBulletin(id).subscribe(() => {
                this.loadData();
            });
        }
    }
    
    viewSoldeConge(employeId: string): void {
        this._academyService.getSoldeConge(employeId).subscribe(solde => {
            const employe = this.getEmployeNom(employeId);
            alert(`
            Solde de congés - ${employe}
            Année: ${solde.annee}
            Total annuel: ${solde.joursTotal} jours
            Utilisés: ${solde.joursUtilises} jours
            En attente: ${solde.joursEnAttente} jours
            Restants: ${solde.joursRestants} jours
            `);
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
            'CONGE_ANNUEL': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
            'CONGE_MALADIE': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
            'CONGE_MATERNITE': 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
            'CONGE_PATERNITE': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
            'CONGE_SANS_SOLDE': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
            'AUTRE': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
        };
        return classes[type] || 'bg-gray-100 text-gray-800';
    }
}