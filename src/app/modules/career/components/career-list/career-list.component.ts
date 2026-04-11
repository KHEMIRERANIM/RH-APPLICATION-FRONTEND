import { Component, OnInit, AfterViewInit, ViewChild, ChangeDetectorRef, NgZone } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CareerService } from '../../services/career.service';
import { Career, CareerDomain, CareerLevel } from '../../models/career.model';
import { CareerFormComponent } from '../career-form/career-form.component';
import { CareerEmployeesDialogComponent } from '../career-employees-dialog/career-employees-dialog.component';
import { AuthRoleService } from '../../services/auth-role.service';
import { MobilityRequestFormComponent } from '../mobility-request-form/mobility-request-form.component';

@Component({
  selector: 'app-career-list',
  templateUrl: './career-list.component.html',
  styleUrls: ['./career-list.component.scss']
})
export class CareerListComponent implements OnInit, AfterViewInit {

  displayedColumns: string[] = ['title', 'domain', 'level', 'salary', 'options', 'actions'];
  dataSource = new MatTableDataSource<Career>();
  isLoading = true;

  activeTab = 0;
  tabs: { icon: string; label: string }[] = [];

  total          = 0;
  totalRemote    = 0;
  totalDisabled  = 0;
  totalSeniorPlus = 0;

