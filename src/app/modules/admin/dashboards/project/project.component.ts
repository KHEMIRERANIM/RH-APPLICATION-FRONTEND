import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ApexOptions } from 'ng-apexcharts';
import { ProjectService } from 'app/modules/admin/dashboards/project/project.service';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { UserService } from 'app/core/user/user.service';

@Component({
    selector       : 'project',
    templateUrl    : './project.component.html',
    styleUrls: ['./project.component.css'],
    encapsulation  : ViewEncapsulation.None
    //changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProjectComponent implements OnInit, OnDestroy
{
    chartGithubIssues: ApexOptions = {};
    chartTaskDistribution: ApexOptions = {};
    chartBudgetDistribution: ApexOptions = {};
    chartWeeklyExpenses: ApexOptions = {};
    chartMonthlyExpenses: ApexOptions = {};
    chartYearlyExpenses: ApexOptions = {};
    data: any;
    selectedProject: string = 'ACME Corp. Backend App';
    isAdmin: boolean = false;
    loggedUser: any = null;
    viewMode: string = 'tableau';
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
    
    // Pagination
    currentPage: number = 0;
    pageSize: number = 10;
    totalPages: number = 0;
    
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
        private _userService: UserService
    ) {}

    ngOnInit(): void
    {
        const userStr = localStorage.getItem('currentUser');
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                this.loggedUser = user;
                this.isAdmin = user.role === 'ADMIN' || user.role === 'admin';
                if (this.isAdmin && (!this.originalData || this.originalData.length === 0)) {
                    this.loadEmployees();
                }
            } catch (e) {}
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
    }

    // Ajoute cette méthode
    onTabChange(event: any): void {
        if (event.tab.textLabel === 'Équipe' && this.isAdmin && (!this.originalData || this.originalData.length === 0)) {
            this.loadAllData();
        }
    }

    ngOnDestroy(): void
    {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    trackByFn(index: number, item: any): any
    {
        return item.id || index;
    }

    // ========== CHARGEMENT DES DONNÉES ==========
    
    loadAllData(): void {
        this.loadEmployees();
        //this.loadDepartments();
        //this.loadJobTitles();
        //this.loadManagers();
    }
    
    loadEmployees(): void {
    this._http.get<any[]>('http://10.188.81.174:8081/api/users')
        .subscribe({
            next: (data) => {
                console.log('=== DONNÉES REÇUES ===');
                console.log('Data brute:', data);
                console.log('Nombre de données:', data?.length);
                
                this.originalData = data || [];
                this.filteredData = data || [];
                this.updatePagination();
                
                this.totalEmployees = (data || []).length;
                this.activeEmployees = (data || []).filter(e => e.status === 'ACTIF').length;
                
                // Calcul dynamique des KPIs Départements et Postes
                const depts = new Set((data || []).map(u => u.departement).filter(d => d && d.trim() !== ''));
                const postes = new Set((data || []).map(u => u.poste).filter(p => p && p.trim() !== ''));
                this.totalDepartments = depts.size;
                this.totalPositions = postes.size;
                
                console.log('Total employés:', this.totalEmployees);
                console.log('Départements uniques:', this.totalDepartments);
                console.log('Postes uniques:', this.totalPositions);
                
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
        this._http.get<any[]>('http://10.188.81.174:8081/api/departments')
            .subscribe({
                next: (data) => this.departments = data,
                error: () => console.error('Erreur chargement départements')
            });
    }
    
    loadJobTitles(): void {
        this._http.get<any[]>('http://10.188.81.174:8081/api/job-titles')
            .subscribe({
                next: (data) => this.jobTitles = data,
                error: () => console.error('Erreur chargement postes')
            });
    }
    
    loadManagers(): void {
        this._http.get<any[]>('http://10.188.81.174:8081/api/users/managers')
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
                this._http.put(`http://10.188.81.174:8081/api/users/${this.employeeFormValue.id}`, data)
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
                this._http.post('http://10.188.81.174:8081/api/users', data)
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
    console.log('=== DÉBUT SUPPRESSION ===');
    console.log('Utilisateur à supprimer:', user);
    console.log('ID:', user.id);
    console.log('URL:', `http://10.188.81.174:8081/api/users/${user.id}`);
    
    const confirmDelete = confirm(`⚠️ Supprimer ${user.prenom} ${user.nom} ?`);
    
    if (confirmDelete) {
        this._http.delete(`http://10.188.81.174:8081/api/users/${user.id}`)
            .subscribe({
                next: (response) => {
                    console.log('✅ SUCCÈS:', response);
                    this.toastr?.success(`${user.prenom} ${user.nom} supprimé`, 'Succès');
                    this.loadEmployees();
                },
                error: (err) => {
                    console.log('❌ ERREUR COMPLÈTE:');
                    console.log('Status:', err.status);
                    console.log('Message:', err.message);
                    console.log('Erreur:', err.error);
                    console.log('Headers:', err.headers);
                    
                    this.toastr?.error(`Erreur ${err.status}: ${err.error?.message || 'Impossible de supprimer'}`, 'Erreur');
                }
            });
    } else {
        console.log('Suppression annulée par l\'utilisateur');
    }
}
    

    
    getRoleColor(role: string): string {
        switch(role) {
            case 'ADMIN': return 'warn';
            case 'MANAGER': return 'primary';
            default: return 'accent';
        }
    }
    
    getStatusColor(status: string): string {
        switch(status) {
            case 'ACTIF': return '#22c55e';
            case 'INACTIF': return '#eab308';
            default: return '#ef4444';
        }
    }

    // ========== MÉTHODES EXISTANTES ==========
    
    private _fixSvgFill(element: Element): void
    {
        const currentURL = this._router.url;
        Array.from(element.querySelectorAll('*[fill]'))
             .filter(el => el.getAttribute('fill').indexOf('url(') !== -1)
             .forEach((el) => {
                 const attrVal = el.getAttribute('fill');
                 el.setAttribute('fill', `url(${currentURL}${attrVal.slice(attrVal.indexOf('#'))}`);
             });
    }

    private _prepareChartData(): void
    {
        this.chartGithubIssues = {
            chart      : {
                fontFamily: 'inherit',
                foreColor : 'inherit',
                height    : '100%',
                type      : 'line',
                toolbar   : { show: false },
                zoom      : { enabled: false }
            },
            colors     : ['#64748B', '#94A3B8'],
            dataLabels : {
                enabled        : true,
                enabledOnSeries: [0],
                background     : { borderWidth: 0 }
            },
            grid       : { borderColor: 'var(--fuse-border)' },
            labels     : this.data.githubIssues.labels,
            legend     : { show: false },
            plotOptions: { bar: { columnWidth: '50%' } },
            series     : this.data.githubIssues.series,
            states     : { hover: { filter: { type: 'darken', value: 0.75 } } },
            stroke     : { width: [3, 0] },
            tooltip    : { followCursor: true, theme: 'dark' },
            xaxis      : {
                axisBorder: { show: false },
                axisTicks : { color: 'var(--fuse-border)' },
                labels    : { style: { colors: 'var(--fuse-text-secondary)' } },
                tooltip   : { enabled: false }
            },
            yaxis      : { labels: { offsetX: -16, style: { colors: 'var(--fuse-text-secondary)' } } }
        };

        this.chartTaskDistribution = {
            chart      : {
                fontFamily: 'inherit',
                foreColor : 'inherit',
                height    : '100%',
                type      : 'polarArea',
                toolbar   : { show: false },
                zoom      : { enabled: false }
            },
            labels     : this.data.taskDistribution.labels,
            legend     : { position: 'bottom' },
            plotOptions: {
                polarArea: {
                    spokes: { connectorColors: 'var(--fuse-border)' },
                    rings : { strokeColor: 'var(--fuse-border)' }
                }
            },
            series     : this.data.taskDistribution.series,
            states     : { hover: { filter: { type: 'darken', value: 0.75 } } },
            stroke     : { width: 2 },
            theme      : { monochrome: { enabled: true, color: '#93C5FD', shadeIntensity: 0.75, shadeTo: 'dark' } },
            tooltip    : { followCursor: true, theme: 'dark' },
            yaxis      : { labels: { style: { colors: 'var(--fuse-text-secondary)' } } }
        };

        this.chartBudgetDistribution = {
            chart      : {
                fontFamily: 'inherit',
                foreColor : 'inherit',
                height    : '100%',
                type      : 'radar',
                sparkline : { enabled: true }
            },
            colors     : ['#818CF8'],
            dataLabels : {
                enabled   : true,
                formatter : (val: number): string | number => `${val}%`,
                textAnchor: 'start',
                style     : { fontSize: '13px', fontWeight: 500 },
                background: { borderWidth: 0, padding: 4 },
                offsetY   : -15
            },
            markers    : { strokeColors: '#818CF8', strokeWidth: 4 },
            plotOptions: { radar: { polygons: { strokeColors: 'var(--fuse-border)', connectorColors: 'var(--fuse-border)' } } },
            series     : this.data.budgetDistribution.series,
            stroke     : { width: 2 },
            tooltip    : { theme: 'dark', y: { formatter: (val: number): string => `${val}%` } },
            xaxis      : {
                labels    : { show: true, style: { fontSize: '12px', fontWeight: '500' } },
                categories: this.data.budgetDistribution.categories
            },
            yaxis      : { max: (max: number): number => parseInt((max + 10).toFixed(0), 10), tickAmount: 7 }
        };

        this.chartWeeklyExpenses = {
            chart  : { animations: { enabled: false }, fontFamily: 'inherit', foreColor: 'inherit', height: '100%', type: 'line', sparkline: { enabled: true } },
            colors : ['#22D3EE'],
            series : this.data.weeklyExpenses.series,
            stroke : { curve: 'smooth' },
            tooltip: { theme: 'dark' },
            xaxis  : { type: 'category', categories: this.data.weeklyExpenses.labels },
            yaxis  : { labels: { formatter: (val): string => `$${val}` } }
        };

        this.chartMonthlyExpenses = {
            chart  : { animations: { enabled: false }, fontFamily: 'inherit', foreColor: 'inherit', height: '100%', type: 'line', sparkline: { enabled: true } },
            colors : ['#4ADE80'],
            series : this.data.monthlyExpenses.series,
            stroke : { curve: 'smooth' },
            tooltip: { theme: 'dark' },
            xaxis  : { type: 'category', categories: this.data.monthlyExpenses.labels },
            yaxis  : { labels: { formatter: (val): string => `$${val}` } }
        };

        this.chartYearlyExpenses = {
            chart  : { animations: { enabled: false }, fontFamily: 'inherit', foreColor: 'inherit', height: '100%', type: 'line', sparkline: { enabled: true } },
            colors : ['#FB7185'],
            series : this.data.yearlyExpenses.series,
            stroke : { curve: 'smooth' },
            tooltip: { theme: 'dark' },
            xaxis  : { type: 'category', categories: this.data.yearlyExpenses.labels },
            yaxis  : { labels: { formatter: (val): string => `$${val}` } }
        };
    }
}
