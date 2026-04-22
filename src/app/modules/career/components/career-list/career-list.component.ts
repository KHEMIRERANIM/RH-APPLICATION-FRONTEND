import {
  Component,
  OnInit,
  AfterViewInit,
  ViewChild,
  ChangeDetectorRef,
  NgZone
} from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CareerService } from '../../services/career.service';
import { Career, CareerDomain, CareerLevel } from '../../models/career.model';
import { AuthRoleService } from '../../services/auth-role.service';
import { MobilityRequestFormComponent } from '../mobility-request-form/mobility-request-form.component';

@Component({
  selector: 'app-career-list',
  templateUrl: './career-list.component.html',
  styleUrls: ['./career-list.component.scss']
})
export class CareerListComponent implements OnInit, AfterViewInit {
  displayedColumns: string[] = ['title', 'domain', 'level', 'salary', 'options', 'employee-actions'];
  dataSource = new MatTableDataSource<Career>();
  isLoading = true;

  activeTab = 0;
  tabs: { icon: string; label: string }[] = [
    { icon: '💼', label: 'Postes Disponibles' },
    { icon: '🔄', label: 'Mes Demandes' },
    { icon: '📈', label: 'Mon Plan' },
    { icon: '🌱', label: 'RSE' }
  ];

  total = 0;
  totalRemote = 0;
  totalDisabled = 0;
  totalSeniorPlus = 0;

  allCareers: Career[] = [];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  domainLabels: Record<CareerDomain, string> = {
    [CareerDomain.IT]: 'Informatique',
    [CareerDomain.FINANCE]: 'Finance',
    [CareerDomain.RH]: 'Ressources Humaines',
    [CareerDomain.MARKETING]: 'Marketing',
    [CareerDomain.LEGAL]: 'Juridique',
    [CareerDomain.OPERATIONS]: 'Opérations',
    [CareerDomain.SALES]: 'Commercial',
    [CareerDomain.ENGINEERING]: 'Ingénierie',
    [CareerDomain.HEALTH]: 'Santé',
    [CareerDomain.EDUCATION]: 'Éducation'
  };

  domainColors: Record<CareerDomain, string> = {
    [CareerDomain.IT]: 'bg-blue-100 text-blue-700',
    [CareerDomain.FINANCE]: 'bg-green-100 text-green-700',
    [CareerDomain.RH]: 'bg-pink-100 text-pink-700',
    [CareerDomain.MARKETING]: 'bg-purple-100 text-purple-700',
    [CareerDomain.LEGAL]: 'bg-yellow-100 text-yellow-700',
    [CareerDomain.OPERATIONS]: 'bg-orange-100 text-orange-700',
    [CareerDomain.SALES]: 'bg-teal-100 text-teal-700',
    [CareerDomain.ENGINEERING]: 'bg-indigo-100 text-indigo-700',
    [CareerDomain.HEALTH]: 'bg-red-100 text-red-700',
    [CareerDomain.EDUCATION]: 'bg-cyan-100 text-cyan-700'
  };

  levelColors: Record<CareerLevel, string> = {
    [CareerLevel.INTERN]: 'text-gray-400',
    [CareerLevel.JUNIOR]: 'text-gray-500',
    [CareerLevel.MID]: 'text-blue-500',
    [CareerLevel.SENIOR]: 'text-indigo-600',
    [CareerLevel.LEAD]: 'text-purple-600',
    [CareerLevel.MANAGER]: 'text-orange-600',
    [CareerLevel.DIRECTOR]: 'text-red-600',
    [CareerLevel.EXECUTIVE]: 'text-rose-700'
  };

  levelIcons: Record<CareerLevel, string> = {
    [CareerLevel.INTERN]: '○',
    [CareerLevel.JUNIOR]: '◔',
    [CareerLevel.MID]: '◑',
    [CareerLevel.SENIOR]: '◕',
    [CareerLevel.LEAD]: '★',
    [CareerLevel.MANAGER]: '▲',
    [CareerLevel.DIRECTOR]: '◆',
    [CareerLevel.EXECUTIVE]: '♛'
  };

  constructor(
    private careerService: CareerService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private router: Router,
    public authRole: AuthRoleService
  ) {}

  ngOnInit(): void {
    if (this.authRole.isAdminOrRH()) {
this.router.navigate(['/apps/carriere/admin']);
      return;
    }

    this.loadCareers();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadCareers(): void {
    this.isLoading = true;

    this.careerService.getAll().subscribe({
      next: (data) => {
        this.ngZone.run(() => {
          this.allCareers = data;
          this.dataSource.data = data;
          this.computeStats(data);
          this.isLoading = false;
          this.cdr.detectChanges();

          Promise.resolve().then(() => {
            this.dataSource.paginator = this.paginator;
            this.dataSource.sort = this.sort;
            this.cdr.detectChanges();
          });
        });
      },
      error: () => {
        this.ngZone.run(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
          this.snackBar.open('Erreur de chargement', 'Fermer', { duration: 3000 });
        });
      }
    });
  }

  computeStats(data: Career[]): void {
    this.total = data.length;
    this.totalRemote = data.filter(c => c.isRemoteFriendly).length;
    this.totalDisabled = data.filter(c => c.isAccessibleForDisabled).length;
    this.totalSeniorPlus = data.filter(c =>
      c.level === CareerLevel.SENIOR ||
      c.level === CareerLevel.LEAD ||
      c.level === CareerLevel.MANAGER ||
      c.level === CareerLevel.DIRECTOR ||
      c.level === CareerLevel.EXECUTIVE
    ).length;
  }

  applyFilter(event: Event): void {
    this.dataSource.filter = (event.target as HTMLInputElement).value.trim().toLowerCase();
  }

  getTabStyle(index: number): string {
    const base =
      'padding:16px 24px;border:none;background:none;cursor:pointer;' +
      'font-size:14px;font-weight:600;font-family:inherit;' +
      'border-bottom:3px solid transparent;margin-bottom:-2px;transition:all 0.15s;';
    return this.activeTab === index
      ? base + 'color:#7c3aed;border-bottom-color:#7c3aed;'
      : base + 'color:#6b7280;';
  }

  formatSalary(career: Career): string {
    if (!career.salaryMin && !career.salaryMax) return '—';
    if (career.salaryMin && career.salaryMax) {
      return `${career.salaryMin.toLocaleString()} – ${career.salaryMax.toLocaleString()} TND`;
    }
    if (career.salaryMin) return `À partir de ${career.salaryMin.toLocaleString()} TND`;
    return `Jusqu'à ${career.salaryMax!.toLocaleString()} TND`;
  }

  openMobilityForm(career: Career): void {
    const ref = this.dialog.open(MobilityRequestFormComponent, {
      width: '600px',
      maxWidth: '95vw',
      data: {
        careers: this.allCareers,
        preselectedCareerId: career.id,
        employeeId: this.authRole.getCurrentUserId()
      },
      panelClass: 'career-dialog'
    });

    ref.afterClosed().subscribe(result => {
      if (result) {
        this.snackBar.open('Demande soumise !', 'OK', { duration: 3000 });
      }
    });
  }
}