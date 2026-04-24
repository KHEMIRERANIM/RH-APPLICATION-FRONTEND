import { Injectable } from '@angular/core';
import { FuseMockApiService } from '@fuse/lib/mock-api';

@Injectable({ providedIn: 'root' })
export class NotificationsMockApi {
    constructor(private _fuseMockApiService: FuseMockApiService) {
        // ✅ Mock désactivé — les notifications viennent du backend Spring Boot
        // this.registerHandlers();
    }

    registerHandlers(): void {
        // Désactivé intentionnellement
    }
}