import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AuthRoleService {

  getCurrentUser(): any {
    const userStr = localStorage.getItem('currentUser');
    return userStr ? JSON.parse(userStr) : null;
  }

  getRole(): string {
    return this.getCurrentUser()?.role || '';
  }

  getCurrentUserId(): string {
    return this.getCurrentUser()?.id || '';
  }

  isAdmin(): boolean {
    return this.getRole() === 'ADMIN';
  }

  isRH(): boolean {
    return this.getRole() === 'RH';
  }

  isEmployee(): boolean {
    const role = this.getRole();
    return role === 'EMPLOYEE' || role === 'USER';
  }

  isAdminOrRH(): boolean {
    return this.isAdmin() || this.isRH();
  }
  
}