  // ✅ Stocker tous les careers pour les passer au formulaire de mobilité
  allCareers: Career[] = [];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort)      sort!:      MatSort;

  domainLabels: Record<CareerDomain, string> = {
    [CareerDomain.IT]:          'Informatique',
    [CareerDomain.FINANCE]:     'Finance',
    [CareerDomain.RH]:          'Ressources Humaines',
    [CareerDomain.MARKETING]:   'Marketing',
    [CareerDomain.LEGAL]:       'Juridique',
    [CareerDomain.OPERATIONS]:  'Opérations',
    [CareerDomain.SALES]:       'Commercial',
    [CareerDomain.ENGINEERING]: 'Ingénierie',
    [CareerDomain.HEALTH]:      'Santé',
    [CareerDomain.EDUCATION]:   'Éducation'
  };

  domainColors: Record<CareerDomain, string> = {
    [CareerDomain.IT]:          'bg-blue-100 text-blue-700',
    [CareerDomain.FINANCE]:     'bg-green-100 text-green-700',
    [CareerDomain.RH]:          'bg-pink-100 text-pink-700',
    [CareerDomain.MARKETING]:   'bg-purple-100 text-purple-700',
    [CareerDomain.LEGAL]:       'bg-yellow-100 text-yellow-700',
    [CareerDomain.OPERATIONS]:  'bg-orange-100 text-orange-700',
    [CareerDomain.SALES]:       'bg-teal-100 text-teal-700',
    [CareerDomain.ENGINEERING]: 'bg-indigo-100 text-indigo-700',
    [CareerDomain.HEALTH]:      'bg-red-100 text-red-700',
    [CareerDomain.EDUCATION]:   'bg-cyan-100 text-cyan-700'
  };

  levelColors: Record<CareerLevel, string> = {
    [CareerLevel.INTERN]:    'text-gray-400',
    [CareerLevel.JUNIOR]:    'text-gray-500',
    [CareerLevel.MID]:       'text-blue-500',
    [CareerLevel.SENIOR]:    'text-indigo-600',
    [CareerLevel.LEAD]:      'text-purple-600',
    [CareerLevel.MANAGER]:   'text-orange-600',
    [CareerLevel.DIRECTOR]:  'text-red-600',
    [CareerLevel.EXECUTIVE]: 'text-rose-700'
  };

  levelIcons: Record<CareerLevel, string> = {
    [CareerLevel.INTERN]:    '○',
    [CareerLevel.JUNIOR]:    '◔',
    [CareerLevel.MID]:       '◑',
    [CareerLevel.SENIOR]:    '◕',
    [CareerLevel.LEAD]:      '★',
    [CareerLevel.MANAGER]:   '▲',
    [CareerLevel.DIRECTOR]:  '◆',
    [CareerLevel.EXECUTIVE]: '♛'
  };

  constructor(
    private careerService: CareerService,
    private dialog:        MatDialog,
    private snackBar:      MatSnackBar,
    private cdr:           ChangeDetectorRef,
    private ngZone:        NgZone,
    public  authRole:      AuthRoleService
  ) {}

  ngOnInit(): void {
    this.buildTabs();
    this.buildColumns();
    this.loadCareers();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort      = this.sort;
  }

  buildTabs(): void {
    if (this.authRole.isAdminOrRH()) {
      this.tabs = [
        { icon: '💼', label: 'Positions' },
        { icon: '🔄', label: 'Mobilité'  },
        { icon: '📈', label: 'Plans'     }
      ];
    } else {
      this.tabs = [
        { icon: '💼', label: 'Postes Disponibles' },
        { icon: '🔄', label: 'Mes Demandes'       },
        { icon: '📈', label: 'Mon Plan'            }
      ];
    }
  }

  buildColumns(): void {
    if (this.authRole.isAdminOrRH()) {
      this.displayedColumns = ['title', 'domain', 'level', 'salary', 'options', 'actions'];
    } else {
      this.displayedColumns = ['title', 'domain', 'level', 'salary', 'options', 'employee-actions'];
    }
  }

  loadCareers(): void {
    this.isLoading = true;
    this.careerService.getAll().subscribe({
      next: (data) => {
        this.ngZone.run(() => {
          this.allCareers        = data;     // ✅ stocker tous les careers
          this.dataSource.data   = data;
          this.dataSource._updateChangeSubscription();
          this.computeStats(data);
          this.isLoading = false;
          this.cdr.detectChanges();
          Promise.resolve().then(() => {
            this.dataSource.paginator = this.paginator;
            this.dataSource.sort      = this.sort;
            this.cdr.detectChanges();
          });
        });
      },
      error: () => {
        this.ngZone.run(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
          this.snackBar.open('Loading error', 'Close', { duration: 3000 });
        });
      }
    });
  }

  computeStats(data: Career[]): void {
    this.total         = data.length;
    this.totalRemote   = data.filter(c => c.isRemoteFriendly).length;
    this.totalDisabled = data.filter(c => c.isAccessibleForDisabled).length;
    this.totalSeniorPlus = data.filter(c =>
      c.level === CareerLevel.SENIOR   ||
      c.level === CareerLevel.LEAD     ||
      c.level === CareerLevel.MANAGER  ||
      c.level === CareerLevel.DIRECTOR ||
      c.level === CareerLevel.EXECUTIVE
    ).length;
  }

  applyFilter(event: Event): void {
    this.dataSource.filter = (event.target as HTMLInputElement).value.trim().toLowerCase();
  }

  getTabStyle(index: number): string {
    const base = 'padding:16px 24px;border:none;background:none;cursor:pointer;' +
                 'font-size:14px;font-weight:600;font-family:inherit;' +
                 'border-bottom:3px solid transparent;margin-bottom:-2px;transition:all 0.15s;';
    return this.activeTab === index
      ? base + 'color:#7c3aed;border-bottom-color:#7c3aed;'
      : base + 'color:#6b7280;';
  }

  openForm(career?: Career): void {
    const dialogRef = this.dialog.open(CareerFormComponent, {
      width:      '700px',
      maxWidth:   '95vw',
      data:       career ? { ...career } : null,
      panelClass: 'career-dialog'
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadCareers();
    });
  }

  viewEmployees(career: Career): void {
    this.dialog.open(CareerEmployeesDialogComponent, {
      width:      '560px',
      maxWidth:   '95vw',
      data:       career,
      panelClass: 'career-dialog'
    });
  }

  deleteCareer(career: Career): void {
    if (!confirm(`Delete position "${career.title}"?`)) return;
    this.careerService.delete(career.id!).subscribe({
      next:  () => {
        this.snackBar.open('Position deleted', 'OK', { duration: 3000 });
        this.loadCareers();
      },
      error: () => this.snackBar.open('Error deleting position', 'Close', { duration: 3000 })
    });
  }

  formatSalary(career: Career): string {
    if (!career.salaryMin && !career.salaryMax) return '—';
    if (career.salaryMin && career.salaryMax)
      return `${career.salaryMin.toLocaleString()} – ${career.salaryMax.toLocaleString()} TND`;
    if (career.salaryMin) return `From ${career.salaryMin.toLocaleString()} TND`;
    return `Up to ${career.salaryMax!.toLocaleString()} TND`;
  }

  openMobilityForm(career: Career): void {
    const ref = this.dialog.open(MobilityRequestFormComponent, {
      width:      '600px',
      maxWidth:   '95vw',
      data: {
        careers:             this.allCareers,   // ✅ tous les careers avec certifRequises
        preselectedCareerId: career.id,
        employeeId:          this.authRole.getCurrentUserId()
      },
      panelClass: 'career-dialog'
    });
    ref.afterClosed().subscribe(result => {
      if (result) this.snackBar.open('Demande soumise !', 'OK', { duration: 3000 });
    });
  }
}