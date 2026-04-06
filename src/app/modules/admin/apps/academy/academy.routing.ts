import { Route } from '@angular/router';
import { AcademyComponent } from './academy.component';
import { AcademyDashboardComponent } from './dashboard/dashboard.component';
import { EmployeeComponent } from './employee/employee.component';
import { AcademyRedirectComponent } from './redirect.component';

export const academyRoutes: Route[] = [
    {
        path: '',
        component: AcademyComponent,
        children: [
            {
                path: '',
                component: AcademyRedirectComponent  // ← Redirige selon le rôle
            },
            {
                path: 'admin',
                component: AcademyDashboardComponent
            },
            {
                path: 'employee',
                component: EmployeeComponent
            }
        ]
    }
];