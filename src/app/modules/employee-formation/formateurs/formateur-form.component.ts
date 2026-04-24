import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormateurService } from './formateur.service';
import { EmployeService } from '../services/employe.service';
import { Formateur, Employe } from '../models/formateur.model';
import { DialogService } from '../../../core/services/dialog.service';

@Component({
    selector: 'app-formateur-form',
    templateUrl: './formateur-form.component.html',
    styleUrls: ['./formateur-form.component.scss']
})
export class FormateurFormComponent implements OnInit {
    formateurForm!: FormGroup;
    isEdit = false;
    employes: Employe[] = [];
    filteredEmployes: Employe[] = [];
    isLoadingEmployes = false;
    isLoading = false;
    searchEmployeTerm = '';
    showEmployeDropdown = false;

    specialites: string[] = [
        'Java/Spring Boot', 'Angular/TypeScript', 'React/JavaScript',
        'Python/Django', 'DevOps', 'Data Science', 'Management',
        'Soft Skills', 'Sécurité', 'Cloud Computing',
        'Mobile Development', 'UI/UX Design', 'Base de données',
        'Architecture logicielle'
    ];

    constructor(
        private fb: FormBuilder,
        private formateurService: FormateurService,
        private employeService: EmployeService,
        private dialogRef: MatDialogRef<FormateurFormComponent>,
        private dialogService: DialogService,
        @Inject(MAT_DIALOG_DATA) public data: Formateur
    ) {
        this.isEdit = !!data;
        this.initForm();
    }

    ngOnInit(): void {
        this.loadEmployes();
        if (this.isEdit && this.data) {
            this.populateFormForEdit();
        }
    }

    initForm(): void {
        this.formateurForm = this.fb.group({
            employeId:  ['', Validators.required],
            nom:        ['', [Validators.required, Validators.minLength(2)]],
            prenom:     ['', [Validators.required, Validators.minLength(2)]],
            email:      ['', [Validators.required, Validators.email]],
            telephone:  [''],
            specialite: ['', Validators.required],
            bio:        ['', Validators.maxLength(500)],
            photo:      [''],
            status:     ['ACTIF', Validators.required]
        });
    }

    populateFormForEdit(): void {
        this.formateurForm.patchValue({
            employeId:  this.data.employeId,
            nom:        this.data.nom,
            prenom:     this.data.prenom,
            email:      this.data.email,
            telephone:  this.data.telephone  || '',
            specialite: this.data.specialite,
            bio:        this.data.bio        || '',
            photo:      this.data.photo      || '',
            status:     this.data.status     || 'ACTIF'
        });

        const prenom = this.data.prenom || '';
        const nom    = this.data.nom    || '';
        if (nom || prenom) {
            this.searchEmployeTerm = `${prenom} ${nom} (${this.data.email})`.trim();
        }
    }

    loadEmployes(): void {
        this.isLoadingEmployes = true;
        this.employeService.getEmployes().subscribe({
            next: (employes) => {
                console.log('Employés reçus:', employes);
                if (employes && employes.length > 0) {
                    console.log('Premier employé:', employes[0]);
                }
                // Filtrer les employés qui ne sont pas déjà formateurs
                this.employes = employes.filter(emp =>
                    emp.role !== 'FORMATEUR' && emp.status === 'ACTIF'
                );
                this.filteredEmployes = [...this.employes];
                this.isLoadingEmployes = false;
            },
            error: (err) => {
                console.error('Erreur chargement employés', err);
                this.dialogService.alert({
                    title: 'Erreur',
                    message: 'Impossible de charger la liste des employés.',
                    type: 'error',
                    confirmText: 'Fermer'
                });
                this.isLoadingEmployes = false;
            }
        });
    }

    // ✅ CORRECTION IMPORTANTE: Récupérer le nom correctement
    private getNom(employe: Employe): string {
        // Essayer lastName d'abord, puis nom
        if (employe.lastName) return employe.lastName;
        if ((employe as any).nom) return (employe as any).nom;
        return '';
    }

    // ✅ CORRECTION IMPORTANTE: Récupérer le prénom correctement
    private getPrenom(employe: Employe): string {
        // Essayer firstName d'abord, puis prenom
        if (employe.firstName) return employe.firstName;
        if ((employe as any).prenom) return (employe as any).prenom;
        return '';
    }

    filterEmployes(): void {
        if (!this.searchEmployeTerm) {
            this.filteredEmployes = [...this.employes];
        } else {
            const term = this.searchEmployeTerm.toLowerCase();
            this.filteredEmployes = this.employes.filter(emp => {
                const nom = this.getNom(emp).toLowerCase();
                const prenom = this.getPrenom(emp).toLowerCase();
                const email = (emp.email || '').toLowerCase();
                const dept = (emp.department || '').toLowerCase();
                return nom.includes(term) || prenom.includes(term) || email.includes(term) || dept.includes(term);
            });
        }
    }

