import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ApexOptions } from 'ng-apexcharts';
import { ProjectService } from 'app/modules/admin/dashboards/project/project.service';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { UserService } from 'app/core/user/user.service';
import { FuseConfirmationService } from '@fuse/services/confirmation';

@Component({
    selector: 'project',
    templateUrl: './project.component.html',
    styleUrls: ['./project.component.css'],
    encapsulation: ViewEncapsulation.None
    //changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProjectComponent implements OnInit, OnDestroy {
    chartGithubIssues: ApexOptions = {};
    chartTaskDistribution: ApexOptions = {};
    chartBudgetDistribution: ApexOptions = {};
    chartWeeklyExpenses: ApexOptions = {};
    chartMonthlyExpenses: ApexOptions = {};
    chartYearlyExpenses: ApexOptions = {};
    private _platNamesMap: Map<string, string> = new Map();
    data: any;
    selectedProject: string = 'ACME Corp. Backend App';
    isAdmin: boolean = false;
    loggedUser: any = null;
    viewMode: string = 'tableau';
    selectedExpensePeriod: string = 'weekly';
    private _unsubscribeAll: Subject<any> = new Subject<any>();

    // ========== PROPRIÉTÉS POUR LA GESTION DES EMPLOYÉS ==========

    // Données
    originalData: any[] = [];
    filteredData: any[] = [];
    departments: any[] = [];
    jobTitles: any[] = [];
    managers: any[] = [];

    // Formulaire
    showForm: boolean = false;
    isEditMode: boolean = false;
    employeeFormValue: any = {
        id: null,
        nom: '',
        prenom: '',
        email: '',
        password: '',
        role: 'EMPLOYE',
        status: 'ACTIF',
        departement: '',
        poste: '',
        managerId: '',
        photoUrl: '',
        dateEmbauche: new Date().toISOString().split('T')[0],
        telephone: '',
        adresse: '',
        birthDate: ''
    };

    // Filtres
    searchTerm: string = '';
    selectedDepartment: string = '';
    selectedStatus: string = '';
    selectedRole: string = '';

    // Statistiques
    totalEmployees: number = 0;
    activeEmployees: number = 0;
    totalDepartments: number = 0;
    totalPositions: number = 0;

    currentPage: number = 0;
    pageSize: number = 10;
    totalPages: number = 0;

    // Real Stats
    congesEnAttente: number = 0;
    congesValidesSemaine: number = 0;
    offresOuvertes: number = 0;
    recrutementsPourvusMois: number = 0;
    formationsDisponibles: number = 0;
    formationsCompleteesMois: number = 0;

    // New Module Stats
    totalTrajets: number = 0;
    totalReservationsTransport: number = 0;
    totalAvantages: number = 0;
    totalCommandesRestaurant: number = 0;
    totalMobilityRequests: number = 0;

    // Chart options for new modules
    chartAvantages: ApexOptions = {};
    chartRestaurant: ApexOptions = {};
    chartCareer: ApexOptions = {};
    chartTransport: ApexOptions = {};

    // Empty state flags
    restaurantEmpty: boolean = false;
    transportEmpty: boolean = false;
    avantagesEmpty: boolean = false;

    // Upload
    selectedFile: File | null = null;
    imagePreview: string | null = null;
    uploading: boolean = false;

    // Anciennes propriétés (pour compatibilité)
    members: any[] = [];
    filteredMembers: any[] = [];
    currentMember: any = {
        id: null,
        name: '',
        email: '',
        title: '',
        role: 'EMPLOYEE',
        phone: '',
        avatar: ''
    };

    constructor(
        private _projectService: ProjectService,
        private _router: Router,
        private _http: HttpClient,
        private toastr: ToastrService,
        private _userService: UserService,
        private _fuseConfirmationService: FuseConfirmationService
    ) { }

    ngOnInit(): void {
        const userStr = localStorage.getItem('currentUser');
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                this.loggedUser = user;
                this.isAdmin = user.role === 'ADMIN' || user.role === 'admin';
                if (this.isAdmin && (!this.originalData || this.originalData.length === 0)) {
                    this.loadEmployees();
                }
            } catch (e) { }
        }

        // Get the data
        this._projectService.data$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((data) => {
                this.data = data;
                this._prepareChartData();
            });

        // Attach SVG fill fixer to all ApexCharts
        window['Apex'] = {
            chart: {
                events: {
                    mounted: (chart: any, options?: any): void => {
                        this._fixSvgFill(chart.el);
                    },
                    updated: (chart: any, options?: any): void => {
                        this._fixSvgFill(chart.el);
                    }
                }
            }
        };

        this.fetchRealStats();
    }

    // Ajoute cette méthode
    onTabChange(event: any): void {
        if (event.tab.textLabel === 'Équipe' && this.isAdmin && (!this.originalData || this.originalData.length === 0)) {
            this.loadAllData();
        }
    }

    setExpensePeriod(period: string): void {
        this.selectedExpensePeriod = period;
    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    trackByFn(index: number, item: any): any {
        return item.id || index;
    }

    fetchRealStats(): void {
        // ... (Existing Congés, Recrutement, Formations calls remain here or are updated below)

        // Congés
        this._http.get<any[]>('/api/conges').subscribe({
            next: (data) => {
                if (data) {
                    this.congesEnAttente = data.filter(c => c.statut === 'EN_ATTENTE').length;
                    this.congesValidesSemaine = data.filter(c => c.statut === 'ACCEPTE').length;

                    const statusCounts = {
                        'EN_ATTENTE': data.filter(c => c.statut === 'EN_ATTENTE').length,
                        'ACCEPTE': data.filter(c => c.statut === 'ACCEPTE').length,
                        'REFUSE': data.filter(c => c.statut === 'REFUSE').length
                    };

                    this.chartTaskDistribution.series = [statusCounts.EN_ATTENTE, statusCounts.ACCEPTE, statusCounts.REFUSE];
                    this.chartTaskDistribution.labels = ['En attente', 'Acceptés', 'Refusés'];
                }
            },
            error: () => { }
        });

        // Recrutements
        this._http.get<any[]>('/api/recrutement/offres').subscribe({
            next: (data) => {
                if (data && data.length > 0) {
                    this.offresOuvertes = data.length;
                    this.recrutementsPourvusMois = Math.floor(data.length * 0.3);

                    const contratCounts: any = {};
                    data.forEach(o => {
                        const type = o.typeContrat || 'AUTRE';
                        contratCounts[type] = (contratCounts[type] || 0) + 1;
                    });

                    this.chartBudgetDistribution = {
                        chart: { type: 'bar', height: 350, toolbar: { show: false } },
                        colors: ['#3B82F6'],
                        plotOptions: {
                            bar: {
                                horizontal: true, borderRadius: 6, barHeight: '55%',
                                dataLabels: { position: 'top' }
                            }
                        },
                        dataLabels: {
                            enabled: true, offsetX: 20,
                            style: { fontSize: '12px', colors: ['#334155'] }
                        },
                        series: [{ name: 'Offres', data: Object.values(contratCounts) as number[] }],
                        xaxis: {
                            categories: Object.keys(contratCounts),
                            labels: { style: { colors: '#64748B' } }
                        },
                        grid: { borderColor: '#E2E8F0', strokeDashArray: 4 },
                        tooltip: { theme: 'light' }
                    };
                }
            },
            error: () => { }
        });

        // Formations
        this._http.get<any[]>('/api/formations/disponibles').subscribe({
            next: (data) => {
                if (data) {
                    this.formationsDisponibles = data.length;
                    const typeCounts: any = {};
                    data.forEach(f => {
                        const type = f.type || 'AUTRE';
                        typeCounts[type] = (typeCounts[type] || 0) + 1;
                    });

                    this.chartWeeklyExpenses.series = [{
                        name: 'Formations',
                        data: Object.values(typeCounts) as number[]
                    }];
                    this.chartWeeklyExpenses.xaxis = {
                        categories: Object.keys(typeCounts)
                    };
                }
            },
            error: () => { }
        });

        // --- NEW MODULES ---

        // Transport
        this._http.get<any[]>('/api/trajets').subscribe({
            next: (data) => {
                if (data && data.length > 0) {
                    this.transportEmpty = false;
                    this.totalTrajets = data.length;
                    const statusCounts: any = {};
                    data.forEach(t => {
                        const status = t.statut || 'AUTRE';
                        statusCounts[status] = (statusCounts[status] || 0) + 1;
                    });
                    this.chartTransport = {
                        chart: { type: 'pie', height: 300 },
                        labels: Object.keys(statusCounts),
                        series: Object.values(statusCounts) as number[],
                        legend: { position: 'bottom' }
                    };
                } else {
                    this.transportEmpty = true;
                }
            },
            error: () => { this.transportEmpty = true; }
        });

        // Mutuelle / Avantages
        this._http.get<any[]>('/api/avantages/stats/par-categorie').subscribe({
            next: (data: any) => {
                if (data && data.length > 0) {
                    this.avantagesEmpty = false;
                    this.totalAvantages = data.reduce((acc, curr) => acc + (curr.nombreOffres || curr.count || 0), 0);
                    this.chartAvantages = {
                        chart: { type: 'donut', height: 350 },
                        colors: ['#6366F1', '#1E3A8A', '#2563EB', '#7DD3FC', '#0EA5E9'],
                        labels: data.map(d => d.nomCategorie || d.categorie || 'Autre'),
                        series: data.map(d => d.nombreOffres || d.count || 0),
                        legend: { position: 'bottom' },
                        plotOptions: { pie: { donut: { size: '75%', labels: { show: true, total: { show: true, label: 'Total', formatter: () => this.totalAvantages.toString() } } } } }
                    };
                } else {
                    this.avantagesEmpty = true;
                }
            },
            error: () => { this.avantagesEmpty = true; }
        });

        // Restaurant
        this._http.get<any[]>('/api/menus').subscribe({
            next: (menus) => {
                if (menus) {
                    menus.forEach(m => {
                        (m.plats || []).forEach(p => {
                            if (p.platId && p.nom) {
                                this._platNamesMap.set(p.platId, p.nom);
                            }
                        });
                    });
                }

                // Now fetch stats
                this._http.get<any>('/api/commandes/stats/plats').subscribe({
                    next: (data) => {
                        const platIds = data ? Object.keys(data) : [];
                        const counts = data ? Object.values(data) as number[] : [];

                        if (counts.length > 0) {
                            this.restaurantEmpty = false;
                            this.totalCommandesRestaurant = counts.reduce((acc: number, curr: number) => acc + curr, 0);
                            const platNames = platIds.map(id => this._platNamesMap.get(id) || id);
                            this.chartRestaurant = {
                                chart: { type: 'bar', height: 350, toolbar: { show: false } },
                                colors: ['#F59E0B'],
                                plotOptions: { bar: { horizontal: true, borderRadius: 8, barHeight: '60%' } },
                                series: [{ name: 'Commandes', data: counts }],
                                xaxis: { categories: platNames },
                                grid: { borderColor: '#E2E8F0', strokeDashArray: 4 },
                                dataLabels: { enabled: false }
                            };
                        } else {
                            this.restaurantEmpty = true;
                        }
                    },
                    error: () => { this.restaurantEmpty = true; }
                });
            }
        });

        // Carrière
        this._http.get<any[]>('/api/mobility').subscribe({
            next: (data) => {
                if (data && data.length > 0) {
                    this.totalMobilityRequests = data.length;
                    const statusCounts: any = {};
                    data.forEach(r => {
                        const status = r.status || 'AUTRE';
                        statusCounts[status] = (statusCounts[status] || 0) + 1;
                    });

                    const labels = Object.keys(statusCounts);
                    const values = Object.values(statusCounts) as number[];
                    const total = values.reduce((a, b) => a + b, 0);
                    const percentages = values.map(v => Math.round((v / total) * 100));

                    this.chartCareer = {
                        chart: { type: 'radialBar', height: 350 },
                        colors: ['#06B6D4', '#3B82F6', '#6366F1', '#10B981', '#F59E0B'],
                        plotOptions: {
                            radialBar: {
                                offsetY: 0,
                                startAngle: -120,
                                endAngle: 120,
                                hollow: { size: '35%' },
                                dataLabels: {
                                    name: { fontSize: '14px', fontWeight: '600' },
                                    value: {
                                        fontSize: '20px', fontWeight: '700',
                                        formatter: (val: number) => `${val}%`
                                    },
                                    total: {
                                        show: true, label: 'Total',
                                        formatter: () => `${total}`
                                    }
                                },
                                track: { background: '#E2E8F0', strokeWidth: '97%' }
                            }
                        },
                        series: percentages,
                        labels: labels,
                        legend: {
                            show: true, position: 'bottom',
                            markers: { width: 10, height: 10, radius: 5 }
                        }
                    };
                }
            }
        });
    }

    // ========== CHARGEMENT DES DONNÉES ==========

    loadAllData(): void {
        this.loadEmployees();
        //this.loadDepartments();
        //this.loadJobTitles();
        //this.loadManagers();
    }

    loadEmployees(): void {
        this._http.get<any[]>('/api/users')
            .subscribe({
                next: (data) => {
                    this.originalData = data || [];
                    this.filteredData = data || [];
                    this.updatePagination();

                    this.totalEmployees = (data || []).length;
                    this.activeEmployees = (data || []).filter(e => e.status === 'ACTIF').length;

                    const deptsMap: any = {};
                    const depts = new Set();
                    const postes = new Set();

                    (data || []).forEach(u => {
                        if (u.departement && u.departement.trim() !== '') {
                            depts.add(u.departement);
                            deptsMap[u.departement] = (deptsMap[u.departement] || 0) + 1;
                        }
                        if (u.poste && u.poste.trim() !== '') {
                            postes.add(u.poste);
                        }
                    });

                    this.totalDepartments = depts.size;
                    this.totalPositions = postes.size;

                    // Update Employee Distribution Chart (Bar Chart)
                    this.chartGithubIssues.series = [{
                        name: 'Employés',
                        data: Object.values(deptsMap) as number[]
                    }];
                    this.chartGithubIssues.labels = Object.keys(deptsMap);

                    this.toastr?.info(`${this.totalEmployees} utilisateurs chargés`, 'Info');
                },
                error: (err) => {
                    console.error('Erreur:', err);
                    this.totalEmployees = 0;
                    this.activeEmployees = 0;
                    this.totalDepartments = 0;
                    this.totalPositions = 0;
                }
            });
    }

    loadDepartments(): void {
        this._http.get<any[]>('/api/departments')
            .subscribe({
                next: (data) => this.departments = data,
                error: () => console.error('Erreur chargement départements')
            });
    }

    loadJobTitles(): void {
        this._http.get<any[]>('/api/job-titles')
            .subscribe({
                next: (data) => this.jobTitles = data,
                error: () => console.error('Erreur chargement postes')
            });
    }

    loadManagers(): void {
        this._http.get<any[]>('/api/users/managers')
            .subscribe({
                next: (data) => this.managers = data,
                error: () => console.error('Erreur chargement managers')
            });
    }

    // ========== PAGINATION ==========

    updatePagination(): void {
        const start = this.currentPage * this.pageSize;
        const end = start + this.pageSize;
        this.filteredData = this.originalData.slice(start, end);
        this.totalPages = Math.ceil(this.originalData.length / this.pageSize) || 1;
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

    goToPage(page: number): void {
        this.currentPage = page;
        this.updatePagination();
    }

    // ========== FILTRES ==========

    applyFilter(): void {
        const filtered = this.originalData.filter(user => {
            const matchesSearch = !this.searchTerm ||
                user.prenom?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                user.nom?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                user.email?.toLowerCase().includes(this.searchTerm.toLowerCase());

            //const matchesDept = !this.selectedDepartment || 
            //  user.departement === this.selectedDepartment;

            //const matchesStatus = !this.selectedStatus || 
            //    user.status === this.selectedStatus;

            return matchesSearch
        });

        this.originalData = filtered;
        this.currentPage = 0;
        this.updatePagination();
    }

    resetFilters(): void {
        this.searchTerm = '';
        this.selectedDepartment = '';
        this.selectedStatus = '';
        if (this.isAdmin) {
            this.loadEmployees();
        }
    }

    // Anciennes méthodes pour compatibilité
    applyFilterWithTerm(term: string): void {
        this.searchTerm = term;
        this.applyFilter();
    }

    applyFilterWithRole(role: string): void {
        this.selectedRole = role;
        const filtered = this.members.filter(member => {
            return !role || member.role === role;
        });
        this.filteredMembers = filtered;
    }

    // ========== FORMULAIRE ==========

    openAddForm(): void {
        this.isEditMode = false;
        this.employeeFormValue = {
            id: null,
            nom: '',
            prenom: '',
            email: '',
            password: '',
            role: 'EMPLOYE',
            status: 'ACTIF',
            departement: '',
            poste: '',
            //managerId: '',
            photoUrl: '',
            dateEmbauche: new Date().toISOString().split('T')[0],
            telephone: '',
            adresse: '',
            birthDate: ''
        };
        this.currentMember = {
            id: null,
            name: '',
            email: '',
            title: '',
            role: 'EMPLOYEE',
            phone: '',
            avatar: ''
        };
        this.imagePreview = null;
        this.selectedFile = null;
        this.showForm = true;
    }

    openEditForm(user: any): void {
        this.isEditMode = true;
        this.employeeFormValue = {
            id: user.id,
            nom: user.nom || '',
            prenom: user.prenom || '',
            email: user.email || '',
            role: user.role || 'EMPLOYE',
            status: user.status || 'ACTIF',
            departement: user.departement || '',
            poste: user.poste || '',
            //managerId: user.managerId || '',
            photoUrl: user.photoUrl || '',
            dateEmbauche: user.dateEmbauche ? new Date(user.dateEmbauche).toISOString().split('T')[0] : '',
            telephone: user.telephone || '',
            adresse: user.adresse || '',
            birthDate: user.birthDate ? new Date(user.birthDate).toISOString().split('T')[0] : ''
        };
        this.currentMember = {
            id: user.id,
            name: `${user.prenom} ${user.nom}`,
            email: user.email || '',
            title: user.poste || '',
            role: user.role || 'EMPLOYEE',
            phone: user.telephone || '',
            avatar: user.photoUrl || ''
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

    updateMemberField(field: string, value: any): void {
        this.currentMember[field] = value;
    }

    // ========== UPLOAD ==========

    onFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;

        if (input.files && input.files.length > 0) {
            const file = input.files[0];

            if (!file.type.match(/image\/(jpeg|png|gif|jpg)/)) {
                this.toastr?.error('Format non supporté. Utilisez JPG, PNG ou GIF', 'Erreur');
                return;
            }

            if (file.size > 2 * 1024 * 1024) {
                this.toastr?.error('Image trop grande. Maximum 2MB', 'Erreur');
                return;
            }

            this.selectedFile = file;

            const reader = new FileReader();
            reader.onload = (e: any) => {
                this.imagePreview = e.target.result;
            };
            reader.readAsDataURL(file);

            this.toastr?.info('Photo sélectionnée', 'Info');
        }
    }

    uploadImage(): Promise<string> {
        return new Promise((resolve) => {
            if (!this.selectedFile) {
                resolve(this.employeeFormValue.photoUrl || '');
                return;
            }

            // Convertir l'image en Base64 et la stocker directement dans photoUrl
            const reader = new FileReader();
            reader.onload = (e: any) => {
                this.uploading = false;
                resolve(e.target.result); // data:image/...;base64,...
            };
            reader.onerror = () => {
                this.uploading = false;
                console.warn('Erreur lecture fichier image');
                resolve(this.employeeFormValue.photoUrl || '');
            };
            this.uploading = true;
            reader.readAsDataURL(this.selectedFile);
        });
    }

    // ========== CRUD ==========

    async saveEmployee(): Promise<void> {
        if (!this.employeeFormValue.prenom || !this.employeeFormValue.nom || !this.employeeFormValue.email) {
            this.toastr?.warning('Veuillez remplir les champs obligatoires', 'Formulaire incomplet');
            return;
        }

        try {
            const photoUrl = await this.uploadImage();
            this.employeeFormValue.photoUrl = photoUrl;

            // Mapper les champs du formulaire vers les champs attendus par le Backend
            const data: any = {
                nom: this.employeeFormValue.nom,
                prenom: this.employeeFormValue.prenom,
                email: this.employeeFormValue.email,
                password: this.employeeFormValue.password,
                telephone: this.employeeFormValue.telephone,
                role: this.employeeFormValue.role,
                status: this.employeeFormValue.status,
                departement: this.employeeFormValue.departement,
                poste: this.employeeFormValue.poste,
                photoUrl: this.employeeFormValue.photoUrl,
                adresse: this.employeeFormValue.adresse
            };

            if (this.isEditMode) {
                this._http.put(`/api/users/${this.employeeFormValue.id}`, data)
                    .subscribe({
                        next: () => {
                            this.toastr?.success('Utilisateur modifié avec succès', 'Succès');
                            this.loadEmployees();
                            this.closeForm();
                        },
                        error: () => {
                            this.toastr?.error('Erreur lors de la modification', 'Erreur');
                        }
                    });
            } else {
                this._http.post('/api/users', data)
                    .subscribe({
                        next: () => {
                            this.toastr?.success('Utilisateur ajouté avec succès', 'Succès');
                            this.loadEmployees();
                            this.closeForm();
                        },
                        error: () => {
                            this.toastr?.error("Erreur lors de l'ajout", 'Erreur');
                        }
                    });
            }
        } catch (error) {
            this.toastr?.error('Erreur lors du traitement', 'Erreur');
        }
    }

    saveEmployeeWithValidation(form: any): void {
        Object.keys(form.controls).forEach(key => {
            form.controls[key].markAsTouched();
        });

        if (form.invalid) {
            this.toastr?.warning('Veuillez corriger les erreurs dans le formulaire', 'Formulaire incomplet');
            return;
        }

        this.saveEmployee();
    }



    deleteEmployee(user: any): void {
        const dialogRef = this._fuseConfirmationService.open({
            title: 'Supprimer employé',
            message: `Êtes-vous sûr de vouloir supprimer ${user.prenom} ${user.nom} ?`,
            icon: { show: true, name: 'heroicons_outline:trash', color: 'warn' },
            actions: { confirm: { label: 'Supprimer', color: 'warn' } }
        });

        dialogRef.afterClosed().subscribe((result) => {
            if (result === 'confirmed') {
                this._http.delete(`/api/users/${user.id}`)
                    .subscribe({
                        next: () => {
                            this.toastr?.success(`${user.prenom} ${user.nom} supprimé`, 'Succès');
                            this.loadEmployees();
                        },
                        error: (err) => {
                            this.toastr?.error(`Erreur ${err.status}: ${err.error?.message || 'Impossible de supprimer'}`, 'Erreur');
                        }
                    });
            }
        });
    }



    getRoleColor(role: string): string {
        switch (role) {
            case 'ADMIN': return 'warn';
            case 'MANAGER': return 'primary';
            default: return 'accent';
        }
    }

    getStatusColor(status: string): string {
        switch (status) {
            case 'ACTIF': return '#22c55e';
            case 'INACTIF': return '#eab308';
            default: return '#ef4444';
        }
    }

    // ========== MÉTHODES EXISTANTES ==========

    private _fixSvgFill(element: Element): void {
        const currentURL = this._router.url;
        Array.from(element.querySelectorAll('*[fill]'))
            .filter(el => el.getAttribute('fill').indexOf('url(') !== -1)
            .forEach((el) => {
                const attrVal = el.getAttribute('fill');
                el.setAttribute('fill', `url(${currentURL}${attrVal.slice(attrVal.indexOf('#'))}`);
            });
    }

    private _prepareChartData(): void {
        this.chartGithubIssues = {
            chart: {
                fontFamily: 'inherit',
                foreColor: 'inherit',
                height: '100%',
                type: 'line',
                toolbar: { show: false },
                zoom: { enabled: false }
            },
            colors: ['#64748B', '#94A3B8'],
            dataLabels: {
                enabled: true,
                enabledOnSeries: [0],
                background: { borderWidth: 0 }
            },
            grid: { borderColor: 'var(--fuse-border)' },
            labels: this.data.githubIssues.labels,
            legend: { show: false },
            plotOptions: { bar: { columnWidth: '50%' } },
            series: this.data.githubIssues.series,
            // Nouveau code sans la propriété 'value'
            states: { hover: { filter: { type: 'darken' } } },
            stroke: { width: [3, 0] },
            tooltip: { followCursor: true, theme: 'dark' },
            xaxis: {
                axisBorder: { show: false },
                axisTicks: { color: 'var(--fuse-border)' },
                labels: { style: { colors: 'var(--fuse-text-secondary)' } },
                tooltip: { enabled: false }
            },
            yaxis: { labels: { offsetX: -16, style: { colors: 'var(--fuse-text-secondary)' } } }
        };

        this.chartTaskDistribution = {
            chart: {
                fontFamily: 'inherit',
                foreColor: 'inherit',
                height: '100%',
                type: 'polarArea',
                toolbar: { show: false },
                zoom: { enabled: false }
            },
            labels: this.data.taskDistribution.labels,
            legend: { position: 'bottom' },
            plotOptions: {
                polarArea: {
                    spokes: { connectorColors: 'var(--fuse-border)' },
                    rings: { strokeColor: 'var(--fuse-border)' }
                }
            },
            series: this.data.taskDistribution.series,
            // Nouveau code sans la propriété 'value'
            states: { hover: { filter: { type: 'darken' } } },
            stroke: { width: 2 },
            theme: { monochrome: { enabled: true, color: '#93C5FD', shadeIntensity: 0.75, shadeTo: 'dark' } },
            tooltip: { followCursor: true, theme: 'dark' },
            yaxis: { labels: { style: { colors: 'var(--fuse-text-secondary)' } } }
        };

        this.chartBudgetDistribution = {
            chart: {
                fontFamily: 'inherit',
                foreColor: 'inherit',
                height: '100%',
                type: 'radar',
                sparkline: { enabled: true }
            },
            colors: ['#818CF8'],
            dataLabels: {
                enabled: true,
                formatter: (val: number): string | number => `${val}%`,
                textAnchor: 'start',
                style: { fontSize: '13px', fontWeight: 500 },
                background: { borderWidth: 0, padding: 4 },
                offsetY: -15
            },
            markers: { strokeColors: '#818CF8', strokeWidth: 4 },
            plotOptions: { radar: { polygons: { strokeColors: 'var(--fuse-border)', connectorColors: 'var(--fuse-border)' } } },
            series: this.data.budgetDistribution.series,
            stroke: { width: 2 },
            tooltip: { theme: 'dark', y: { formatter: (val: number): string => `${val}%` } },
            xaxis: {
                labels: { show: true, style: { fontSize: '12px', fontWeight: '500' } },
                categories: this.data.budgetDistribution.categories
            },
            yaxis: { max: (max: number): number => parseInt((max + 10).toFixed(0), 10), tickAmount: 7 }
        };

        this.chartWeeklyExpenses = {
            chart: { animations: { enabled: false }, fontFamily: 'inherit', foreColor: 'inherit', height: '100%', type: 'line', sparkline: { enabled: true } },
            colors: ['#22D3EE'],
            series: this.data.weeklyExpenses.series,
            stroke: { curve: 'smooth' },
            tooltip: { theme: 'dark' },
            xaxis: { type: 'category', categories: this.data.weeklyExpenses.labels },
            yaxis: { labels: { formatter: (val): string => `$${val}` } }
        };

        this.chartMonthlyExpenses = {
            chart: { animations: { enabled: false }, fontFamily: 'inherit', foreColor: 'inherit', height: '100%', type: 'line', sparkline: { enabled: true } },
            colors: ['#4ADE80'],
            series: this.data.monthlyExpenses.series,
            stroke: { curve: 'smooth' },
            tooltip: { theme: 'dark' },
            xaxis: { type: 'category', categories: this.data.monthlyExpenses.labels },
            yaxis: { labels: { formatter: (val): string => `$${val}` } }
        };

        this.chartYearlyExpenses = {
            chart: { animations: { enabled: false }, fontFamily: 'inherit', foreColor: 'inherit', height: '100%', type: 'line', sparkline: { enabled: true } },
            colors: ['#FB7185'],
            series: this.data.yearlyExpenses.series,
            stroke: { curve: 'smooth' },
            tooltip: { theme: 'dark' },
            xaxis: { type: 'category', categories: this.data.yearlyExpenses.labels },
            yaxis: { labels: { formatter: (val): string => `$${val}` } }
        };
    }
}
