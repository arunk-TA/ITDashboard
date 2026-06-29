// app.routes.ts
import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
    // ✅ Login - Public route (no AuthGuard)
    {
        path: 'login',
        loadComponent: () =>
            import('./components/login/login.component').then(m => m.LoginComponent)
    },
    // ✅ Forgot Password - Public route (no AuthGuard)
    {
        path: 'forgot-password',
        loadComponent: () =>
            import('./components/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent)
    },
    // ✅ All protected routes - require AuthGuard
    {
        path: '',
        canActivate: [AuthGuard],
        loadComponent: () =>
            import('./components/layout/layout.component').then(m => m.LayoutComponent),
        children: [
            {
                path: 'ceo-resourcing',
                loadComponent: () =>
                    import('./components/ceo-resourcing/ceo-resourcing.component').then(m => m.CeoResourcingComponent)
            },
            {
                path: 'ceo-support',
                loadComponent: () =>
                    import('./components/ceo-support/ceo-support.component').then(m => m.CeoSupportComponent)
            },
            {
                path: '',
                redirectTo: 'portfolio',
                pathMatch: 'full'
            },
            {
                path: 'portfolio',
                loadComponent: () =>
                    import('./components/portfolio/portfolio.component').then(m => m.PortfolioComponent)
            },
            {
                path: 'moh-dashboard',  // ← NEW ROUTE
                loadComponent: () =>
                    import('./components/moh-dashboard/moh-dashboard.component').then(m => m.MohDashboardComponent)
            },
            {
                path: 'cr-pipeline',
                loadComponent: () =>
                    import('./components/cr-pipeline/cr-pipeline.component').then(m => m.CrPipelineComponent)
            },
            {
                path: 'releases',
                loadComponent: () =>
                    import('./components/releases/releases.component').then(m => m.ReleasesComponent)
            },
            {
                path: 'alerts',
                loadComponent: () =>
                    import('./components/alerts/alerts.component').then(m => m.AlertsComponent)
            },
            {
                path: 'key-risks',
                loadComponent: () =>
                    import('./components/key-risks/key-risks.component').then(m => m.KeyRisksComponent)
            },
            {
                path: 'ceo-attention',
                loadComponent: () =>
                    import('./components/ceo-attention/ceo-attention.component').then(m => m.CeoAttentionComponent)
            }
        ]
    },
    {
        path: '**',
        redirectTo: ''
    }
];