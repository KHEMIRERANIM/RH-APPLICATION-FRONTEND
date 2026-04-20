import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { FuseConfirmationService } from '@fuse/services/confirmation';

export interface UserItem {
    id: string;
    nom: string;
    prenom: string;
    email: string;
    telephone: string;
    role: string;
    status: string;
    departement: string;
    poste: string;
    photoUrl: string;
    managerId: string;
    adresse?: string;
    createdAt?: Date;
}

@Component({
    selector: 'app-team-admin',
    templateUrl: './team-admin.component.html'
})
export class TeamAdminComponent implements OnInit {
    
    // ========== DONNÉES ==========
    originalData: UserItem[] = [];
    filteredData: UserItem[] = [];
    
    uniqueDepartmentsCount: number = 0;
    uniqueJobTitlesCount: number = 0;
    
    // ========== FORMULAIRE ==========
    showForm: boolean = false;
    isEditMode: boolean = false;
    userFormValue: any = {
        id: null,
        email: '',
        password: '',
        nom: '',
        prenom: '',
        telephone: '',
        address: '',
        photoUrl: '',
        departement: '',
        poste: '',
        role: 'EMPLOYE',
        status: 'ACTIF'
    };
    
    // ========== FILTRES ==========
    searchTerm: string = '';
    selectedRole: string = '';
    selectedStatus: string = '';
    
    // ========== STATISTIQUES ==========
    totalUsers: number = 0;
    activeUsers: number = 0;
    
    // ========== PAGINATION ==========
    currentPage: number = 0;
    pageSize: number = 10;
    totalPages: number = 0;
    
    // ========== UPLOAD ==========
    selectedFile: File | null = null;
    imagePreview: string | null = null;
    uploading: boolean = false;
    
    constructor(
        private http: HttpClient,
        private toastr: ToastrService,
        private _fuseConfirmationService: FuseConfirmationService
    ) {}
    
    ngOnInit(): void {
        this.loadUsers();
    }
    
    // ========== CHARGEMENT ==========
    
    loadUsers(): void {
        this.http.get<UserItem[]>('http://10.188.81.174:8081/api/users')
            .subscribe({
                next: (data) => {
                    this.originalData = data;
                    this.filteredData = data;
                    this.updatePagination();
                    
                    this.totalUsers = data.length;
                    this.activeUsers = data.filter(e => e.status === 'ACTIF').length;
                    
                    // Calcul dynamique des KPIs
                    const uniqueDepts = new Set(data.map(e => e.departement).filter(d => Boolean(d)));
                    this.uniqueDepartmentsCount = uniqueDepts.size;
                    
                    const uniqueJobs = new Set(data.map(e => e.poste).filter(p => Boolean(p)));
                    this.uniqueJobTitlesCount = uniqueJobs.size;
                    
                    this.toastr.info(`${data.length} membres chargés`, 'Info');
                },
                error: () => {
                    this.toastr.error('Erreur chargement de l\'équipe', 'Erreur');
                }
            });
    }
    
    // ========== PAGINATION ==========
    
    updatePagination(): void {
        const start = this.currentPage * this.pageSize;
        const end = start + this.pageSize;
        this.filteredData = this.originalData.slice(start, end);
        this.totalPages = Math.ceil(this.originalData.length / this.pageSize);
    }
    
    previousPage(): void {
        if (this.currentPage > 0) {
            this.currentPage--;
            this.updatePagination();
        }
    }
    
    nextPage(): void {
        if (this.currentPage < this.totalPages - 1) {
            this.currentPage++;
            this.updatePagination();
        }
    }
    
    // ========== FILTRES ==========
    
    applyFilter(): void {
        const filtered = this.originalData.filter(u => {
            const searchLower = this.searchTerm?.toLowerCase();
            const matchesSearch = !this.searchTerm || 
                u.prenom?.toLowerCase().includes(searchLower) ||
                u.nom?.toLowerCase().includes(searchLower) ||
                u.email?.toLowerCase().includes(searchLower);
            
            const matchesRole = !this.selectedRole || u.role === this.selectedRole;
            const matchesStatus = !this.selectedStatus || u.status === this.selectedStatus;
            
            return matchesSearch && matchesRole && matchesStatus;
        });
        
        this.filteredData = filtered.slice(0, this.pageSize);
        this.currentPage = 0;
        this.totalPages = Math.ceil(filtered.length / this.pageSize);
    }
    
    resetFilters(): void {
        this.searchTerm = '';
        this.selectedRole = '';
        this.selectedStatus = '';
        this.applyFilter();
    }
    
    // ========== CRUD ==========
    
    openAddForm(): void {
        this.isEditMode = false;
        this.userFormValue = {
            id: null,
            email: '',
            password: '',
            nom: '',
            prenom: '',
            telephone: '',
            adresse: '',
            photoUrl: '',
            departement: '',
            poste: '',
            role: 'EMPLOYE',
            status: 'ACTIF'
        };
        this.imagePreview = null;
        this.selectedFile = null;
        this.showForm = true;
    }
    
