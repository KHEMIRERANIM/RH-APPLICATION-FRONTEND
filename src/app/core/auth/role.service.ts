import { Injectable } from '@angular/core';
import { AuthService } from 'app/core/auth/auth.service';

@Injectable({ providedIn: 'root' })
export class RoleService {

  constructor(private authService: AuthService) {}

  /**
   * Normalise le rôle renvoyé par l’API (casse, accents, variantes anglaises).
   */
  static normalizeRole(raw: string | null | undefined): string {
    if (raw == null || raw === '') {
      return '';
    }
    let s = String(raw)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .trim();
    if (s === 'EMPLOYEE') {
      s = 'EMPLOYE';
    }
    return s;
  }

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
    return RoleService.normalizeRole(this.role) === 'ADMIN';
  }

  isEmploye(): boolean {
    return RoleService.normalizeRole(this.role) === 'EMPLOYE';
  }

  isCandidat(): boolean {
    return RoleService.normalizeRole(this.role) === 'CANDIDAT';
  }
}
