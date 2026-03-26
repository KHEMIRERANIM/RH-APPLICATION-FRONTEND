import { Injectable } from '@angular/core';
import { Observable, ReplaySubject } from 'rxjs';

@Injectable()
export class FuseTailwindService
{
    private _tailwindConfig: ReplaySubject<any> = new ReplaySubject<any>(1);

    /**
     * Constructor
     */
    constructor()
    {
        // Provide a hardcoded fallback config with themes to bypass SCSS loader issues in Angular 18
        const config: any = {
            themes: {
                default: {},
                brand: {},
                indigo: {},
                rose: {},
                purple: {},
                amber: {}
            }
        };

        // Execute the observable with the config
        this._tailwindConfig.next(config);
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Accessors
    // -----------------------------------------------------------------------------------------------------

    /**
     * Getter for _tailwindConfig
     */
    get tailwindConfig$(): Observable<any>
    {
        return this._tailwindConfig.asObservable();
    }
}
