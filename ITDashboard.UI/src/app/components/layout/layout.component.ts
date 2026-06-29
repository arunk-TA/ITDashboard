// layout.component.ts

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet, NavigationEnd, Event } from '@angular/router'; 
import { FormsModule } from '@angular/forms';
import { DashboardService } from '../../services/dashboard.service';
import { DashboardKpiModel, EntityModel, PlatformModel, TicketModel } from '../../models/dashboard.models';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { filter } from 'rxjs/operators';
interface PlatformWithCount {
    id: number;
    name: string;
    ticketCount: number;
}

@Component({
    selector: 'app-layout',
    standalone: true,
    imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, FormsModule],
    templateUrl: './layout.component.html',
    styleUrls: ['./layout.component.css']
})
export class LayoutComponent implements OnInit {
    entities: EntityModel[] = [];
    selectedEntityId: number | null = null;
    kpi: DashboardKpiModel | null = null;

    allPlatforms: PlatformModel[] = [];
    allTickets: TicketModel[] = [];
    selectedEntityPlatforms: PlatformWithCount[] = [];
    selectedPlatformName: string = '';
    selectedEntityNameForPlatforms: string = '';

    hideKpiForRoutes: string[] = ['/ceo-resourcing', '/ceo-support', '/moh-dashboard'];

    showKpiBar: boolean = true;
    isSidebarCollapsed: boolean = false;
    isCEODashboardRoute: boolean = false;

    // ✅ Permission flags
    canViewKeyRisks: boolean = false;
    canViewCEOAttention: boolean = false;

    constructor(
        private svc: DashboardService,
        private router: Router,
        private cdr: ChangeDetectorRef,
        public auth: AuthService
    ) { }

    ngOnInit() {
        // Load saved sidebar state from localStorage
        const savedState = localStorage.getItem('sidebarCollapsed');
        if (savedState !== null) {
            this.isSidebarCollapsed = savedState === 'true';
        }

        this.router.events.pipe(
            filter((event): event is NavigationEnd => event instanceof NavigationEnd)
        ).subscribe((event: NavigationEnd) => {
            this.showKpiBar = !this.hideKpiForRoutes.some(route =>
                event.urlAfterRedirects.startsWith(route)
            );
            this.cdr.detectChanges();
        });

        // ✅ Check initial route
        this.showKpiBar = !this.hideKpiForRoutes.some(route =>
            this.router.url.startsWith(route)
        );


        this.loadEntities();
        this.loadKpi();
        this.setupPermissions();

        forkJoin({
            platforms: this.svc.getPlatforms(),
            tickets: this.svc.getTickets({})
        }).subscribe({
            next: ({ platforms, tickets }) => {
                this.allPlatforms = platforms;
                this.allTickets = tickets;
                this.cdr.detectChanges();

                this.svc.selectedEntity$.subscribe((entity) => {
                    if (entity?.entityId) {
                        this.selectedEntityNameForPlatforms = entity.entityName || '';
                        this.selectedEntityPlatforms = [];
                        this.cdr.detectChanges();
                        this.loadPlatformsForEntity(entity.entityId);
                    } else {
                        this.selectedEntityNameForPlatforms = '';
                        this.selectedEntityPlatforms = [];
                        this.selectedPlatformName = '';
                        this.cdr.detectChanges();
                    }
                });
            },
            error: (err) => {
                console.error('Layout init error:', err);
            }
        });
    }

