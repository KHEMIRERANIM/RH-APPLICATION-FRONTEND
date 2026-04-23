import { Route } from '@angular/router';
import { CatalogueComponent } from './components/catalogue/catalogue.component';
import { MesReservationsComponent } from './components/mes-reservations/mes-reservations.component';
import { MesFavorisComponent } from './components/mes-favoris/mes-favoris.component';
import { AdminDashboardComponent } from './components/admin/admin-dashboard.component';
import { PartenaireFormComponent } from './components/admin/partenaire-form/partenaire-form.component';
import { OffreAvantageFormComponent } from './components/admin/offre-avantage-form/offre-avantage-form.component';
import { StatAvantageComponent } from './components/stat-avantage/stat-avantage.component';

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
        component: OffreAvantageFormComponent
    },
    {
        path     : 'admin/offres/modifier/:id',
        component: OffreAvantageFormComponent
    },
    // ── Statistiques ──
    {
        path     : 'admin/stats-avantages',
        component: StatAvantageComponent
    }
];
