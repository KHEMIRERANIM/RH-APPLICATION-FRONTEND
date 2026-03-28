import { Injectable } from '@angular/core';
import { AuthService } from 'app/core/auth/auth.service';

@Injectable({ providedIn: 'root' })
export class RoleService {

  constructor(private authService: AuthService) {}

  get currentUser(): any {
    return this.authService.currentUser;
  }

  get role(): string {
    return this.currentUser?.role || '';
  }

  get userId(): string {
    return this.currentUser?.id || '';
  }

  get userEmail(): string {
    return this.currentUser?.email || '';
  }

  isAdmin(): boolean {
    return this.role === 'ADMIN';
  }

  isEmploye(): boolean {
    return this.role === 'EMPLOYE';
  }

  isCandidat(): boolean {
    return this.role === 'CANDIDAT';
  }
}
