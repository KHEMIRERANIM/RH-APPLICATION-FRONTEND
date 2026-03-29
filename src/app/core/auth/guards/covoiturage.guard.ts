import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../auth.service';

@Injectable({ providedIn: 'root' })
export class CovoiturageGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(): boolean {
    if (this.authService.isAdmin()) {
      this.router.navigate(['/apps/covoiturage/admin']);
    } else {
      this.router.navigate(['/apps/covoiturage/user']);
    }
    return false;
  }
}