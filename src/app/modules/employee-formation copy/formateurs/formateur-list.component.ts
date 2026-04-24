// formateurs/formateur-list.component.ts
import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { FormateurService } from './formateur.service';
import { Formateur } from '../models/formateur.model';
import { DialogService } from '../../../core/services/dialog.service';
import { FormateurFormComponent } from './formateur-form.component';

@Component({
    selector: 'app-formateur-list',
    templateUrl: './formateur-list.component.html',
    styleUrls: ['./formateur-list.component.scss']
})
export class FormateurListComponent implements OnInit, AfterViewInit {  // ✅ AJOUTER AfterViewInit
    // ✅ AJOUTER les options static: false
    @ViewChild(MatPaginator, { static: false }) paginator!: MatPaginator;
    @ViewChild(MatSort, { static: false }) sort!: MatSort;

    displayedColumns: string[] = ['photo', 'nom', 'prenom', 'email', 'specialite', 'status', 'formations', 'actions'];
    dataSource = new MatTableDataSource<Formateur>();
    formateurs: Formateur[] = [];
    isLoading = false;
    errorMessage: string = '';
    selectedFormateur: Formateur | null = null;
    
    pagination = {
        length: 0,
        page: 0,
        size: 10
    };

    constructor(
        private formateurService: FormateurService,
        private dialog: MatDialog,
        private dialogService: DialogService
    ) {}

    ngOnInit(): void {
        this.loadFormateurs();
    }

    // ✅ AJOUTER cette méthode
    ngAfterViewInit(): void {
        // Initialiser paginator et sort après la vue
        if (this.paginator) {
            this.dataSource.paginator = this.paginator;
        }
        if (this.sort) {
            this.dataSource.sort = this.sort;
        }
    }

    loadFormateurs(): void {
        this.isLoading = true;
        this.errorMessage = '';
        console.log('🔄 Chargement des formateurs...');
        
        this.formateurService.getFormateurs().subscribe({
            next: (formateurs) => {
                console.log('✅ Formateurs chargés:', formateurs);
                this.formateurs = formateurs;
                this.dataSource.data = formateurs;
                
                // ✅ Réinitialiser paginator et sort après chargement des données
                setTimeout(() => {
                    if (this.paginator) {
                        this.dataSource.paginator = this.paginator;
                    }
                    if (this.sort) {
                        this.dataSource.sort = this.sort;
                    }
                });
                
                this.pagination.length = formateurs.length;
                this.isLoading = false;
            },
            error: (err) => {
                console.error('❌ Erreur détaillée:', err);
                this.errorMessage = err.message || 'Impossible de charger les formateurs.';
                this.isLoading = false;
                
                this.dialogService.alert({
                    title: 'Erreur de chargement',
                    message: `${this.errorMessage}\n\nVérifiez que le backend est démarré.`,
                    type: 'error',
                    confirmText: 'Fermer'
                });
            }
        });
    }

    applyFilter(event: Event): void {
        const filterValue = (event.target as HTMLInputElement).value;
        this.dataSource.filter = filterValue.trim().toLowerCase();
        if (this.dataSource.paginator) {
            this.dataSource.paginator.firstPage();
        }
    }

    openFormateurDialog(formateur?: Formateur): void {
        const dialogRef = this.dialog.open(FormateurFormComponent, {
            width: '650px',
            maxWidth: '90vw',
            data: formateur
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.loadFormateurs();
            }
        });
    }

    async deleteFormateur(formateur: Formateur): Promise<void> {
        const confirmed = await this.dialogService.confirm({
            title: 'Confirmer la suppression',
            message: `Êtes-vous sûr de vouloir supprimer le formateur "${formateur.prenom} ${formateur.nom}" ?\n\nCette action est irréversible.`,
            confirmText: 'Supprimer',
            cancelText: 'Annuler',
            type: 'error'
        }).toPromise();

        if (confirmed) {
            this.formateurService.deleteFormateur(formateur.id).subscribe({
                next: () => {
                    this.loadFormateurs();
                    this.dialogService.alert({
                        title: 'Succès',
                        message: 'Formateur supprimé avec succès.',
                        type: 'success',
                        confirmText: 'Fermer'
                    });
                },
                error: (err) => {
                    console.error('Erreur suppression', err);
                    this.dialogService.alert({
                        title: 'Erreur',
                        message: 'Impossible de supprimer le formateur.',
                        type: 'error',
                        confirmText: 'Fermer'
                    });
                }
            });
        }
    }

    toggleDetails(formateurId: string): void {
        if (this.selectedFormateur?.id === formateurId) {
            this.selectedFormateur = null;
        } else {
            this.selectedFormateur = this.formateurs.find(f => f.id === formateurId) || null;
        }
    }

    getFormationsCount(formateur: Formateur): number {
        return formateur.formationsAssignees?.length || 0;
    }

    getStatusClass(status: string): string {
        return status === 'ACTIF' ? 'status-active' : 'status-inactive';
    }

    getStatusColor(status: string): string {
        return status === 'ACTIF' ? 'text-green-600' : 'text-red-600';
    }

    getStatusDotColor(status: string): string {
        return status === 'ACTIF' ? 'bg-green-500' : 'bg-red-500';
    }

    retry(): void {
        this.loadFormateurs();
    }

    trackByFn(index: number, item: Formateur): string {
        return item.id;
    }
}