    openEditForm(user: UserItem): void {
        this.isEditMode = true;
        this.userFormValue = {
            id: user.id,
            email: user.email || '',
            nom: user.nom,
            prenom: user.prenom,
            telephone: user.telephone || '',
            adresse: user.adresse || '',
            photoUrl: user.photoUrl || '',
            departement: user.departement || '',
            poste: user.poste || '',
            role: user.role || 'EMPLOYE',
            status: user.status || 'ACTIF',
            password: '' // On ne le pré-charge pas
        };
        this.imagePreview = user.photoUrl || null;
        this.selectedFile = null;
        this.showForm = true;
    }
    
    closeForm(): void {
        this.showForm = false;
        this.imagePreview = null;
        this.selectedFile = null;
        this.uploading = false;
    }
    
    // ========== UPLOAD ==========
    
    onFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        
        if (input.files && input.files.length > 0) {
            const file = input.files[0];
            
            if (!file.type.match(/image\/(jpeg|png|gif|jpg)/)) {
                this.toastr.error('Format non supporté. Utilisez JPG, PNG ou GIF', 'Erreur');
                return;
            }
            
            if (file.size > 2 * 1024 * 1024) {
                this.toastr.error('Image trop grande. Maximum 2MB', 'Erreur');
                return;
            }
            
            this.selectedFile = file;
            
            const reader = new FileReader();
            reader.onload = (e: any) => {
                this.imagePreview = e.target.result;
            };
            reader.readAsDataURL(file);
            
            this.toastr.info('Photo sélectionnée', 'Info');
        }
    }
    
    uploadImage(): Promise<string> {
        return new Promise((resolve) => {
            if (!this.selectedFile) {
                resolve(this.userFormValue.photoUrl || '');
                return;
            }
            
            this.uploading = true;
            
            const formData = new FormData();
            formData.append('file', this.selectedFile);
            formData.append('type', 'user_avatar');
            
            this.http.post<{ url: string }>('http://10.188.81.174:8081/api/upload', formData)
                .subscribe({
                    next: (response) => {
                        this.uploading = false;
                        this.toastr.success('Photo téléchargée', 'Succès');
                        resolve(response.url);
                    },
                    error: () => {
                        this.uploading = false;
                        this.toastr.error('Erreur upload photo', 'Erreur');
                        resolve(this.userFormValue.photoUrl || '');
                    }
                });
        });
    }
    
    async saveUser(): Promise<void> {
        if (!this.userFormValue.prenom || !this.userFormValue.nom || !this.userFormValue.email || (!this.isEditMode && !this.userFormValue.password)) {
            this.toastr.warning('Veuillez remplir les champs obligatoires (incluant le mot de passe à la création)', 'Formulaire incomplet');
            return;
        }
        
        try {
            const photoUrl = await this.uploadImage();
            this.userFormValue.photoUrl = photoUrl;
            
            const data = { ...this.userFormValue };
            
            if (this.isEditMode) {
                this.http.put(`http://10.188.81.174:8081/api/users/${data.id}`, data)
                    .subscribe({
                        next: () => {
                            this.toastr.success('Membre modifié avec succès', 'Succès');
                            this.loadUsers();
                            this.closeForm();
                        },
                        error: () => {
                            this.toastr.error('Erreur lors de la modification', 'Erreur');
                        }
                    });
            } else {
                this.http.post('http://10.188.81.174:8081/api/users', data)
                    .subscribe({
                        next: () => {
                            this.toastr.success('Membre ajouté avec succès', 'Succès');
                            this.loadUsers();
                            this.closeForm();
                        },
                        error: () => {
                            this.toastr.error('Erreur lors de l\'ajout', 'Erreur');
                        }
                    });
            }
        } catch (error) {
            this.toastr.error('Erreur lors du traitement', 'Erreur');
        }
    }
    
    deleteUser(u: UserItem): void {
        const dialogRef = this._fuseConfirmationService.open({
            title: 'Supprimer membre',
            message: `Êtes-vous sûr de vouloir supprimer ${u.prenom} ${u.nom} ?`,
            icon: { show: true, name: 'heroicons_outline:trash', color: 'warn' },
            actions: { confirm: { label: 'Supprimer', color: 'warn' } }
        });

        dialogRef.afterClosed().subscribe((result) => {
            if (result === 'confirmed') {
                this.http.delete(`http://10.188.81.174:8081/api/users/${u.id}`)
                    .subscribe({
                        next: () => {
                            this.toastr.success('Membre supprimé', 'Succès');
                            this.loadUsers();
                        },
                        error: () => {
                            this.toastr.error('Erreur lors de la suppression', 'Erreur');
                        }
                    });
            }
        });
    }
}
