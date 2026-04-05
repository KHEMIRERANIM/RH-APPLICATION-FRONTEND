import { Component, OnInit } from '@angular/core';
import { MobilityService } from '../../services/mobility.service';
import { MobilityRequest } from '../../models/mobility.model';

@Component({
  selector: 'app-employee-mobility',
  templateUrl: './employee-mobility.component.html',
  styleUrls: ['./employee-mobility.component.scss']
})
export class EmployeeMobilityComponent implements OnInit {

  requests: MobilityRequest[] = [];
  isLoading = true;

  statusLabels: Record<string, string> = {
    PENDING:  '⏳ En attente',
    APPROVED: '✅ Approuvé',
    REJECTED: '❌ Refusé',
    ON_HOLD:  '⏸️ En suspens'
  };

  statusColors: Record<string, string> = {
    PENDING:  'background:#fef9c3;color:#854d0e;',
    APPROVED: 'background:#dcfce7;color:#166534;',
    REJECTED: 'background:#fee2e2;color:#991b1b;',
    ON_HOLD:  'background:#e0e7ff;color:#3730a3;'
  };

  constructor(private mobilityService: MobilityService) {}

  ngOnInit(): void {
    this.loadRequests();
  }

  loadRequests(): void {
    this.isLoading = true;

    // ✅ Log pour vérifier l'ID utilisé
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    console.log('👤 currentUser:', user);
    console.log('🔑 employeeId utilisé:', user?.id);

    this.mobilityService.getMyRequests().subscribe({
      next: (data) => {
        console.log('📦 demandes reçues:', data);
        this.requests = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('❌ erreur:', err);
        this.isLoading = false;
      }
    });
  }
}