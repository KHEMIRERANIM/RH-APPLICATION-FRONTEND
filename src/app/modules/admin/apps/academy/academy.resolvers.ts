import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Resolve, Router, RouterStateSnapshot } from '@angular/router';
import { Observable, throwError, map } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { DemandeConge, BulletinSalaire, User, AdminStats } from 'app/modules/admin/apps/academy/academy.types';
import { AcademyService } from 'app/modules/admin/apps/academy/academy.service';

// =============================================================================
//  RESOLVER POUR CHARGER TOUTES LES DEMANDES DE CONGÉ
// =============================================================================
@Injectable({
    providedIn: 'root'
})
export class AcademyDemandesResolver implements Resolve<DemandeConge[]>
{
    constructor(private _academyService: AcademyService) {}

    resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<DemandeConge[]>
    {
        return this._academyService.getAllDemandes();
    }
}

// =============================================================================
//  RESOLVER POUR CHARGER LES DEMANDES EN ATTENTE
// =============================================================================
@Injectable({
    providedIn: 'root'
})
export class AcademyDemandesEnAttenteResolver implements Resolve<DemandeConge[]>
{
    constructor(private _academyService: AcademyService) {}

    resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<DemandeConge[]>
    {
        return this._academyService.getDemandesEnAttente();
    }
}

// =============================================================================
//  RESOLVER POUR CHARGER TOUS LES BULLETINS DE SALAIRE
// =============================================================================
@Injectable({
    providedIn: 'root'
})
export class AcademyBulletinsResolver implements Resolve<BulletinSalaire[]>
{
    constructor(private _academyService: AcademyService) {}

    resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<BulletinSalaire[]>
    {
        return this._academyService.getAllBulletins();
    }
}

// =============================================================================
//  RESOLVER POUR CHARGER TOUS LES EMPLOYÉS
// =============================================================================
@Injectable({
    providedIn: 'root'
})
export class AcademyEmployesResolver implements Resolve<User[]>
{
    constructor(private _academyService: AcademyService) {}

    resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<User[]>
    {
        return this._academyService.getAllEmployes();
    }
}

// =============================================================================
//  RESOLVER POUR CHARGER UNE DEMANDE DE CONGÉ PAR ID
// =============================================================================
@Injectable({
    providedIn: 'root'
})
export class AcademyDemandeResolver implements Resolve<DemandeConge>
{
    constructor(
        private _router: Router,
        private _academyService: AcademyService
    ) {}

    resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<DemandeConge>
    {
        const id = route.paramMap.get('id');
        return this._academyService.getDemandeById(id).pipe(
            catchError((error) => {
                console.error(error);
                const parentUrl = state.url.split('/').slice(0, -1).join('/');
                this._router.navigateByUrl(parentUrl);
                return throwError(error);
            })
        );
    }
}

// =============================================================================
//  RESOLVER POUR CHARGER UN BULLETIN PAR ID
// =============================================================================
@Injectable({
    providedIn: 'root'
})
export class AcademyBulletinResolver implements Resolve<BulletinSalaire>
{
    constructor(
        private _router: Router,
        private _academyService: AcademyService
    ) {}

    resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<BulletinSalaire>
    {
        const id = route.paramMap.get('id');
        return this._academyService.getBulletinById(id).pipe(
            catchError((error) => {
                console.error(error);
                const parentUrl = state.url.split('/').slice(0, -1).join('/');
                this._router.navigateByUrl(parentUrl);
                return throwError(error);
            })
        );
    }
}

// =============================================================================
//  RESOLVER POUR CHARGER LES STATISTIQUES ADMIN
// =============================================================================
@Injectable({
    providedIn: 'root'
})
export class AcademyStatsResolver implements Resolve<AdminStats>
{
    constructor(private _academyService: AcademyService) {}

    resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<AdminStats>
    {
        return this._academyService.getAdminStats();
    }
}