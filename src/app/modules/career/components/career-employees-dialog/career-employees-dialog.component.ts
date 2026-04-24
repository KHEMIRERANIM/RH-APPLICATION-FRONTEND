import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CareerService } from '../../services/career.service';
import { Career } from '../../models/career.model';

@Component({
  selector: 'app-career-employees-dialog',
  templateUrl: './career-employees-dialog.component.html',
  styleUrls: ['./career-employees-dialog.component.scss']
})
export class CareerEmployeesDialogComponent implements OnInit {

  employees: any[] = [];
  isLoading = true;

  constructor(
    public dialogRef: MatDialogRef<CareerEmployeesDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public career: Career,
    private careerService: CareerService
  ) {}

  ngOnInit(): void {
    this.dialogRef.updateSize('560px');
    this.careerService.getEmployeesByCareer(this.career.id!).subscribe({
      next: (data) => { this.employees = data; this.isLoading = false; },
      error: () => { this.isLoading = false; }
    });
  }

  getInitials(prenom: string, nom: string): string {
    return `${prenom?.charAt(0) || ''}${nom?.charAt(0) || ''}`.toUpperCase();
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'ACTIVE':   return 'background:#dcfce7;color:#166534;';
      case 'INACTIVE': return 'background:#fee2e2;color:#991b1b;';
      case 'PENDING':  return 'background:#fef9c3;color:#854d0e;';
      default:         return 'background:#f3f4f6;color:#374151;';
    }
  }

  close(): void { this.dialogRef.close(); }
}