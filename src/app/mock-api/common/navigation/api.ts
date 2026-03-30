import { Injectable } from '@angular/core';
import { cloneDeep } from 'lodash-es';
import { FuseNavigationItem } from '@fuse/components/navigation';
import { FuseMockApiService } from '@fuse/lib/mock-api';
import { compactNavigation, defaultNavigation, futuristicNavigation, horizontalNavigation } from 'app/mock-api/common/navigation/data';

@Injectable({
    providedIn: 'root'
})
export class NavigationMockApi
{
    private readonly _compactNavigation: FuseNavigationItem[] = compactNavigation;
    private readonly _defaultNavigation: FuseNavigationItem[] = defaultNavigation;
    private readonly _futuristicNavigation: FuseNavigationItem[] = futuristicNavigation;
    private readonly _horizontalNavigation: FuseNavigationItem[] = horizontalNavigation;

    constructor(private _fuseMockApiService: FuseMockApiService)
    {
        this.registerHandlers();
    }

    registerHandlers(): void
    {
        this._fuseMockApiService
            .onGet('api/common/navigation')
            .reply(() => {

                // Lire le rôle depuis localStorage
                const userStr = localStorage.getItem('currentUser');
                let userRole = 'employe';

                if (userStr) {
                    try {
                        const user = JSON.parse(userStr);
                        userRole = user.role;
                    } catch (e) {}
                }

                // Filtrer : cacher section admin si pas admin
                const filteredDefault = cloneDeep(this._defaultNavigation).filter(item => {
                    if (item.id === 'admin') {
                        return userRole === 'admin';
                    }
                    return true;
                });

                // Fill compact navigation
                this._compactNavigation.forEach((compactNavItem) => {
                    filteredDefault.forEach((defaultNavItem) => {
                        if (defaultNavItem.id === compactNavItem.id) {
                            compactNavItem.children = cloneDeep(defaultNavItem.children);
                        }
                    });
                });

                // Fill futuristic navigation
                this._futuristicNavigation.forEach((futuristicNavItem) => {
                    filteredDefault.forEach((defaultNavItem) => {
                        if (defaultNavItem.id === futuristicNavItem.id) {
                            futuristicNavItem.children = cloneDeep(defaultNavItem.children);
                        }
                    });
                });

                // Fill horizontal navigation
                this._horizontalNavigation.forEach((horizontalNavItem) => {
                    filteredDefault.forEach((defaultNavItem) => {
                        if (defaultNavItem.id === horizontalNavItem.id) {
                            horizontalNavItem.children = cloneDeep(defaultNavItem.children);
                        }
                    });
                });

                return [
                    200,
                    {
                        compact   : cloneDeep(this._compactNavigation),
                        default   : cloneDeep(filteredDefault),
                        futuristic: cloneDeep(this._futuristicNavigation),
                        horizontal: cloneDeep(this._horizontalNavigation)
                    }
                ];
            });
    }
}
