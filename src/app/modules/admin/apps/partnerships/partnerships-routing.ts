import { Route } from '@angular/router';
import { CatalogueComponent } from './components/catalogue/catalogue.component';
import { MesReservationsComponent } from './components/mes-reservations/mes-reservations.component';
import { MesFavorisComponent } from './components/mes-favoris/mes-favoris.component';
import { AdminDashboardComponent } from './components/admin/admin-dashboard.component';
import { PartenaireFormComponent } from './components/admin/partenaire-form/partenaire-form.component';
import { OffreFormComponent } from './components/admin/offre-form/offre-form.component';

export const partnershipsRoutes: Route[] = [
    {
        path     : '',
        component: CatalogueComponent
    },
    {
        path     : 'mes-reservations',
        component: MesReservationsComponent
    },
    {
        path     : 'mes-favoris',
        component: MesFavorisComponent
    },
    {
        path     : 'admin',
        component: AdminDashboardComponent
    },
    // ── Partenaires ──
    {
        path     : 'admin/partenaires/nouveau',
        component: PartenaireFormComponent
    },
    {
        path     : 'admin/partenaires/modifier/:id',
        component: PartenaireFormComponent
    },
    // ── Offres ──
    {
        path     : 'admin/offres/nouvelle',
        component: OffreFormComponent
    },
    {
        path     : 'admin/offres/modifier/:id',
        component: OffreFormComponent
    }
];
