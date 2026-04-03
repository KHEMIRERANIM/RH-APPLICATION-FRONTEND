import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router } from '@angular/router';
import { AuthService } from 'app/core/auth/auth.service';
import { RoleService } from 'app/core/auth/role.service';

@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {

  constructor(private _authService: AuthService, private _router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const expectedRoles: string[] = route.data['roles'] || [];
    const user = this._authService.currentUser;
    const userNorm = RoleService.normalizeRole(user?.role);

    if (!userNorm) {
      this._router.navigate(['/sign-in']);
      return false;
    }

    const allowed = expectedRoles.map(r => RoleService.normalizeRole(r));
    if (allowed.some(r => r === userNorm)) {
      return true;
    }
    this._router.navigate(['/sign-in']);
    return false;
  }
}
