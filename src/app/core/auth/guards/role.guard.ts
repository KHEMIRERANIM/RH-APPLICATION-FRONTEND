import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router } from '@angular/router';
import { AuthService } from 'app/core/auth/auth.service';

@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {

  constructor(private _authService: AuthService, private _router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const expectedRoles: string[] = route.data['roles'];
    const user = this._authService.currentUser;
    const userRole = user?.role;

    if (expectedRoles && expectedRoles.includes(userRole)) {
      return true;
    }
    this._router.navigate(['/sign-in']);
    return false;
  }
}
