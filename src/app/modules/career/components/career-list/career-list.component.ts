import { Component, OnInit, AfterViewInit, ViewChild, ChangeDetectorRef, NgZone } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CareerService } from '../../services/career.service';
import { Career, CareerDomain, CareerLevel } from '../../models/career.model';
import { CareerFormComponent } from '../career-form/career-form.component';

@Component({
  selector: 'app-career-list',
  templateUrl: './career-list.component.html',
  styleUrls: ['./career-list.component.scss']
})
export class CareerListComponent implements OnInit, AfterViewInit {

  displayedColumns: string[] = ['title', 'domain', 'level', 'salary', 'options', 'actions'];
  dataSource = new MatTableDataSource<Career>();
  isLoading = true;

  total = 0;
  totalRemote = 0;
  totalDisabled = 0;
  totalSeniorPlus = 0;

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
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
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
          this.snackBar.open('Loading error', 'Close', { duration: 3000 });
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

  openForm(career?: Career): void {
  const dialogRef = this.dialog.open(CareerFormComponent, {
    width: '700px',
    maxWidth: '95vw',
    data: career ? { ...career } : null,
    panelClass: 'career-dialog'
  });
  dialogRef.afterClosed().subscribe(result => {
    if (result) this.loadCareers();
  });
}

  deleteCareer(career: Career): void {
    if (!confirm(`Delete position "${career.title}"?`)) return;
    this.careerService.delete(career.id!).subscribe({
      next: () => {
        this.snackBar.open('Position deleted', 'OK', { duration: 3000 });
        this.loadCareers();
      },
      error: () => {
        this.snackBar.open('Error deleting position', 'Close', { duration: 3000 });
      }
    });
  }

  formatSalary(career: Career): string {
    if (!career.salaryMin && !career.salaryMax) return '—';
    if (career.salaryMin && career.salaryMax)
      return `${career.salaryMin.toLocaleString()} – ${career.salaryMax.toLocaleString()} TND`;
    if (career.salaryMin) return `From ${career.salaryMin.toLocaleString()} TND`;
    return `Up to ${career.salaryMax!.toLocaleString()} TND`;
  }
}