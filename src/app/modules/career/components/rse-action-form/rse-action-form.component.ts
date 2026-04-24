import { Component, OnInit } from '@angular/core';
import { RseService } from '../../services/rse.service';
import { RseActionRequest } from '../../models/rse-action.model';
import { RseUserData } from '../../models/rse-user-data.model';
import { AuthRoleService } from '../../services/auth-role.service';

@Component({
  selector: 'app-rse-action-form',
  templateUrl: './rse-action-form.component.html',
  styleUrls: ['./rse-action-form.component.scss']
})
export class RseActionFormComponent implements OnInit {
  formData: RseActionRequest = {
    employeeId: '',
    type: '',
    description: ''
  };

  userData?: RseUserData;
  employeeActions: any[] = [];

  successMessage = '';
  errorMessage = '';
  isSubmitting = false;

  constructor(
    private rseService: RseService,
    private authRole: AuthRoleService
  ) {}

  ngOnInit(): void {
    const userId = this.getConnectedUserId();

    if (!userId) {
      this.errorMessage = 'Utilisateur non connecté.';
      return;
    }

    this.formData.employeeId = userId;
    this.loadUserData(userId);
    this.loadEmployeeActions(userId);
  }

  getConnectedUserId(): string {
    return this.authRole.getCurrentUserId() || '';
  }

  loadUserData(userId: string): void {
    if (!userId) {
      return;
    }

    this.rseService.getUserRseData(userId).subscribe({
      next: (data) => {
        this.userData = data;
      },
      error: (err) => {
        console.error('Erreur chargement données RSE utilisateur', err);
      }
    });
  }

  loadEmployeeActions(userId: string): void {
    this.rseService.getEmployeeActions(userId).subscribe({
      next: (data) => {
        this.employeeActions = data;
      },
      error: (err) => {
        console.error('Erreur chargement historique RSE employé', err);
      }
    });
  }

  submitAction(): void {
    this.successMessage = '';
    this.errorMessage = '';

    if (!this.formData.employeeId) {
      this.errorMessage = 'Utilisateur non connecté.';
      return;
    }

    if (!this.formData.type || !this.formData.description.trim()) {
      this.errorMessage = 'Veuillez remplir tous les champs.';
      return;
    }

    this.isSubmitting = true;

    this.rseService.submitAction(this.formData).subscribe({
      next: () => {
        this.successMessage = 'Action RSE soumise avec succès.';
        this.errorMessage = '';
        this.formData.type = '';
        this.formData.description = '';
        this.isSubmitting = false;

        this.loadUserData(this.formData.employeeId);
        this.loadEmployeeActions(this.formData.employeeId);
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = 'Erreur lors de la soumission.';
        this.successMessage = '';
        this.isSubmitting = false;
      }
    });
  }
}