    onEmployeSelect(employe: Employe): void {
        const nom    = this.getNom(employe);
        const prenom = this.getPrenom(employe);

        console.log('Employé sélectionné:', employe);
        console.log('Nom extrait:', nom);
        console.log('Prénom extrait:', prenom);
        console.log('Email:', employe.email);

        // ✅ Vérification que les valeurs ne sont pas vides
        if (!nom || !prenom) {
            this.dialogService.alert({
                title: 'Erreur',
                message: `L'employé sélectionné n'a pas de nom/prénom valide.`,
                type: 'error',
                confirmText: 'Fermer'
            });
            return;
        }

        this.formateurForm.patchValue({
            employeId: employe.id,
            nom:       nom,
            prenom:    prenom,
            email:     employe.email || '',
            telephone: employe.telephone || ''
        });

        // ✅ Forcer la validation
        this.formateurForm.get('employeId')?.updateValueAndValidity();
        this.formateurForm.get('nom')?.updateValueAndValidity();
        this.formateurForm.get('prenom')?.updateValueAndValidity();
        this.formateurForm.get('email')?.updateValueAndValidity();

        this.searchEmployeTerm   = `${prenom} ${nom} (${employe.email})`.trim();
        this.filteredEmployes    = [];
        this.showEmployeDropdown = false;
    }

    clearEmployeSelection(): void {
        this.formateurForm.patchValue({
            employeId: '',
            nom:       '',
            prenom:    '',
            email:     '',
            telephone: ''
        });
        this.formateurForm.updateValueAndValidity();
        this.searchEmployeTerm   = '';
        this.filteredEmployes    = [...this.employes];
        this.showEmployeDropdown = true;
    }

    onBlur(): void {
        setTimeout(() => {
            this.showEmployeDropdown = false;
        }, 200);
    }

    onFocus(): void {
        if (this.searchEmployeTerm) {
            this.filterEmployes();
        } else {
            this.filteredEmployes    = [...this.employes];
            this.showEmployeDropdown = this.filteredEmployes.length > 0;
        }
    }

    get isFormReady(): boolean {
        if (this.isEdit) {
            return this.formateurForm.get('specialite')?.valid === true &&
                   this.formateurForm.get('status')?.valid === true;
        }
        return !!this.formateurForm.get('employeId')?.value &&
               !!this.formateurForm.get('nom')?.value &&
               !!this.formateurForm.get('prenom')?.value &&
               !!this.formateurForm.get('email')?.value &&
               this.formateurForm.get('specialite')?.valid === true &&
               this.formateurForm.get('status')?.valid === true;
    }

    onSubmit(): void {
        if (!this.isFormReady) {
            let message = '';
            if (!this.isEdit && !this.formateurForm.get('employeId')?.value) {
                message = 'Veuillez sélectionner un employé.';
            } else if (!this.formateurForm.get('nom')?.value) {
                message = 'Le nom est requis.';
            } else if (!this.formateurForm.get('prenom')?.value) {
                message = 'Le prénom est requis.';
            } else if (!this.formateurForm.get('specialite')?.value) {
                message = 'Veuillez sélectionner une spécialité.';
            } else {
                message = 'Veuillez remplir tous les champs obligatoires.';
            }
            
            this.dialogService.alert({
                title: 'Formulaire incomplet',
                message: message,
                type: 'warning',
                confirmText: 'OK'
            });
            return;
        }

        const formValue = this.formateurForm.value;

        const formateurData: Partial<Formateur> = {
            employeId:  formValue.employeId,
            nom:        formValue.nom,
            prenom:     formValue.prenom,
            email:      formValue.email,
            telephone:  formValue.telephone,
            specialite: formValue.specialite,
            bio:        formValue.bio,
            photo:      formValue.photo,
            status:     formValue.status
        };

        console.log('📤 Données à envoyer:', formateurData);
        this.isLoading = true;

        if (this.isEdit && this.data) {
            this.formateurService.updateFormateur(this.data.id, formateurData).subscribe({
                next: () => {
                    this.dialogService.alert({
                        title: 'Succès',
                        message: 'Formateur modifié avec succès.',
                        type: 'success',
                        confirmText: 'Fermer'
                    });
                    this.dialogRef.close(true);
                    this.isLoading = false;
                },
                error: (err) => {
                    console.error('Erreur mise à jour', err);
                    this.isLoading = false;
                    this.dialogService.alert({
                        title: 'Erreur',
                        message: err.error?.message || 'Impossible de modifier le formateur.',
                        type: 'error',
                        confirmText: 'Fermer'
                    });
                }
            });
        } else {
            this.formateurService.createFormateur(formateurData).subscribe({
                next: () => {
                    this.dialogService.alert({
                        title: 'Succès',
                        message: 'Formateur créé avec succès.',
                        type: 'success',
                        confirmText: 'Fermer'
                    });
                    this.dialogRef.close(true);
                    this.isLoading = false;
                },
                error: (err) => {
                    console.error('Erreur création', err);
                    this.isLoading = false;
                    this.dialogService.alert({
                        title: 'Erreur',
                        message: err.error?.message || 'Impossible de créer le formateur.',
                        type: 'error',
                        confirmText: 'Fermer'
                    });
                }
            });
        }
    }

    onCancel(): void {
        this.dialogRef.close();
    }

    getErrorMessage(controlName: string): string {
        const control = this.formateurForm.get(controlName);
        if (control?.hasError('required')) return 'Ce champ est requis';
        if (control?.hasError('minlength')) {
            return `Minimum ${control.errors?.['minlength'].requiredLength} caractères`;
        }
        if (control?.hasError('email')) return 'Email invalide';
        return '';
    }
}