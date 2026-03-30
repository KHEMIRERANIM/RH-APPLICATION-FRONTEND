import { Route } from '@angular/router';
import { AcademyComponent } from 'app/modules/admin/apps/academy/academy.component';
import { AcademyDashboardComponent } from 'app/modules/admin/apps/academy/dashboard/dashboard.component';
import { 
    AcademyDemandesResolver, 
    AcademyStatsResolver,
    AcademyEmployesResolver,
    AcademyBulletinsResolver
} from 'app/modules/admin/apps/academy/academy.resolvers';

export const academyRoutes: Route[] = [
    {
        path     : '',
        component: AcademyComponent,
        children : [
            {
                path     : '',
                pathMatch: 'full',
                component: AcademyDashboardComponent,
                resolve  : {
                    stats: AcademyStatsResolver,
                    demandes: AcademyDemandesResolver,
                    employes: AcademyEmployesResolver,
                    bulletins: AcademyBulletinsResolver
                }
            }
        ]
    }
];