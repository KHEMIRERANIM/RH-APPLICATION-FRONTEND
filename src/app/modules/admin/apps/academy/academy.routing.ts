import { Route } from '@angular/router';
import { AcademyComponent } from 'app/modules/admin/apps/academy/academy.component';
import { AcademyListComponent } from 'app/modules/admin/apps/academy/list/list.component';
import { AcademyDetailsComponent } from 'app/modules/admin/apps/academy/details/details.component';
import { AcademyDashboardComponent } from './dashboard/dashboard.component';
import { EmployeeComponent } from './employee/employee.component';
import { AcademyRedirectComponent } from './redirect.component';
import { AcademyCategoriesResolver, AcademyCourseResolver, AcademyCoursesResolver } from 'app/modules/admin/apps/academy/academy.resolvers';

export const academyRoutes: Route[] = [
    {
        path: '',
        component: AcademyComponent,
        resolve: {
            categories: AcademyCategoriesResolver
        },
        children: [
            {
                path: '',
                pathMatch: 'full',
                component: AcademyRedirectComponent
            },
            {
                path: 'admin',
                component: AcademyDashboardComponent
            },
            {
                path: 'employee',
                component: EmployeeComponent
            },
            {
                path: 'courses',
                component: AcademyListComponent,
                resolve: {
                    courses: AcademyCoursesResolver
                }
            },
            {
                path: 'courses/:id',
                component: AcademyDetailsComponent,
                resolve: {
                    course: AcademyCourseResolver
                }
            }
        ]
    }
];