    // ============================================
    // PERMISSIONS SETUP
    // ============================================
    private setupPermissions(): void {
        this.auth.currentUser$.subscribe((user: any) => {
            if (user) {
                const roles = this.auth.getUserRoles();
                const isCEO = roles.includes('CEO');
                const isSupervisor = roles.includes('Supervisor');
                const isAdmin = roles.includes('Admin');
                const isViewer = this.auth.isViewer;

                // ✅ CEO and Admin and Supervisor can view both
                // ✅ Viewers cannot view either
                // ✅ Raman (Viewer + CEO Attention) can view CEO Attention only

                // Check if user is a Viewer (should not see Key Risks)
                if (isViewer) {
                    // Viewers can only see CEO Attention if they have the role
                    this.canViewKeyRisks = false;  // Viewers CANNOT see Key Risks
                    this.canViewCEOAttention = isCEO || isSupervisor || isAdmin;
                } else {
                    // Non-viewers can see both
                    this.canViewKeyRisks = true;
                    this.canViewCEOAttention = true;
                }

                console.log('🔐 Menu Permissions:', {
                    user: user.email,
                    roles: roles,
                    isViewer: isViewer,
                    isCEO: isCEO,
                    isSupervisor: isSupervisor,
                    isAdmin: isAdmin,
                    canViewKeyRisks: this.canViewKeyRisks,
                    canViewCEOAttention: this.canViewCEOAttention
                });
            } else {
                this.canViewKeyRisks = false;
                this.canViewCEOAttention = false;
            }
            this.cdr.detectChanges();
        });
    }

    logout(): void {
        this.auth.logout();
        this.router.navigate(['/login']);
    }

    get userName(): string {
        const user = this.auth.getCurrentUser();
        return user?.realname || user?.name || 'User';
    }

    get userRole(): string {
        if (this.auth.isAdmin) return 'Admin';
        if (this.auth.isViewer) return 'Viewer';
        return 'User';
    }

    toggleSidebar() {
        this.isSidebarCollapsed = !this.isSidebarCollapsed;
        localStorage.setItem('sidebarCollapsed', String(this.isSidebarCollapsed));
        this.cdr.detectChanges();
    }

    goToPortfolio() {
        this.selectedEntityPlatforms = [];
        this.selectedPlatformName = '';
        this.selectedEntityNameForPlatforms = '';
        this.svc.setSelectedEntity(null);
        this.router.navigate(['/portfolio']);
    }

    loadEntities() {
        this.svc.getEntities().subscribe(data => {
            this.entities = data;
            this.cdr.detectChanges();
        });
    }

    goToKeyRisks() {
        this.selectedEntityPlatforms = [];
        this.selectedPlatformName = '';
        this.selectedEntityNameForPlatforms = '';
        this.svc.setSelectedEntity(null);
        this.router.navigate(['/key-risks']);
    }

    loadKpi() {
        this.svc.getKpi(this.selectedEntityId ?? undefined).subscribe(data => {
            this.kpi = data;
            this.cdr.detectChanges();
        });
    }

    loadPlatformsForEntity(entityId: number) {
        const platformsForEntity = this.allPlatforms.filter(p =>
            p.entityIds && p.entityIds.includes(entityId)
        );

        this.selectedEntityPlatforms = platformsForEntity.map(p => ({
            id: p.id,
            name: p.fieldName,
            ticketCount: this.allTickets.filter(t =>
                t.entityId === entityId && t.platformId === p.id
            ).length
        }));

        this.cdr.detectChanges();
    }

    selectPlatform(platform: PlatformWithCount) {
        this.selectedPlatformName = platform.name;
        this.router.navigate(['/portfolio'], {
            queryParams: { platform: platform.name }
        });
    }

    trackByPlatformId(index: number, platform: PlatformWithCount): number {
        return platform.id;
    }

    onEntityChange() {
        this.loadKpi();
        this.selectedEntityPlatforms = [];
        this.selectedPlatformName = '';
        this.selectedEntityNameForPlatforms = '';
        this.cdr.detectChanges();
    }

    selectedEntityName(): string {
        if (this.selectedEntityId === null) return 'All Organisations';
        const entity = this.entities.find(e => e.id === this.selectedEntityId);
        return entity?.displayName ?? 'All';
    }

    getSelectedEntityName(): string {
        return this.selectedEntityNameForPlatforms;
    }
}