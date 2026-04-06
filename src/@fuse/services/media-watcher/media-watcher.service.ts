import { Injectable } from '@angular/core';
import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { Observable, ReplaySubject } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { FuseTailwindService } from '@fuse/services/tailwind/tailwind.service';

@Injectable({
    providedIn: 'root'
})
export class FuseMediaWatcherService
{
    private _onMediaChange: ReplaySubject<{ matchingAliases: string[]; matchingQueries: any }> = new ReplaySubject<{ matchingAliases: string[]; matchingQueries: any }>(1);

    constructor(
        private _breakpointObserver: BreakpointObserver,
        private _fuseTailwindConfigService: FuseTailwindService
    ) {
        this._fuseTailwindConfigService.tailwindConfig$.pipe(
            switchMap(config => {
                // Récupérer les breakpoints et les convertir en string[]
                const breakpointsObj = config?.breakpoints || {};
                const breakpoints: string[] = Object.values(breakpointsObj) as string[];
                
                // Si pas de breakpoints, observer une chaîne vide
                if (breakpoints.length === 0) {
                    return this._breakpointObserver.observe('').pipe(
                        map(() => ({
                            matchingAliases: [],
                            matchingQueries: {}
                        }))
                    );
                }
                
                return this._breakpointObserver.observe(breakpoints).pipe(
                    map((state) => {
                        const matchingAliases: string[] = [];
                        const matchingQueries: any = {};
                        const matchingBreakpoints = Object.entries(state.breakpoints).filter(([query, matches]) => matches) ?? [];
                        for (const [query] of matchingBreakpoints) {
                            const matchingAlias = Object.entries(breakpointsObj).find(([alias, q]) => q === query)?.[0];
                            if (matchingAlias) {
                                matchingAliases.push(matchingAlias);
                                matchingQueries[matchingAlias] = query;
                            }
                        }
                        return {
                            matchingAliases,
                            matchingQueries
                        };
                    })
                );
            })
        ).subscribe((result) => {
            this._onMediaChange.next(result);
        });
    }

    get onMediaChange$(): Observable<{ matchingAliases: string[]; matchingQueries: any }> {
        return this._onMediaChange.asObservable();
    }

    onMediaQueryChange$(query: string | string[]): Observable<BreakpointState> {
        return this._breakpointObserver.observe(query);
    }
}