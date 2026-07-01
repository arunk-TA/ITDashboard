import { Component, OnInit, ChangeDetectorRef, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DashboardService } from '../../services/dashboard.service';
import { PortfolioSummaryModel, TicketModel, PlatformInfo } from '../../models/dashboard.models';
import { forkJoin,of } from 'rxjs';
import { RichTextEditorComponent } from '../rich-text-editor/rich-text-editor.component';
import { environment } from '../../../environments/environment';
import { TTSService } from '../../services/tts.service';
import { AuthService } from '../../services/auth.service';
import { Pipe, PipeTransform } from '@angular/core';
import { catchError, map } from 'rxjs/operators';

@Pipe({
    name: 'rnTypeFilter',
    standalone: true
})

export class RNTypeFilterPipe implements PipeTransform {
    transform(items: any[], type: 'feature' | 'bug'): number {
        if (!items || !Array.isArray(items)) return 0;
        if (type === 'feature') {
            return items.filter(i => i.typeName !== 'Issue').length;
        } else {
            return items.filter(i => i.typeName === 'Issue').length;
        }
    }
}


// ✅ Add type declaration right after imports


@Component({
    selector: 'app-portfolio',
    standalone: true,
    imports: [CommonModule, FormsModule, RichTextEditorComponent, RNTypeFilterPipe],
    templateUrl: './portfolio.component.html',
    styleUrls: ['./portfolio.component.css'],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
   
export class PortfolioComponent implements OnInit {
    showCreateTicketModal = false;
    savingTicket = false;
    newTicket: any = {};
    rnTicketImages: { [ticketId: string]: { file: File; base64: string; caption: string }[] } = {};

    showRNPreviewModal = false;
    rnPreviewItems: any[] = [];
    rnConfigImpact: string = ''; // Initialize as empty string!

    showAuditLogModal: boolean = false;
    auditLogs: any[] = [];
    loadingAuditLog: boolean = false;
    selectedTicketForAudit: any = null;

    allCategories: any[] = [];
    allDepartments: any[] = [];

    private readonly closedStatusIds = [46, 153];


    _canEdit: boolean = false;
    _canDelete: boolean = false;
    _canAssignResource: boolean = false;
    _canCreate: boolean = false;
    _isViewer: boolean = true;

    toasts: { id: number; message: string; type: 'success' | 'error' | 'info'; visible: boolean }[] = [];
    showConfirmDialog: boolean = false;
    confirmDialogMessage: string = '';
    confirmDialogCallback: (() => void) | null = null;

    // ==================== RELEASE NOTES PREVIEW ====================
    rnPreviewSection: 'current' | 'future' = 'current';
    rnPreviewFilename: string = '';

    // Editable fields in preview
    rnAuthorName: string = '';
    rnApproverName: string = '';
    rnOverviewText: string = '';
    rnSpecialInstructions: string = 'NA';
    rnCustomLogoBase64: string | null = null;
    rnLogoPreviewUrl: string | null = null;


    private toastCounter = 0;
    editingBuildNo: { [key: string]: boolean } = {};
    selectedNewBuildNo: { [key: string]: string } = {};
    savingBuildNo: { [key: string]: boolean } = {};

    editingPlannedDate: { [key: string]: boolean } = {};
    selectedNewPlannedDate: { [key: string]: string } = {};
    savingPlannedDate: { [key: string]: boolean } = {};

    editingBuildDate: { [key: string]: boolean } = {};
    selectedNewBuildDate: { [key: string]: string } = {};

    deletingTicket: { [key: string]: boolean } = {};
    showDeleteConfirm: { [key: string]: boolean } = {};
    deleteReason: { [key: string]: string } = {};

    savingBuildDate: { [key: string]: boolean } = {};
    pendingDocFiles: { [buildNo: string]: File | null } = {};
    uploadSuccess: { [buildNo: string]: boolean } = {};
    apiBaseUrl: string = environment.apiUrl;
    editingStatus: { [key: string]: boolean } = {};
    selectedNewStatus: { [key: string]: string } = {};
    availableStatuses: any[] = [];
    savingStatus: { [key: string]: boolean } = {};
    buildDocs: { [buildNo: string]: any[] } = {};
    uploadingDoc: { [buildNo: string]: boolean } = {};
    loadingDocs: { [buildNo: string]: boolean } = {};
    showDocsPanel: { [buildNo: string]: boolean } = {};

    preloadedKeys: Set<string> = new Set();
    loadedReleaseNotes: Set<string> = new Set();
    showTextEditor: { [key: string]: boolean } = {};
    releaseNoteContent: { [key: string]: string } = {};
    savingReleaseNote: { [key: string]: boolean } = {};
    loadingReleaseNote: { [key: string]: boolean } = {};

    allUsers: any[] = [];
    selectedUser: { [key: string]: number } = {};
    editingUser: { [key: string]: boolean } = {};
    savingUser: { [key: string]: boolean } = {};

    openStatusIds: number[] = [];
    pipelineCardsByStatus: Map<string, any[]> = new Map();
    inProgressStatusIds: number[] = [];
    inProductionStatusIds: number[] = [];
    priorityList: any[] = [];
    isCurrentBuildsExpanded: boolean = false;
    isFutureReleasesExpanded: boolean = false;
    isPreviousBuildsExpanded: boolean = false;
    activeMenu: string = 'portfolio';
    allEntities: PortfolioSummaryModel[] = [];
    filteredEntities: PortfolioSummaryModel[] = [];
    selectedEntity: PortfolioSummaryModel | null = null;
    selectedEntityCategories: PortfolioSummaryModel[] = [];
     
    allTickets: TicketModel[] = [];
    searchTerm = '';
    loading = true;
    categoryReleases: Map<string, TicketModel[]> = new Map();
    crData: any[] = [];
    issueData: any[] = [];
    expandedDepts: Set<string> = new Set();
    groupedDataArray: { title: string; data: any[] }[] = [];
    expandedRows: Set<PortfolioSummaryModel> = new Set();
    viewType: 'department' | 'build' | 'pipeline' = 'department';
    buildWiseData: any[] = [];
    expandedBuilds: Set<string> = new Set();
    currentBuildData: any = { items: [] };
    previousBuildsData: any[] = [];
    showDepartmentWise: boolean = true;
    showBuildWise: boolean = false;
    selectedView: 'department' | 'build' | 'pipeline' = 'build';
    selectedPlatform: any = null;
    platformGroupedData: any[] = [];
    platformCurrentBuildData: any = { items: [] };
    platformPreviousBuildsData: any[] = [];
    platformFutureReleasesData: any = { items: [] };
    platformFilter: string | null = null;

    pipelineTickets: any[] = [];
    filteredPipelineTickets: any[] = [];
    filterPriority = '';
    pipelineSearchTerm = '';
    pipelineLoading = false;
    pipelineStages: { label: string; statuses: string[]; color: string }[] = [];
    showUpdateIncidentModal = false;
    incidentSearchTerm = '';
    incidentSearchResults: any[] = [];
    selectedIncident: any = null;
    searchingIncidents = false;
    activatingIncident = false;
    private incidentSearchDebounce: any;

    get canEdit(): boolean { return this._canEdit; }
    get canDelete(): boolean { return this._canDelete; }
    get canAssignResource(): boolean { return this._canAssignResource; }
    get canCreate(): boolean { return this._canCreate; }
    get isViewer(): boolean { return this._isViewer; }
    constructor(
        private svc: DashboardService,
        private cdr: ChangeDetectorRef,
        private route: ActivatedRoute,
        private router: Router,
        private tts: TTSService,
        public auth: AuthService
    ) { }

    ngOnInit() {
        this.auth.currentUser$.subscribe(user => {
            if (user) {
                // Get user roles
                const roles = this.auth.getUserRoles();
                const isCEO = roles.includes('CEO');
                const isSupervisor = roles.includes('Supervisor');
                const isAdmin = roles.includes('Admin');

                // Check if user has management role (Supervisor or Admin)
                const hasManagementRole = isSupervisor || isAdmin;

                // CEO should have VIEW ONLY on Portfolio page
                // Supervisors and Admins have FULL ACCESS
                if (hasManagementRole) {
                    // Supervisors and Admins: Full access
                    this._canEdit = true;
                    this._canDelete = true;
                    this._canAssignResource = true;
                    this._canCreate = true;
                    this._isViewer = false;
                } else {
                    // CEO and Viewers: View only
                    this._canEdit = false;
                    this._canDelete = false;
                    this._canAssignResource = false;
                    this._canCreate = false;
                    this._isViewer = true;
                }

                console.log('🔍 Portfolio Permissions:', {
                    user: user.email,
                    roles: roles,
                    isCEO: isCEO,
                    isSupervisor: isSupervisor,
                    isAdmin: isAdmin,
                    hasManagementRole: hasManagementRole,
                    canEdit: this._canEdit,
                    canDelete: this._canDelete,
                    canAssignResource: this._canAssignResource,
                    canCreate: this._canCreate,
                    isViewer: this._isViewer
                });
            } else {
                this._canEdit = false;
                this._canDelete = false;
                this._canAssignResource = false;
                this._canCreate = false;
                this._isViewer = true;
            }
            this.cdr.detectChanges();
        });
        this.svc.getMasterConfig(undefined, 'Status').subscribe({
            next: (statuses) => {
                // Sort statuses by field_name alphabetically
                this.availableStatuses = statuses
                    .filter(s => s.isActive === 'Y')
                    .sort((a, b) => a.fieldName.localeCompare(b.fieldName));
                this.cdr.detectChanges();
            },
            error: (err) => console.error('Error loading statuses:', err)
        });
        this.svc.getMasterConfig(undefined, 'Department').subscribe({
            next: (depts) => {
                this.allDepartments = depts.filter(d => d.isActive === 'Y');
                this.cdr.detectChanges();
            },
            error: (err) => console.error('Error loading departments:', err)
        });

        forkJoin({
            summary: this.svc.getPortfolioSummary().pipe(catchError(e => { console.error('❌ summary failed:', e.status, e.message); return of([]); })),
            tickets: this.svc.getTickets({}).pipe(catchError(e => { console.error('❌ tickets failed:', e.status, e.message); return of([]); })),
            platforms: this.svc.getPlatforms().pipe(catchError(e => { console.error('❌ platforms failed:', e.status, e.message); return of([]); })),
            statuses: this.svc.getMasterConfig(undefined, 'Status').pipe(catchError(e => { console.error('❌ statuses failed:', e.status, e.message); return of([]); })),
            priorities: this.svc.getMasterConfig(undefined, 'Priority').pipe(catchError(e => { console.error('❌ priorities failed:', e.status, e.message); return of([]); }))
        }).subscribe({
            next: ({ summary, tickets, platforms, statuses, priorities }) => {
                console.log('summary count:', summary.length);
                console.log('tickets count:', tickets.length);

                this.allTickets = tickets;
                this.priorityList = priorities;
                this.buildPipelineStages(statuses);

                statuses.forEach(status => {
                    const name = status.fieldName?.toLowerCase().trim() || '';
                    const id = status.id;
                    if (name === 'in production') {
                        this.inProductionStatusIds.push(id);
                    }
                    else if (id === 500 || name === 'requirement analysis' || name === 'poc-tostart') {
                        this.openStatusIds.push(id);
                    }
                    else {
                        this.inProgressStatusIds.push(id);
                    }
                });

                const entityMap = new Map<number, PortfolioSummaryModel>();
                summary.forEach(item => {
                    if (!entityMap.has(item.entityId)) {
                        entityMap.set(item.entityId, {
                            entityId: item.entityId,
                            entityName: item.entityName,
                            displayOrder: item.displayOrder,
                            totalTickets: 0,
                            openTickets: 0,
                            inProgress: 0,
                            yetToStart: 0,
                            inProduction: 0,
                            overdue: 0,
                            platforms: platforms
                                .filter(p => p.entityIds.includes(item.entityId ?? 0))
                                .map(p => ({ id: p.id, name: p.fieldName }))
                        });
                    }
                    const entity = entityMap.get(item.entityId)!;
                    entity.overdue += item.overdue;
                });

                entityMap.forEach((entity, entityId) => {
                    const closedStatusIds = [46, 153]; // Closed, Solved
                    const entityTickets = tickets.filter(t =>
                        t.entityId === entityId &&
                        !closedStatusIds.includes(t.statusId ?? 0)  // ← exclude closed/solved
                    );
                    entity.totalTickets = entityTickets.length;
                    entity.inProduction = entityTickets.filter(t => this.inProductionStatusIds.includes(t.statusId ?? 0)).length;
                    entity.openTickets = entityTickets.filter(t => this.openStatusIds.includes(t.statusId ?? 0)).length;
                    entity.inProgress = entityTickets.filter(t => this.inProgressStatusIds.includes(t.statusId ?? 0)).length;
                    entity.yetToStart = entity.openTickets;
                });

                const orderMap = new Map<number, number>();
                orderMap.set(6, 1);   // Stemz Healthcare
                orderMap.set(35, 2);  // Nederlands Diagnostics India
                orderMap.set(36, 3);  // ND Phisantae
                orderMap.set(37, 4);  // Soul Space
                orderMap.set(38, 5);  // Internal Projects
                orderMap.set(39, 6);  // Non-Functional
                orderMap.set(40, 7);  // MIS
                orderMap.set(41, 8);  // Stemz Global
                orderMap.set(42, 9);  // Cancer Care
                orderMap.set(43, 10); // Stemz Bridge

                const enriched = Array.from(entityMap.values())
                    .sort((a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999));

                this.allEntities = enriched;
                this.filteredEntities = [...enriched];
                this.loading = false;
                this.cdr.detectChanges();

                const currentEntity = this.svc.getCurrentEntity();
                if (currentEntity?.entityId) {
                    const enrichedEntity = this.allEntities.find(e => e.entityId === currentEntity.entityId);
                    if (enrichedEntity && !this.selectedEntity) {
                        this.selectedEntity = enrichedEntity;
                        this.loadEntityData(enrichedEntity.entityId ?? 0);
                        this.cdr.detectChanges();
                    }
                }

                this.svc.selectedEntity$.subscribe((entity) => {
                    if (!entity) {
                        this.resetToHomeState();
                        this.selectedEntity = null;
                        this.cdr.detectChanges();
                        return;
                    }
                    const enrichedEntity = this.allEntities.find(e => e.entityId === entity.entityId);
                    if (!enrichedEntity) return;
                    if (this.selectedEntity?.entityId !== enrichedEntity.entityId) {
                        this.selectedEntity = enrichedEntity;
                        this.resetEntityState();
                        this.loadEntityData(enrichedEntity.entityId ?? 0);
                        this.cdr.detectChanges();
                    }
                });

                this.route.queryParams.subscribe(params => {
                    this.platformFilter = params['platform'] || null;
                    if (this.platformFilter && this.selectedEntity) {
                        setTimeout(() => {
                            this.applyPlatformFilter(this.platformFilter!);
                            this.cdr.detectChanges();
                        }, 100);
                    }
                });
            },
            error: (err: any) => {
                console.error('Portfolio init error:', err);
                this.loading = false;
                this.cdr.detectChanges();
            }
        });
        this.svc.getActiveUsers().subscribe({
            next: (users) => {
                this.allUsers = users;
                this.cdr.detectChanges();
            },
            error: (err) => console.error('Error loading users:', err)
        });
    }
    triggerFileInput(buildNo: string): void {
        const input = document.getElementById('fileInput_' + buildNo) as HTMLInputElement;
        if (input) {
            input.value = '';
            input.click();
        }
    }

    openUpdateIncidentModal(): void {
        this.incidentSearchTerm = '';
        this.incidentSearchResults = [];
        this.selectedIncident = null;
        this.showUpdateIncidentModal = true;
        this.cdr.detectChanges();
    }

    closeUpdateIncidentModal(): void {
        this.showUpdateIncidentModal = false;
        this.incidentSearchTerm = '';
        this.incidentSearchResults = [];
        this.selectedIncident = null;
        this.cdr.detectChanges();
    }

    onIncidentSearchInput(): void {
        clearTimeout(this.incidentSearchDebounce);
        this.selectedIncident = null;
        const term = this.incidentSearchTerm.trim();
        if (term.length < 2) {
            this.incidentSearchResults = [];
            this.cdr.detectChanges();
            return;
        }
        this.incidentSearchDebounce = setTimeout(() => this.doSearchIncidents(term), 350);
    }

    private doSearchIncidents(term: string): void {
        this.searchingIncidents = true;
        this.svc.searchIncidents(term).subscribe({
            next: (results) => {
                this.incidentSearchResults = results || [];
                this.searchingIncidents = false;
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error('Error searching incidents:', err);
                this.incidentSearchResults = [];
                this.searchingIncidents = false;
                this.showToast('Failed to search incidents', 'error');
                this.cdr.detectChanges();
            }
        });
    }

    selectIncident(ticket: any): void {
        this.selectedIncident = ticket;
        this.cdr.detectChanges();
    }

    confirmUpdateIncident(): void {
        debugger;
        if (!this.selectedIncident) return;
        const ticket = this.selectedIncident;
        this.openConfirmDialog(
            `Are you sure you want to update Incident #${ticket.ticketNo || ticket.id} - "${ticket.title}"?`,
            () => this.activateSelectedIncident()
        );
    }

    private activateSelectedIncident(): void {
        if (!this.selectedIncident) return;
        const ticketId = this.selectedIncident.id;
        this.activatingIncident = true;
        this.cdr.detectChanges();

        this.svc.activateTicket(ticketId).subscribe({
            next: () => {
                this.activatingIncident = false;
                this.showUpdateIncidentModal = false;
                this.showToast('Incident updated successfully', 'success');
                this.refreshCurrentPlatformData();
                this.cdr.detectChanges();
            },
            error: (err: any) => {
                console.error('Error activating incident:', err);
                this.activatingIncident = false;
                this.showToast('Failed to update incident: ' + (err.error?.error || err.message), 'error');
                this.cdr.detectChanges();
            }
        });
    }


    openCreateTicketModal(buildNo?: string): void {
        this.newTicket = {
            entityId: Number(this.selectedEntity?.entityId),
            platformId: Number(this.selectedPlatform?.id),
            scheduleBuildNo: buildNo || null,  
            typeId: 1,
            statusId: null,
            priorityId: null,
            departmentId: null,
            categoryId: null,
            title: '',
            description: '',
            plannedDate: null,
            scheduleBuildDate: null,
            assignedUserId: null
        };


        this.svc.getCategories(this.selectedEntity?.entityId).subscribe({
            next: (cats) => {
                this.allCategories = cats;
                this.cdr.detectChanges();
            },
            error: () => { this.allCategories = []; }
        });

        this.showCreateTicketModal = true;
        this.cdr.detectChanges();
    }

    closeCreateTicketModal(): void {
        this.showCreateTicketModal = false;
        this.newTicket = {};
        this.cdr.detectChanges();
    }

    saveNewTicket(): void {
        debugger;
        if (!this.newTicket.title?.trim()) {
            this.showToast('Title is required', 'error');
            return;
        }
        if (!this.newTicket.categoryId) {
            this.showToast('Category is required', 'error');
            return;
        }

        // ✅ Force all IDs to integers before sending
        const payload = {
            ...this.newTicket,
            entityId: this.newTicket.entityId ? Number(this.newTicket.entityId) : null,
            platformId: this.newTicket.platformId ? Number(this.newTicket.platformId) : null,
            statusId: this.newTicket.statusId ? Number(this.newTicket.statusId) : null,
            typeId: this.newTicket.typeId ? Number(this.newTicket.typeId) : null,
            priorityId: this.newTicket.priorityId ? Number(this.newTicket.priorityId) : null,
            departmentId: this.newTicket.departmentId ? Number(this.newTicket.departmentId) : null,
            categoryId: this.newTicket.categoryId ? Number(this.newTicket.categoryId) : null,
            assignedUserId: this.newTicket.assignedUserId ? Number(this.newTicket.assignedUserId) : null,
        };

        console.log('🎫 Sending payload:', JSON.stringify(payload));

        this.savingTicket = true;
        this.svc.createTicket(payload).subscribe({
            next: () => {
                this.savingTicket = false;
                this.showCreateTicketModal = false;
                this.showToast('Ticket created successfully', 'success');
                this.refreshCurrentPlatformData();
                this.cdr.detectChanges();
            },
            error: (err) => {
                this.savingTicket = false;
                this.showToast('Failed to create ticket: ' + (err.error?.error || err.message), 'error');
                this.cdr.detectChanges();
            }
        });
    }
    openConfirmDialog(message: string, callback: () => void): void {
        this.confirmDialogMessage = message;
        this.confirmDialogCallback = callback;
        this.showConfirmDialog = true;
        this.cdr.detectChanges();
    }

    onConfirmYes(): void {
        this.showConfirmDialog = false;
        if (this.confirmDialogCallback) {
            this.confirmDialogCallback();
        }
        this.confirmDialogCallback = null;
        this.cdr.detectChanges();
    }

    onConfirmNo(): void {
        this.showConfirmDialog = false;
        this.confirmDialogCallback = null;
        this.cdr.detectChanges();
    }
    openAuditLogModal(ticket: any, event: Event): void {
        event.stopPropagation(); // Prevent triggering row click

        // Check if user is Supervisor
        const roles = this.auth.getUserRoles();
        const isSupervisor = roles.includes('Supervisor') || roles.includes('Admin');

        if (!isSupervisor) {
            this.showToast('Only Supervisors can view audit logs', 'error');
            return;
        }

        this.selectedTicketForAudit = ticket;
        this.showAuditLogModal = true;
        this.loadingAuditLog = true;
        this.auditLogs = [];
        this.cdr.detectChanges();

        this.svc.getTicketAuditLog(ticket.id).subscribe({
            next: (logs) => {
                this.auditLogs = logs || [];
                this.loadingAuditLog = false;
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error('Error loading audit log:', err);
                this.loadingAuditLog = false;
                this.showToast('Failed to load audit log', 'error');
                this.cdr.detectChanges();
            }
        });
    }

    closeAuditLogModal(): void {
        this.showAuditLogModal = false;
        this.auditLogs = [];
        this.selectedTicketForAudit = null;
        this.cdr.detectChanges();
    }

    getActionBadgeClass(action: string): string {
        const actionMap: { [key: string]: string } = {
            'CREATED': 'badge-success',
            'STATUS_CHANGED': 'badge-primary',
            'BUILD_NO_CHANGED': 'badge-info',
            'PLANNED_DATE_CHANGED': 'badge-warning',
            'BUILD_DATE_CHANGED': 'badge-warning',
            'ASSIGNED_USER_CHANGED': 'badge-secondary',
            'DEACTIVATED': 'badge-danger',
            'ACTIVATED': 'badge-success'
        };
        return actionMap[action] || 'badge-secondary';
    }

    getActionIcon(action: string): string {
        const iconMap: { [key: string]: string } = {
            'CREATED': '➕',
            'STATUS_CHANGED': '🔄',
            'BUILD_NO_CHANGED': '🏷️',
            'PLANNED_DATE_CHANGED': '📅',
            'BUILD_DATE_CHANGED': '📅',
            'ASSIGNED_USER_CHANGED': '👤',
            'DEACTIVATED': '🗑️',
            'ACTIVATED': '✅'
        };
        return iconMap[action] || '📝';
    }

    formatAuditValue(value: string): string {
        if (!value) return '—';
        // Truncate long values
        if (value.length > 50) {
            return value.substring(0, 50) + '...';
        }
        return value;
    }


    toggleDocsPanel(build: any): void {
        const key = build.buildNo;
        console.log('🔵 Toggling docs panel for build:', key);
        console.log('🔵 Build object:', build);
        console.log('🔵 Selected platform:', this.selectedPlatform);
        console.log('🔵 Selected entity:', this.selectedEntity);

        this.showDocsPanel[key] = !this.showDocsPanel[key];
        if (this.showDocsPanel[key] && !this.buildDocs[key]) {
            this.loadBuildDocuments(build);
        }
    }
    loadBuildDocuments(build: any): void {
        const key = build.buildNo;
        this.loadingDocs[key] = true;
        this.svc.getBuildDocuments(build.buildNo, this.selectedPlatform?.id).subscribe({
            next: (docs) => {
                this.buildDocs[key] = docs;
                this.loadingDocs[key] = false;
                this.cdr.detectChanges();
            },
            error: () => { this.loadingDocs[key] = false; this.cdr.detectChanges(); }
        });
    }
    editBuildNo(item: any): void {
        if (!this._canEdit) return;
        const key = this.getTicketKey(item);
        this.editingBuildNo[key] = true;
        this.selectedNewBuildNo[key] = item.buildNo || '';
        this.cdr.detectChanges();
    }

    editPlannedDate(item: any): void {
        if (!this._canEdit) return;
        const key = this.getTicketKey(item);
        this.editingPlannedDate[key] = true;
        this.selectedNewPlannedDate[key] = this.toLocalDateString(item.plannedDate) || '';
        this.cdr.detectChanges();
    }

    editBuildDate(item: any): void {
        if (!this._canEdit) return;
        const key = this.getTicketKey(item);
        this.editingBuildDate[key] = true;
        this.selectedNewBuildDate[key] = this.toLocalDateString(item.scheduleBuildDate) || '';
        this.cdr.detectChanges();
    }

    editStatus(item: any): void {
        if (!this._canEdit) return;
        const key = this.getStatusKey(item);
        this.editingStatus[key] = true;
        this.selectedNewStatus[key] = item.statusName || '';
        this.cdr.detectChanges();
    }

    editUser(item: any): void {
        if (!this._canAssignResource) return;
        const key = this.getUserKey(item);
        this.editingUser[key] = true;
        this.selectedUser[key] = item.assignedUserId || 0;
        this.cdr.detectChanges();
    }

    confirmDeleteTicket(item: any): void {
        if (!this._canDelete) return;
        const key = this.getTicketKey(item);
        this.showDeleteConfirm[key] = true;
        this.deleteReason[key] = '';
        this.cdr.detectChanges();
    }

    cancelDeleteTicket(item: any): void {
        const key = this.getTicketKey(item);
        this.showDeleteConfirm[key] = false;
        this.deleteReason[key] = '';
        this.cdr.detectChanges();
    }

    showToast(message: string, type: 'success' | 'error' | 'info' = 'success', duration: number = 3000): void {
        const id = ++this.toastCounter;
        this.toasts.push({ id, message, type, visible: true });
        this.cdr.detectChanges();

        if (type !== 'error') {
            setTimeout(() => this.dismissToast(id), duration);
        }
    }

    dismissToast(id: number): void {
        const toast = this.toasts.find(t => t.id === id);
        if (toast) {
            toast.visible = false;
            this.cdr.detectChanges();
            setTimeout(() => {
                this.toasts = this.toasts.filter(t => t.id !== id);
                this.cdr.detectChanges();
            }, 300);
        }
    }
    deleteTicket(item: any): void {
        const key = this.getTicketKey(item);
        const reason = this.deleteReason[key]?.trim() || 'No reason provided';

        this.deletingTicket[key] = true;
        this.cdr.detectChanges();

        this.svc.deactivateTicket(item.id, reason).subscribe({
            next: () => {
                console.log('Ticket deactivated successfully');
                this.deletingTicket[key] = false;
                this.showDeleteConfirm[key] = false;
                // Refresh the data
                this.refreshCurrentPlatformData();
                this.cdr.detectChanges();
            },
            error: (err: any) => {
                console.error('Error deactivating ticket:', err);
                this.deletingTicket[key] = false;
                this.cdr.detectChanges();
                this.showToast('Failed to deactivate ticket. Please try again.', 'error');
            }
        });
    }

    //onDocFileSelected(event: Event, build: any): void {
    //    const input = event.target as HTMLInputElement;
    //    if (!input.files?.length) return;
    //    const file = input.files[0];
    //    const key = build.buildNo;
    //    this.uploadingDoc[key] = true;
    //    this.svc.uploadBuildDocument(
    //        file, build.buildNo,
    //        this.selectedPlatform?.id,
    //        this.selectedEntity?.entityId
    //    ).subscribe({
    //        next: () => {
    //            this.uploadingDoc[key] = false;
    //            this.loadBuildDocuments(build); // reload list
    //            this.cdr.detectChanges();
    //        },
    //        error: () => { this.uploadingDoc[key] = false; this.cdr.detectChanges(); }
    //    });
    //    input.value = ''; // reset input
    //}
    confirmUploadDoc(build: any): void {
        const key = build.buildNo;
        const file = this.pendingDocFiles[key];
        if (!file) return;

        this.uploadingDoc[key] = true;
        this.uploadSuccess[key] = false;
        this.cdr.detectChanges();

        this.svc.uploadBuildDocument(
            file, build.buildNo,
            this.selectedPlatform?.id,
            this.selectedEntity?.entityId
        ).subscribe({
            next: () => {
                this.uploadingDoc[key] = false;
                this.uploadSuccess[key] = true;
                this.pendingDocFiles[key] = null;
                this.loadBuildDocuments(build);
                this.cdr.detectChanges();

                // Clear success message after 3 seconds
                setTimeout(() => {
                    this.uploadSuccess[key] = false;
                    this.cdr.detectChanges();
                }, 3000);
            },
            error: () => {
                this.uploadingDoc[key] = false;
                this.cdr.detectChanges();
                this.showToast('Upload failed. Please try again.', 'error');
            }
        });
        // Reset file input
        const input = document.getElementById('fileInput_' + key) as HTMLInputElement;
        if (input) input.value = '';
    }

    cancelPendingUpload(buildNo: string): void {
        this.pendingDocFiles[buildNo] = null;
        const input = document.getElementById('fileInput_' + buildNo) as HTMLInputElement;
        if (input) input.value = '';
        this.cdr.detectChanges();
    }

    //onDocFileSelected(event: Event, build: any): void {
    //    const input = event.target as HTMLInputElement;
    //    if (!input.files?.length) return;
    //    const file = input.files[0];
    //    const key = build.buildNo;
    //    // Just store the file, don't upload yet
    //    this.pendingDocFiles[key] = file;
    //    this.uploadSuccess[key] = false;
    //    this.cdr.detectChanges();
    //}
    onDocFileSelectedForBuild(event: Event, build: any): void {
        const input = event.target as HTMLInputElement;
        if (!input.files?.length) return;
        const file = input.files[0];
        const key = build.buildNo;

        // Upload immediately (like Current/Future releases)
        this.uploadingDoc[key] = true;
        this.cdr.detectChanges();

        this.svc.uploadBuildDocument(
            file,
            build.buildNo,
            this.selectedPlatform?.id,
            this.selectedEntity?.entityId
        ).subscribe({
            next: () => {
                this.uploadingDoc[key] = false;
                this.uploadSuccess[key] = true;
                // Reload documents after upload
                this.loadBuildDocuments(build);
                this.cdr.detectChanges();

                setTimeout(() => {
                    this.uploadSuccess[key] = false;
                    this.cdr.detectChanges();
                }, 3000);
            },
            error: (err) => {
                console.error('Upload error:', err);
                this.uploadingDoc[key] = false;
                this.showToast('Upload failed', 'error');
                this.cdr.detectChanges();
            }
        });

        input.value = '';
    }

     
    triggerFileInputForBuild(buildNo: string): void {
        const input = document.getElementById('fileInput_build_' + buildNo) as HTMLInputElement;
        if (input) {
            input.value = '';
            input.click();
        }
    }

   
    confirmDelete(message: string): boolean {
        return window.confirm(message);
    }
    getFileIcon(fileName: string): string {
        const ext = fileName.split('.').pop()?.toLowerCase();
        const icons: { [key: string]: string } = {
            pdf: '📄', doc: '📝', docx: '📝',
            xls: '📊', xlsx: '📊', png: '🖼️',
            jpg: '🖼️', jpeg: '🖼️', zip: '🗜️'
        };
        return icons[ext || ''] || '📎';
    }

    getUserKey(item: any): string {
        return `user_${item.id}`;
    }
 

    saveUser(item: any): void {
        const key = this.getUserKey(item);
        const userId = this.selectedUser[key];

        if (!userId || userId === 0) {
            this.cancelUserEdit(item);
            return;
        }

        this.savingUser[key] = true;
        this.cdr.detectChanges();

        this.svc.updateTicketAssignedUser(item.id, userId).subscribe({
            next: (response) => {
                console.log('Save successful:', response);

                // ✅ Refresh the data to show the updated user
                this.refreshCurrentPlatformData();

                this.savingUser[key] = false;
                this.editingUser[key] = false;
                this.cdr.detectChanges();
            },
            error: (err: any) => {
                console.error('Error saving user:', err);
                this.savingUser[key] = false;
                this.cdr.detectChanges();
                this.showToast('Failed to save user.', 'error');
            }
        });
    }
    //private refreshCurrentPlatformData(): void {
    //    if (!this.selectedPlatform || !this.selectedEntity) return;

    //    const filter = { entityId: this.selectedEntity.entityId };
    //    this.svc.getTickets(filter).subscribe({
    //        next: (tickets) => {
    //            const platformTickets = tickets.filter(
    //                t => t.platformId === this.selectedPlatform?.id
    //            );

    //            // Log every date field on every ticket name variant
    //            platformTickets.forEach(t => {
    //                console.log('🎫 Ticket', t.id, {
    //                    plannedDate: (t as any).plannedDate,
    //                    estimationEndDate: (t as any).estimationEndDate,
    //                    estimation_end_date: (t as any).estimation_end_date,
    //                    scheduleBuildDate: (t as any).scheduleBuildDate,
    //                    schedule_build_date: (t as any).schedule_build_date,
    //                    scheduleBuildNo: (t as any).scheduleBuildNo,
    //                    schedule_build_no: (t as any).schedule_build_no,
    //                });
    //            });

    //            this.allTickets = tickets;
    //            this.groupPlatformBuildWiseData(platformTickets);
    //            this.groupPlatformDataByDepartment(platformTickets);
    //            this.cdr.detectChanges();
    //        },
    //        error: (err) => console.error('Error refreshing data:', err)
    //    });
    //}
    private refreshCurrentPlatformData(): void {
    if (!this.selectedPlatform || !this.selectedEntity) return;

    const filter = { entityId: this.selectedEntity.entityId };
    this.svc.getTickets(filter).subscribe({
        next: (tickets) => {
            const platformTickets = tickets.filter(
                t => t.platformId === this.selectedPlatform?.id
            );

            this.allTickets = tickets;
            this.groupPlatformBuildWiseData(platformTickets);
            this.groupPlatformDataByDepartment(platformTickets);
            
            // Reload documents for all tickets in current view
            const allCurrentItems = [...this.platformCurrentBuildData.items, ...this.platformFutureReleasesData.items];
            allCurrentItems.forEach(item => {
                const key = `ticket_${item.id}`;
                this.svc.getBuildDocuments(`ticket_${item.id}`, this.selectedPlatform?.id).subscribe({
                    next: (docs) => {
                        this.buildDocs[key] = docs;
                        this.cdr.detectChanges();
                    },
                    error: () => {
                        this.buildDocs[key] = [];
                        this.cdr.detectChanges();
                    }
                });
            });
            
            this.cdr.detectChanges();
        },
        error: (err) => console.error('Error refreshing data:', err)
    });
}
    
    cancelUserEdit(item: any): void {
        const key = this.getUserKey(item);
        this.editingUser[key] = false;
        this.selectedUser[key] = 0;
        this.cdr.detectChanges();
    }

    getUserDisplayName(userId: number): string {
        const user = this.allUsers.find(u => u.id === userId);
        return user?.realname || user?.name || '—';
    }
    // ==================== PIPELINE STAGES - DYNAMIC BUILDER ====================
    buildPipelineStages(statuses: any[]): void {
        // Define stage configuration using dynamic matching
        // This uses keyword matching which can be updated without code changes
        // Alternatively, you can add a 'stage' field to your master_config table

        const stageConfig = [
            {
                label: 'Analysis / FD',
                keywords: ['analysis', 'fd', 'poc', 'yet to start', 'requirement'],
                color: '#9a5500'
            },
            {
                label: 'Development',
                keywords: ['dev', 'development'],
                color: '#5e3a9a'
            },
            {
                label: 'Testing',
                keywords: ['test', 'testing', 'demo'],
                color: '#1a6e63'
            },
            {
                label: 'Ready / Blocked',
                keywords: ['ready', 'hold', 'dependency', 'awaiting', 'blocked'],
                color: '#b85c00'
            }
        ];

        this.pipelineStages = stageConfig.map(stage => ({
            label: stage.label,
            color: stage.color,
            statuses: statuses
                .filter(s => {
                    const statusName = s.fieldName?.toLowerCase() || '';
                    return stage.keywords.some(keyword => statusName.includes(keyword));
                })
                .map(s => s.fieldName)
        })).filter(stage => stage.statuses.length > 0);

        console.log('Dynamic Pipeline Stages built:', this.pipelineStages);
    }

    // ==================== STATUS EDITING METHODS ====================
    getStatusKey(item: any): string {
        return `${item.id}_${item.ticketId || ''}`;
    }
 

    cancelStatusEdit(item: any): void {
        const key = this.getStatusKey(item);
        this.editingStatus[key] = false;
        this.selectedNewStatus[key] = '';
        this.cdr.detectChanges();
    }

    saveStatus(item: any): void {
        const key = this.getStatusKey(item);
        const newStatusName = this.selectedNewStatus[key];

        if (!newStatusName || newStatusName === item.statusName) {
            this.cancelStatusEdit(item);
            return;
        }

        const statusObj = this.availableStatuses.find(s => s.fieldName === newStatusName);
        if (!statusObj) {
            this.showToast('Invalid status selected', 'error');
            return;
        }

        this.savingStatus[key] = true;
        this.cdr.detectChanges();

        this.svc.updateTicketStatus(item.id, statusObj.id, newStatusName).subscribe({
            next: () => {
                item.statusName = newStatusName;
                item.statusId = statusObj.id;
                this.savingStatus[key] = false;
                this.editingStatus[key] = false;
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error('Error updating status:', err);
                this.savingStatus[key] = false;
                this.cdr.detectChanges();
                this.showToast('Failed to update status', 'error');
            }
        });
    }

    // ==================== RELEASE NOTES METHODS ====================
    getTicketKey(ticket: any): string {
        const id = ticket?.id ?? ticket?.ticketId;
        if (!id) {
            console.warn('⚠️ getTicketKey: no id found on ticket', ticket);
        }
        return `${id}`;
    }
    toggleTextEditor(ticket: any): void {
        const key = this.getTicketKey(ticket);
        this.showTextEditor[key] = !this.showTextEditor[key];
        if (this.showTextEditor[key] && !this.releaseNoteContent[key]) {
            this.loadReleaseNote(ticket);
        }
        this.cdr.detectChanges();
    }

    loadReleaseNote(ticket: any): void {
        const key = this.getTicketKey(ticket);
        this.loadingReleaseNote[key] = true;
        this.svc.getReleaseNote(ticket.id).subscribe({
            next: (response: any) => {
                this.releaseNoteContent[key] = response.releaseNote || '';
                this.loadingReleaseNote[key] = false;
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error('Error loading release note:', err);
                this.releaseNoteContent[key] = '';
                this.loadingReleaseNote[key] = false;
                this.cdr.detectChanges();
            }
        });
    }

    saveReleaseNote(ticket: any): void {
        const key = this.getTicketKey(ticket);
        this.savingReleaseNote[key] = true;
        this.svc.updateReleaseNote(ticket.id, this.releaseNoteContent[key] || '').subscribe({
            next: () => {
                this.savingReleaseNote[key] = false;
                this.showTextEditor[key] = false;
                this.loadedReleaseNotes.add(key);
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error('Error saving release note:', err);
                this.savingReleaseNote[key] = false;
                this.cdr.detectChanges();
            }
        });
    }

    loadNoteContentOnly(ticket: any): void {
        const key = this.getTicketKey(ticket);
        if (!this.releaseNoteContent[key]) {
            this.svc.getReleaseNote(ticket.id).subscribe({
                next: (response: any) => {
                    this.releaseNoteContent[key] = response.releaseNote || '';
                    this.cdr.detectChanges();
                },
                error: () => {
                    this.releaseNoteContent[key] = '';
                    this.cdr.detectChanges();
                }
            });
        }
    }

    // ==================== EXISTING METHODS (KEEP AS IS) ====================
    private resetEntityState(): void {
        this.editingBuildNo = {};
        this.selectedNewBuildNo = {};
        this.savingBuildNo = {};
        this.editingPlannedDate = {};
        this.selectedNewPlannedDate = {};
        this.savingPlannedDate = {};
        this.editingBuildDate = {};
        this.selectedNewBuildDate = {};
        this.savingBuildDate = {};
        this.preloadedKeys.clear();
        this.loadedReleaseNotes.clear();
        this.selectedPlatform = null;
        this.platformFilter = null;
        this.platformGroupedData = [];
        this.platformCurrentBuildData = { items: [] };
        this.platformPreviousBuildsData = [];
        this.platformFutureReleasesData = { items: [] };
        this.buildWiseData = [];
        this.currentBuildData = { items: [] };
        this.previousBuildsData = [];
        this.groupedDataArray = [];
        this.expandedBuilds.clear();
        this.expandedDepts.clear();
        this.selectedView = 'build';
        this.isCurrentBuildsExpanded = false;
        this.isFutureReleasesExpanded = false;
        this.isPreviousBuildsExpanded = false;
        this.pipelineTickets = [];
        this.filteredPipelineTickets = [];
        this.pipelineSearchTerm = '';
        this.filterPriority = '';
        this.editingStatus = {};
        this.selectedNewStatus = {};
        this.savingStatus = {};
    }
    private toLocalDateString(dateVal: any): string {
        if (!dateVal) return '';

        // If already in yyyy-MM-dd format, return as-is
        if (typeof dateVal === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateVal)) {
            return dateVal;
        }

        // If ISO string like "2026-06-16T00:00:00", just take the date part directly
        if (typeof dateVal === 'string' && dateVal.includes('T')) {
            return dateVal.split('T')[0];
        }

        // Try parsing as Date object
        const d = new Date(dateVal);
        if (isNaN(d.getTime())) return '';

        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    private resetPlatformState(): void {
        this.editingBuildNo = {};
        this.selectedNewBuildNo = {};
        this.savingBuildNo = {};
        this.editingPlannedDate = {};
        this.selectedNewPlannedDate = {};
        this.savingPlannedDate = {};
        this.editingBuildDate = {};
        this.selectedNewBuildDate = {};
        this.savingBuildDate = {};
        this.preloadedKeys.clear();
        this.platformGroupedData = [];
        this.platformCurrentBuildData = { items: [] };
        this.platformPreviousBuildsData = [];
        this.platformFutureReleasesData = { items: [] };
        this.expandedBuilds.clear();
        this.expandedDepts.clear();
        this.isCurrentBuildsExpanded = false;
        this.isFutureReleasesExpanded = false;
        this.isPreviousBuildsExpanded = false;
        this.selectedView = 'build';
        this.pipelineTickets = [];
        this.filteredPipelineTickets = [];
        this.pipelineSearchTerm = '';
        this.filterPriority = '';
        this.cdr.detectChanges();
        this.loadedReleaseNotes.clear();
        this.editingStatus = {};
        this.selectedNewStatus = {};
        this.savingStatus = {};
    }

    private setDefaultExpandedSection(): void {
        this.isCurrentBuildsExpanded = false;
        this.isFutureReleasesExpanded = false;
        this.isPreviousBuildsExpanded = false;
        if (this.platformCurrentBuildData?.items?.length > 0) {
            this.isCurrentBuildsExpanded = true;
        } else if (this.platformFutureReleasesData?.items?.length > 0) {
            this.isFutureReleasesExpanded = true;
        } else if (this.platformPreviousBuildsData?.length > 0) {
            this.isPreviousBuildsExpanded = true;
        }
        this.cdr.detectChanges();
    }

    loadEntityData(entityId: number): void {
        const found = this.allEntities.find(e => e.entityId === entityId);
        if (found) {
            this.selectedEntity = found;
        }
        this.loading = true;
        this.svc.getDepartmentSummary(entityId).subscribe({
            next: (data) => {
                if (!data || data.length === 0) {
                    this.loading = false;
                    this.cdr.detectChanges();
                    return;
                }
                const crItems = data.filter(item => item.typeName === 'CR');
                const issueItems = data.filter(item => item.typeName === 'Issue');
                const buildDeptMap = (items: any[]) => {
                    const map = new Map();
                    items.forEach(item => {
                        const dept = item.departmentName && item.departmentName !== 'General' ? item.departmentName : 'General';
                        if (!map.has(dept)) {
                            map.set(dept, {
                                departmentName: dept,
                                totalTickets: 0,
                                functionalCount: 0,
                                technicalCount: 0,
                                testingCount: 0,
                                deploymentCount: 0,
                                inProduction: 0,
                                releases: []
                            });
                        }
                        const d = map.get(dept);
                        d.totalTickets += item.totalTickets || 1;
                        d.functionalCount += item.functionalCount || 0;
                        d.technicalCount += item.technicalCount || 0;
                        d.testingCount += item.testingCount || 0;
                        d.deploymentCount += item.deploymentCount || 0;
                        d.inProduction += item.inProduction || 0;
                        if (item.scheduleBuildNo) {
                            d.releases.push(item);
                        }
                    });
                    return map;
                };
                const crMap = buildDeptMap(crItems);
                const issueMap = buildDeptMap(issueItems);
                this.groupedDataArray = [];
                if (crMap.size > 0) {
                    this.groupedDataArray.push({ title: 'Change Requests', data: Array.from(crMap.values()) });
                }
                if (issueMap.size > 0) {
                    this.groupedDataArray.push({ title: 'Issues', data: Array.from(issueMap.values()) });
                }
                this.loading = false;
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error('Error loading department data:', err);
                this.loading = false;
                this.cdr.detectChanges();
            }
        });
    }

    selectEntity(entity: PortfolioSummaryModel) {
        const enrichedEntity = this.allEntities.find(e => e.entityId === entity.entityId) || entity;
        this.selectedEntity = enrichedEntity;
        this.resetEntityState();
        this.svc.setSelectedEntity(enrichedEntity);
    }

    // ==================== PLATFORM METHODS ====================
    getPlatformTicketCountForEntity(platformId: number, entityId: number | undefined): number {
        if (!entityId) return 0;
        return this.allTickets.filter(t =>
            t.entityId === entityId &&
            t.platformId === platformId &&
            !this.closedStatusIds.includes(t.statusId ?? 0)
        ).length;
    }

    getPlatformTicketCount(platformId: number): number {
        return this.allTickets.filter(t =>
            t.entityId === this.selectedEntity?.entityId &&
            t.platformId === platformId &&
            !this.closedStatusIds.includes(t.statusId ?? 0)
        ).length;
    }

    getPlatformOpenTickets(platformId: number): number {
        return this.allTickets.filter(t =>
            t.entityId === this.selectedEntity?.entityId &&
            t.platformId === platformId &&
            !this.closedStatusIds.includes(t.statusId ?? 0) &&
            t.statusId !== undefined && this.openStatusIds.includes(t.statusId)
        ).length;
    }

    getPlatformInProgressTickets(platformId: number): number {
        return this.allTickets.filter(t =>
            t.entityId === this.selectedEntity?.entityId &&
            t.platformId === platformId &&
            !this.closedStatusIds.includes(t.statusId ?? 0) &&
            t.statusId !== undefined && this.inProgressStatusIds.includes(t.statusId)
        ).length;
    }

    getPlatformInProductionTickets(platformId: number): number {
        return this.allTickets.filter(t =>
            t.entityId === this.selectedEntity?.entityId &&
            t.platformId === platformId &&
            !this.closedStatusIds.includes(t.statusId ?? 0) &&
            t.statusId !== undefined && this.inProductionStatusIds.includes(t.statusId)
        ).length;
    }

    applyPlatformFilter(platformName: string): void {
        if (!this.selectedEntity) {
            console.log('No selected entity, cannot apply platform filter');
            return;
        }
        const platform = this.selectedEntity.platforms?.find(p => p.name === platformName);
        if (platform) {
            this.selectedPlatform = platform;
            this.platformGroupedData = [];
            this.platformCurrentBuildData = { items: [] };
            this.platformPreviousBuildsData = [];
            this.platformFutureReleasesData = { items: [] };
            this.pipelineTickets = [];
            this.filteredPipelineTickets = [];
            const platformTickets = this.allTickets.filter(ticket => ticket.entityId === this.selectedEntity?.entityId && ticket.platformId === platform.id);
            this.groupPlatformDataByDepartment(platformTickets);
            this.groupPlatformBuildWiseData(platformTickets);
            this.setDefaultExpandedSection();
            this.selectedView = 'build';
            this.loadPipelineData();
            this.cdr.detectChanges();
        }
    }

    selectPlatform(platform: any, entity?: PortfolioSummaryModel): void {

        const resolvedEntityId = entity?.entityId ?? this.selectedEntity?.entityId;
        console.log('🔵 Total allTickets:', this.allTickets.length);
        console.log('🔵 Ticket 2026045226 in allTickets:',
            this.allTickets.find(t => t.id === 2026045226));
        console.log('🔵 Platform tickets for TMS (229):', 
            this.allTickets.filter(t => t.platformId === 229).length);
        if (!this.allEntities || this.allEntities.length === 0) {
            console.warn('allEntities not ready yet');
            setTimeout(() => this.selectPlatform(platform, entity), 100);
            return;
        }
        const resolvedEntity = this.allEntities.find(e => e.entityId === resolvedEntityId);
        if (!resolvedEntity) {
            console.error('No resolved entity for platform:', platform);
            return;
        }
        const resolvedPlatform = resolvedEntity.platforms?.find(p => p.id === platform.id) ?? platform;
        this.selectedEntity = resolvedEntity;
        this.selectedPlatform = resolvedPlatform;
        this.router.navigate([], { relativeTo: this.route, queryParams: { platform: resolvedPlatform.name }, queryParamsHandling: 'merge' });
        this.resetPlatformState();
       // const platformTickets = this.allTickets.filter(t => t.entityId === resolvedEntity.entityId && t.platformId === resolvedPlatform.id);
        const platformTickets = this.allTickets.filter(
            t => t.entityId === resolvedEntity.entityId && t.platformId === resolvedPlatform.id
        );
        debugger;
        const target = this.allTickets.find((t: any) => t.id === 2026045226);
        console.log('🎯 Target ticket found:', target);
        console.log('🎯 Target entityId:', target?.entityId, '=== resolvedEntity:', resolvedEntity.entityId);
        console.log('🎯 Target platformId:', target?.platformId, '=== resolvedPlatform.id:', resolvedPlatform.id);
        // ADD THESE:
        console.log('🔵 allTickets total:', this.allTickets.length);
        console.log('🔵 ticket 2026045226 exists in allTickets:',
            this.allTickets.find((t: any) => t.id === 2026045226));
        console.log('🔵 all platformId=229 tickets:',
            this.allTickets.filter((t: any) => t.platformId === 229));
        console.log('🔵 platformTickets count:', platformTickets.length);
        this.groupPlatformDataByDepartment(platformTickets);
        this.groupPlatformBuildWiseData(platformTickets);
        this.setDefaultExpandedSection();
        this.selectedView = 'build';
        this.loadPipelineData();
        this.cdr.detectChanges();
    }

    clearPlatformFilter(): void {
        this.selectedPlatform = null;
        this.platformFilter = null;
        this.platformGroupedData = [];
        this.platformCurrentBuildData = { items: [] };
        this.platformPreviousBuildsData = [];
        this.platformFutureReleasesData = { items: [] };
        this.
            selectedView = 'department';
        this.isCurrentBuildsExpanded = false;
        this.isFutureReleasesExpanded = false;
        this.isPreviousBuildsExpanded = false;
        this.pipelineTickets = [];
        this.filteredPipelineTickets = [];
        this.router.navigate([], { relativeTo: this.route, queryParams: {}, queryParamsHandling: '' });
        this.cdr.detectChanges();
    }

    groupPlatformDataByDepartment(tickets: any[]): void {
        const buildMap = (items: any[]) => {
            const map = new Map();
            items.forEach(item => {
                const dept = item.departmentname || item.departmentName || 'General';
                if (!map.has(dept)) {
                    map.set(dept, {
                        departmentName: dept,
                        totalTickets: 0,
                        functionalCount: 0,
                        technicalCount: 0,
                        testingCount: 0,
                        deploymentCount: 0,
                        inProduction: 0,
                        releases: []
                    });
                }
                const d = map.get(dept);
                d.totalTickets += 1;
                d.functionalCount += item.functionalCount || 0;
                d.technicalCount += item.technicalCount || 0;
                d.testingCount += item.testingCount || 0;
                d.deploymentCount += item.deploymentCount || 0;
                d.inProduction += item.inProduction || 0;
                if (item.scheduleBuildNo || item.title) {
                    d.releases.push({
                        ...item,
                        scheduleBuildNo: item.scheduleBuildNo,
                        scheduleBuildDate: item.scheduleBuildDate,
                        description: item.description,
                        title: item.title,
                        statusName: item.statusName
                    });
                }
            });
            return map;
        };
        const allTicketsMap = buildMap(tickets);
        this.platformGroupedData = [];
        if (allTicketsMap.size > 0) {
            const allData = Array.from(allTicketsMap.values());
            const filteredData = allData.filter(d => d.totalTickets > 0);
            if (filteredData.length > 0) {
                this.platformGroupedData.push({
                    title: `${this.selectedPlatform?.name || 'All'} Tickets`,
                    data: filteredData
                });
            }
        }
    }

    private getAssignedUserId(assignedUsers: any): number {
        if (!assignedUsers) return 0;

        // If it's a string like "[160]"
        if (typeof assignedUsers === 'string') {
            try {
                const parsed = JSON.parse(assignedUsers);
                return Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : 0;
            } catch {
                return 0;
            }
        }

        // If it's an array
        if (Array.isArray(assignedUsers)) {
            return assignedUsers.length > 0 ? assignedUsers[0] : 0;
        }

        return 0;
    }
    // ==================== BUILD NO EDIT ====================
     

    cancelBuildNoEdit(item: any): void {
        const key = this.getTicketKey(item);
        this.editingBuildNo[key] = false;
        this.selectedNewBuildNo[key] = '';
        this.cdr.detectChanges();
    }


    saveBuildNo(item: any): void {
        const key = this.getTicketKey(item);
        // Use ?? instead of ?. to allow empty string
        const newVal = (this.selectedNewBuildNo[key] ?? '').trim();

        // Only cancel if unchanged — allow saving empty string to clear build no
        if (newVal === (item.buildNo ?? '').trim()) {
            this.cancelBuildNoEdit(item);
            return;
        }

        this.savingBuildNo[key] = true;
        this.cdr.detectChanges();

        this.svc.updateTicketBuildNo(item.id, newVal).subscribe({
            next: () => {
                item.buildNo = newVal || null; // store null if cleared
                this.savingBuildNo[key] = false;
                this.editingBuildNo[key] = false;
                this.refreshCurrentPlatformData(); // re-groups: moves to Future if cleared
                this.cdr.detectChanges();
            },
            error: (err: any) => {
                console.error('Error saving build no:', err);
                this.savingBuildNo[key] = false;
                this.cdr.detectChanges();
                this.showToast('Failed to update Build No.', 'error');
            }
        });
    }

    // ==================== PLANNED DATE EDIT ====================
 

    cancelPlannedDateEdit(item: any): void {
        const key = this.getTicketKey(item);
        this.editingPlannedDate[key] = false;
        this.selectedNewPlannedDate[key] = '';
        this.cdr.detectChanges();
    }

    // In portfolio.component.ts - Update savePlannedDate
    // ==================== PLANNED DATE EDIT ====================
    // In portfolio.component.ts - Updated savePlannedDate

    savePlannedDate(item: any): void {
        const key = this.getTicketKey(item);
        const newVal = this.selectedNewPlannedDate[key];

        if (!newVal || newVal.trim() === '') {
            this.showToast('Please select a valid date', 'error');
            return;
        }

        this.savingPlannedDate[key] = true;
        this.cdr.detectChanges();

        const dateToSave = newVal;

        console.log('📅 Saving planned date:', dateToSave, 'for ticket:', item.id);

        this.svc.updateTicketPlannedDate(item.id, dateToSave).subscribe({
            next: (response) => {
                console.log('✅ Planned date saved successfully:', response);

                // ✅ Update the local item directly
                item.plannedDate = dateToSave;

                // ✅ Also update the item in all arrays
                this.updateTicketInArrays(item.id, 'plannedDate', dateToSave);

                this.savingPlannedDate[key] = false;
                this.editingPlannedDate[key] = false;

                // ✅ Don't refresh the entire platform data - just update the local item
                // this.refreshCurrentPlatformData();

                this.showToast('Planned date updated successfully', 'success');
                this.cdr.detectChanges();
            },
            error: (err: any) => {
                console.error('❌ Error saving planned date:', err);
                this.savingPlannedDate[key] = false;
                this.cdr.detectChanges();
                this.showToast('Failed to update Planned Date: ' + (err.error?.message || err.statusText || 'Unknown error'), 'error');
            }
        });
    }

    // Add this helper method
    private updateTicketInArrays(ticketId: number, field: string, value: any): void {
        // Update in platformCurrentBuildData
        this.platformCurrentBuildData.items.forEach((item: any) => {
            if (item.id === ticketId) {
                item[field] = value;
            }
        });

        // Update in platformFutureReleasesData
        this.platformFutureReleasesData.items.forEach((item: any) => {
            if (item.id === ticketId) {
                item[field] = value;
            }
        });

        // Update in platformPreviousBuildsData
        this.platformPreviousBuildsData.forEach((build: any) => {
            build.items.forEach((item: any) => {
                if (item.id === ticketId) {
                    item[field] = value;
                }
            });
        });

        // Update in allTickets
        this.allTickets.forEach((item: any) => {
            if (item.id === ticketId) {
                item[field] = value;
            }
        });
    }
    // ==================== BUILD DATE EDIT ====================
    saveBuildDate(item: any): void {
        const key = this.getTicketKey(item);
        const newVal = this.selectedNewBuildDate[key];

        this.savingBuildDate[key] = true;
        this.cdr.detectChanges();

        // Explicitly type as string | null
        let dateToSave: string | null = null;
        if (newVal && newVal.trim() !== '') {
            dateToSave = newVal;
        }

        console.log('Sending build date:', dateToSave);

        this.svc.updateTicketBuildDate(item.id, dateToSave).subscribe({
            next: () => {
                item.scheduleBuildDate = dateToSave;
                this.savingBuildDate[key] = false;
                this.editingBuildDate[key] = false;
                this.refreshCurrentPlatformData();
                this.cdr.detectChanges();
            },
            error: (err: any) => {
                console.error('Error saving build date:', err);
                this.savingBuildDate[key] = false;
                this.cdr.detectChanges();
                this.showToast('Failed to update Build Date: ' + (err.error?.message || err.status), 'error');
            }
        });
    }
     
    // ==================== BUILD DATE EDIT ====================
   
    cancelBuildDateEdit(item: any): void {
        const key = this.getTicketKey(item);
        this.editingBuildDate[key] = false;
        this.selectedNewBuildDate[key] = '';
        this.cdr.detectChanges();
    }

    
    groupPlatformBuildWiseData(tickets: any[]): void {
        const currentBuildMap = new Map<string, any>();
        const futureReleaseMap = new Map<string, any>();
        const previousBuildMap = new Map<string, any>();
        debugger;
        tickets.forEach((item: any) => {
            console.log('🔍 Ticket:', item.id, {
                estimationEndDate: item.estimationEndDate,
                estimation_end_date: item.estimation_end_date,
                PlannedDate: item.PlannedDate,
                scheduleBuildDate: item.scheduleBuildDate,
                ScheduleBuildDate: item.ScheduleBuildDate
            });
            // ✅ Handle all possible field name variants from API
            const buildNo = item.scheduleBuildNo ?? item.schedule_build_no ?? null;
            // Make sure you're mapping estimationEndDate to plannedDate
            // In groupPlatformBuildWiseData
            const plannedDate = item.plannedDate ??           // ✅ Added this
                item.estimationEndDate ??
                item.estimation_end_date ??
                item.PlannedDate ??
                null;
            const scheduleBuildDate = item.scheduleBuildDate ?? item.schedule_build_date ?? null;
            const statusName = item.statusName ?? item.status_name ?? null;
            const statusId = item.statusId ?? item.status_id ?? null;
            const departmentName = item.departmentName ?? item.departmentname ?? 'General';

            const isInProduction = this.inProductionStatusIds.includes(statusId);
            const hasBuildNo = buildNo && buildNo !== null && buildNo !== '';
            if (this.closedStatusIds.includes(statusId)) return;
            const ticketEntry = {
                id: item.id,
                ticketId: item.id,
                departmentName,
                title: item.title,
                description: item.description,
                plannedDate,
                scheduleBuildDate,
                statusName,
                statusId,
                buildNo,
                assignedUserId: this.getAssignedUserId(item.assigned_users ?? item.assignedUsers)
            };

            if (hasBuildNo && !isInProduction) {
                if (!currentBuildMap.has(buildNo)) {
                    currentBuildMap.set(buildNo, { buildNo, buildDate: scheduleBuildDate, items: [] });
                }
                currentBuildMap.get(buildNo)?.items.push(ticketEntry);
            } else if (!hasBuildNo && !isInProduction) {
                const key = 'Future Release';
                if (!futureReleaseMap.has(key)) {
                    futureReleaseMap.set(key, { buildNo: 'Future Release', buildDate: null, items: [] });
                }
                futureReleaseMap.get(key)?.items.push({
                    ...ticketEntry,
                    id: item.id,          // ← explicitly set
                    ticketId: item.id,    // ← explicitly set
                    statusName: statusName,
                    buildNo: 'Future Release',
                    plannedDate,
                    scheduleBuildDate,
                });
            } else if (hasBuildNo && isInProduction) {
                if (!previousBuildMap.has(buildNo)) {
                    previousBuildMap.set(buildNo, { buildNo, buildDate: scheduleBuildDate, items: [] });
                }
                previousBuildMap.get(buildNo)?.items.push(ticketEntry);
            }
        });

        this.platformCurrentBuildData = { items: [] };
        this.platformFutureReleasesData = { items: [] };
        this.platformPreviousBuildsData = [];

        const currentBuilds = Array.from(currentBuildMap.values());
        currentBuilds.sort((a, b) => new Date(a.buildDate || 0).getTime() - new Date(b.buildDate || 0).getTime());
        currentBuilds.forEach(build => {
            build.items.sort((a: any, b: any) => new Date(a.scheduleBuildDate || 0).getTime() - new Date(b.scheduleBuildDate || 0).getTime());
            this.platformCurrentBuildData.items.push(...build.items);
        });

        const futureItems = Array.from(futureReleaseMap.values()).flatMap(build => build.items);
        futureItems.sort((a: any, b: any) => {
            const aDate = a.plannedDate ? new Date(a.plannedDate).getTime() : Number.MAX_SAFE_INTEGER;
            const bDate = b.plannedDate ? new Date(b.plannedDate).getTime() : Number.MAX_SAFE_INTEGER;
            return aDate - bDate;
        });
        this.platformFutureReleasesData.items.push(...futureItems);

        this.platformPreviousBuildsData = Array.from(previousBuildMap.values());
        this.platformPreviousBuildsData.sort((a: any, b: any) => {
            const aDate = a.buildDate ? new Date(a.buildDate).getTime() : 0;
            const bDate = b.buildDate ? new Date(b.buildDate).getTime() : 0;
            return bDate - aDate;
        });
        this.platformPreviousBuildsData.forEach(build => {
            build.items.sort((a: any, b: any) =>
                new Date(a.scheduleBuildDate || 0).getTime() - new Date(b.scheduleBuildDate || 0).getTime()
            );
        });

        setTimeout(() => {
            const allItems = [...this.platformCurrentBuildData.items, ...this.platformFutureReleasesData.items];

            allItems.forEach(item => {
                if (item && item.id) {
                    this.loadNoteContentOnly(item);
                    this.loadTicketDocuments(item);
                }
            });

            // ✅ ADD THIS: load build-level docs for previous builds on page load/refresh
            this.platformPreviousBuildsData.forEach(build => {
                if (build.buildNo) {
                    this.loadBuildDocuments(build);
                }
            });
        }, 500);
    }
    groupBuildWiseData() {
        const buildMap = new Map<string, any>();
        const filteredTickets = this.allTickets.filter((t: TicketModel) => t.entityId === this.selectedEntity?.entityId && t.scheduleBuildNo &&
            !this.closedStatusIds.includes(t.statusId ?? 0));
        this.currentBuildData = { items: [] };
        this.previousBuildsData = [];

        filteredTickets.forEach((item: TicketModel) => {
            const buildNo = item.scheduleBuildNo;
            if (!buildNo) return;
            if (!buildMap.has(buildNo)) {
                buildMap.set(buildNo, { buildNo, buildDate: item.scheduleBuildDate, items: [] });
            }
            buildMap.get(buildNo)?.items.push({
                id: item.id,
                ticketId: item.id,
                departmentName: item.departmentName,
                title: item.title,
                description: item.description,
                plannedDate: item.plannedDate,
                scheduleBuildDate: item.scheduleBuildDate,
                statusName: item.statusName,
                buildNo
            });
        });

        Array.from(buildMap.values()).forEach((build: any) => {
            const hasCurrentItems = build.items.some((i: any) => i.statusName !== 'In Production');
            if (hasCurrentItems) {
                this.currentBuildData.items.push(...build.items);
            } else {
                this.previousBuildsData.push(build);
            }
        });
        this.previousBuildsData.sort((a: any, b: any) => (b.buildNo || '').localeCompare(a.buildNo || ''));
        this.cdr.detectChanges();
    }

    loadPipelineData(): void {
        if (!this.selectedPlatform || !this.selectedEntity) {
            this.pipelineLoading = false;
            return;
        }
        this.pipelineLoading = true;
        const filter = { entityId: this.selectedEntity.entityId, typeName: 'CR' };
        this.svc.getTickets(filter).subscribe({
            next: (tickets) => {
                const platformTickets = tickets.filter(t => t.platformId === this.selectedPlatform?.id);
                this.pipelineTickets = platformTickets;
                this.filteredPipelineTickets = [...platformTickets];
                this.pipelineLoading = false;
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error('Error loading pipeline:', err);
                this.pipelineLoading = false;
                this.cdr.detectChanges();
            }
        });
    }

    applyPipelineFilter(): void {
        const search = this.pipelineSearchTerm.toLowerCase();
        this.filteredPipelineTickets = this.pipelineTickets.filter(ticket =>
            (!this.filterPriority || ticket.priorityName === this.filterPriority) &&
            (!search || ticket.title?.toLowerCase().includes(search) || (ticket.assignee?.toLowerCase() || '').includes(search) || ticket.ticketNo?.toString().includes(search))
        );
        this.cdr.detectChanges();
    }

    getPipelinePriorityClass(priority: string): string {
        if (!priority) return 'b-gray';
        if (priority === 'P1' || priority === 'P2') return 'b-red';
        if (priority === 'P3') return 'b-amber';
        return 'b-gray';
    }

    isPipelineOverdue(date: string): boolean {
        if (!date) return false;
        return new Date(date) < new Date();
    }

    getPipelineDaysDiff(date: string): number {
        if (!date) return 0;
        return Math.ceil((new Date().getTime() - new Date(date).getTime()) / 86400000);
    }

    onViewChange() {
        if (this.selectedPlatform) {
            const platformTickets = this.allTickets.filter(t => t.entityId === this.selectedEntity?.entityId && t.platformId === this.selectedPlatform.id);
            if (this.selectedView === 'build') {
                this.groupPlatformBuildWiseData(platformTickets);
                this.setDefaultExpandedSection();
            } else if (this.selectedView === 'department') {
                this.groupPlatformDataByDepartment(platformTickets);
            } else if (this.selectedView === 'pipeline') {
                this.loadPipelineData();
            }
        } else if (this.selectedView === 'build') {
            this.groupBuildWiseData();
        } else if (this.selectedView === 'pipeline') {
            this.loadPipelineData();
        }
        this.cdr.detectChanges();
    }

    getPlatformIcon(platformName: string): string {
        const icons: { [key: string]: string } = {
            'Salesforce': '☁️',
            'ServiceNow': '🔧',
            'Workday': '📊',
            'SAP': '💼',
            'Oracle': '🔶',
            'AWS': '☁️',
            'Azure': '💠',
            'GCP': '🔵',
            'Custom': '⚙️',
            'Default': ''
        };
        return icons[platformName] || icons['Default'];
    }
    toggleDeptExpand(dept: any) {
        const key = dept.departmentName;
        if (this.expandedDepts.has(key)) {
            this.expandedDepts.delete(key);
        } else {
            this.expandedDepts.add(key);
        }
        this.cdr.detectChanges();
    }

    isDeptExpanded(dept: any): boolean {
        return this.expandedDepts.has(dept.departmentName);
    }

    toggleBuildExpand(build: any) {
        const key = build.buildNo;
        if (this.expandedBuilds.has(key)) {
            this.expandedBuilds.delete(key);
        } else {
            this.expandedBuilds.add(key);
        }
        this.cdr.detectChanges();
    }

    isBuildExpanded(build: any): boolean {
        return this.expandedBuilds.has(build.buildNo);
    }

    toggleCurrentBuildsExpand() {
        this.isCurrentBuildsExpanded = !this.isCurrentBuildsExpanded;
        this.cdr.detectChanges();
    }

    toggleFutureReleasesExpand() {
        this.isFutureReleasesExpanded = !this.isFutureReleasesExpanded;
        this.cdr.detectChanges();
    }

    togglePreviousBuildsExpand() {
        this.isPreviousBuildsExpanded = !this.isPreviousBuildsExpanded;
        this.cdr.detectChanges();
    }

    applyFilter() {
        const searchLower = this.searchTerm.toLowerCase();
        this.filteredEntities = this.allEntities.filter(entity => entity.entityName?.toLowerCase().includes(searchLower));
        this.cdr.detectChanges();
    }

    resetFilter() {
        this.searchTerm = '';
        this.filteredEntities = [...this.allEntities];
        this.selectedEntity = null;
        this.selectedEntityCategories = [];
        this.expandedRows.clear();
        this.resetEntityState();
        this.router.navigate([], { relativeTo: this.route, queryParams: {}, queryParamsHandling: '' });
        this.cdr.detectChanges();
    }

    setViewType(type: 'department' | 'build' | 'pipeline') {
        this.selectedView = type;
        this.onViewChange();
    }

    buildPipelineCards(): void {
        this.pipelineCardsByStatus = new Map();
        this.pipelineStages.forEach(stage => {
            stage.statuses.forEach(status => {
                const cards = this.filteredPipelineTickets.filter(t => t.statusName === status);
                this.pipelineCardsByStatus.set(status, cards);
            });
        });
    }

    getPipelineCards(statuses: string[]): any[] {
        return this.filteredPipelineTickets.filter(t => statuses.includes(t.statusName || ''));
    }

    // Ticket-level doc toggle (for Current/Future releases)
    toggleTicketDocsPanel(item: any): void {
        const key = `ticket_${item.id}`;
        this.showDocsPanel[key] = !this.showDocsPanel[key];
        if (this.showDocsPanel[key] && !this.buildDocs[key]) {
            this.loadTicketDocuments(item);
        }
    }

    loadTicketDocuments(item: any): void {
        const key = `ticket_${item.id}`;
        this.loadingDocs[key] = true;
        // Reuse same API but pass ticketId as buildNo identifier
        this.svc.getBuildDocuments(`ticket_${item.id}`, this.selectedPlatform?.id).subscribe({
            next: (docs) => {
                this.buildDocs[key] = docs;
                this.loadingDocs[key] = false;
                this.cdr.detectChanges();
            },
            error: () => { this.loadingDocs[key] = false; this.cdr.detectChanges(); }
        });
    }

    triggerTicketFileInput(itemId: number): void {
        const input = document.getElementById('fileInput_ticket_' + itemId) as HTMLInputElement;
        if (input) {
            input.value = '';
            input.click();
        }
    }

    //onTicketDocFileSelected(event: Event, item: any): void {
    //    const input = event.target as HTMLInputElement;
    //    if (!input.files?.length) return;
    //    const file = input.files[0];
    //    const key = `ticket_${item.id}`;
    //    this.pendingDocFiles[key] = file;
    //    this.uploadSuccess[key] = false;
    //    this.cdr.detectChanges();
    //}
    onTicketDocFileSelected(event: Event, item: any): void {
        const input = event.target as HTMLInputElement;
        if (!input.files?.length) return;
        const file = input.files[0];
        const key = `ticket_${item.id}`;

        this.uploadingDoc[key] = true;
        this.cdr.detectChanges();

        this.svc.uploadBuildDocument(
            file,
            `ticket_${item.id}`,
            this.selectedPlatform?.id,
            this.selectedEntity?.entityId
        ).subscribe({
            next: () => {
                this.uploadingDoc[key] = false;
                // ✅ Only reload THIS ticket's docs — don't refresh entire platform data
                this.loadTicketDocuments(item);
                this.showToast('Document uploaded successfully', 'success');
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error('Upload error:', err);
                this.uploadingDoc[key] = false;
                this.showToast('Upload failed', 'error');
                this.cdr.detectChanges();
            }
        });

        input.value = '';
    }
    confirmTicketUploadDoc(item: any): void {
        const key = `ticket_${item.id}`;
        const file = this.pendingDocFiles[key];
        if (!file) return;

        this.uploadingDoc[key] = true;
        this.uploadSuccess[key] = false;
        this.cdr.detectChanges();

        this.svc.uploadBuildDocument(
            file,
            `ticket_${item.id}`,   // use ticket_id as buildNo
            this.selectedPlatform?.id,
            this.selectedEntity?.entityId
        ).subscribe({
            next: () => {
                this.uploadingDoc[key] = false;
                this.uploadSuccess[key] = true;
                this.pendingDocFiles[key] = null;
                this.loadTicketDocuments(item);
                this.cdr.detectChanges();
                setTimeout(() => {
                    this.uploadSuccess[key] = false;
                    this.cdr.detectChanges();
                }, 3000);
            },
            error: () => {
                this.uploadingDoc[key] = false;
                this.cdr.detectChanges();
                this.showToast('Upload failed. Please try again.', 'error');
            }
        });
        const input = document.getElementById('fileInput_ticket_' + item.id) as HTMLInputElement;
        if (input) input.value = '';
    }

    cancelTicketPendingUpload(itemId: number): void {
        const key = `ticket_${itemId}`;
        this.pendingDocFiles[key] = null;
        const input = document.getElementById('fileInput_ticket_' + itemId) as HTMLInputElement;
        if (input) input.value = '';
        this.cdr.detectChanges();
    }

    deleteDocForBuild(build: any, docId: number): void {
        this.openConfirmDialog('Are you sure you want to delete this document?', () => {
            this.svc.deleteBuildDocument(docId).subscribe({
                next: () => {
                    this.showToast('Document deleted successfully', 'success');
                    this.loadBuildDocuments(build);
                    this.cdr.detectChanges();
                },
                error: () => {
                    this.showToast('Failed to delete document', 'error');
                    this.cdr.detectChanges();
                }
            });
        });
    }

    deleteDoc(build: any, docId: number): void {
        this.openConfirmDialog('Are you sure you want to delete this document?', () => {
            this.svc.deleteBuildDocument(docId).subscribe({
                next: () => {
                    this.showToast('Document deleted successfully', 'success');
                    this.loadBuildDocuments(build);
                    this.cdr.detectChanges();
                },
                error: () => {
                    this.showToast('Failed to delete document', 'error');
                    this.cdr.detectChanges();
                }
            });
        });
    }


    deleteTicketDoc(item: any, docId: number): void {
        this.openConfirmDialog('Are you sure you want to delete this document?', () => {
            this.svc.deleteBuildDocument(docId).subscribe({
                next: () => {
                    this.showToast('Document deleted successfully', 'success');
                    this.loadTicketDocuments(item); // ✅ reload only this ticket's docs
                    this.cdr.detectChanges();
                },
                error: () => {
                    this.showToast('Failed to delete document', 'error');
                    this.cdr.detectChanges();
                }
            });
        });
    }
    

    // ==================== RELEASE NOTES PDF ====================

    generateReleaseNotesPDF(section: 'current' | 'future'): void {
        this.rnTicketImages = {};
        if (!this.selectedPlatform || !this.selectedEntity) {
            this.showToast('No platform or entity selected', 'error');
            return;
        }

        let items: any[];
        if (section === 'current') {
            items = [...this.platformCurrentBuildData.items];
        } else {
            items = [...this.platformFutureReleasesData.items];
        }

        console.log(`📄 [${section}] items:`, items.length, items);

        if (!items.length) {
            this.showToast(`No ${section} releases found`, 'error');
            return;
        }

        // Pre-fill editable fields
        const currentUser = this.auth.getCurrentUser();
        this.rnAuthorName = currentUser?.realname || currentUser?.name || '';
        this.rnApproverName = 'Hari';
        this.rnOverviewText = `This release includes new functionality and issue fixes for the ${this.selectedPlatform?.name || ''} platform.`;
        this.rnSpecialInstructions = 'NA';
        this.rnConfigImpact = 'Stemz GP QC workflow is in Deactivated mode.\nImplementation of Panic Functionality — Deactivated Mode.';
        this.rnCustomLogoBase64 = null;
        this.rnLogoPreviewUrl = null;

        this.rnPreviewSection = section;
        this.rnPreviewItems = items;
        this.rnPreviewFilename = `ReleaseNotes_${this.selectedPlatform.name}_${section}_${new Date().toISOString().split('T')[0]}.pdf`;

        // ✅ CRITICAL - Set modal to true
        this.showRNPreviewModal = true;
        console.log('✅ Modal should be open, showRNPreviewModal =', this.showRNPreviewModal);
        console.log('📄 Preview items count:', this.rnPreviewItems.length);
        this.cdr.detectChanges();
    }
    onRNLogoSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (!input.files?.length) return;
        const file = input.files[0];
        const reader = new FileReader();
        reader.onload = (e) => {
            this.rnCustomLogoBase64 = e.target?.result as string;
            this.rnLogoPreviewUrl = this.rnCustomLogoBase64;
            this.cdr.detectChanges();
        };
        reader.readAsDataURL(file);
    }

    closeRNPreviewModal(): void {
        this.showRNPreviewModal = false;
        this.cdr.detectChanges();
    }
    downloadRNFromPreview(): void {
        const items = this.rnPreviewItems;

        this.showToast('Preparing release notes...', 'info');

        this.ensureReleaseNotesLoaded(items).subscribe(() => {
            const grouped = new Map<string, any[]>();
            items.forEach(item => {
                const key = (item.buildNo && item.buildNo !== 'Future Release')
                    ? item.buildNo
                    : '__NO_VERSION__';
                if (!grouped.has(key)) grouped.set(key, []);
                grouped.get(key)!.push(item);
            });

            let allVersionHtml = '';
            let pageIndex = 0;

            grouped.forEach((versionItems, buildNo) => {
                const versionLabel = buildNo !== '__NO_VERSION__' ? buildNo : 'Future Release';
                const buildDateRaw = versionItems.find(i => i.scheduleBuildDate)?.scheduleBuildDate;
                const buildDateStr = buildDateRaw
                    ? new Date(buildDateRaw).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                    : '—';

                allVersionHtml += this.buildReleaseNotesHTML(versionItems, versionLabel, buildDateStr, pageIndex === 0);
                pageIndex++;
            });

            this.showRNPreviewModal = false;
            this.cdr.detectChanges();
            this.exportHTMLToPDF(allVersionHtml, this.rnPreviewFilename);
        });
    }
    private buildReleaseNotesHTML(
        items: any[],
        versionLabel: string,
        buildDateStr: string,
        isFirst: boolean
    ): string {
        const todayStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        const authorName = this.rnAuthorName || 'Surabhi';
        const approverName = this.rnApproverName || 'Hari';
        const overviewText = this.rnOverviewText || `This release includes new functionality and issue fixes for the ${this.selectedPlatform?.name || ''} platform.`;
        const specialInstructions = this.rnSpecialInstructions || 'NA';
        const configLines = (this.rnConfigImpact || 'NA')
            .split('\n').filter(l => l.trim()).map(l => `<li>${l.trim()}</li>`).join('');

        const logoSrc = this.rnCustomLogoBase64
            ? this.rnCustomLogoBase64
            : `${window.location.origin}/assets/images/StemzLogo.png`;

        // Shared style constants — ALL inline so html2canvas captures them
        const S = {
            page: 'padding:30px 40px;max-width:760px;margin:0 auto;font-family:Calibri,Arial,sans-serif;font-size:11pt;color:#000;background:#fff;',
            tbl: 'width:100%;border-collapse:collapse;margin-bottom:12px;',
            td: 'border:1px solid #000;padding:5px 9px;vertical-align:top;',
            th: 'border:1px solid #000;padding:5px 9px;background:#d9d9d9;font-weight:700;text-align:left;vertical-align:top;',
            th2: 'border:1px solid #000;padding:5px 9px;background:#f2f2f2;font-weight:600;text-align:left;vertical-align:top;',
            tdGray: 'border:1px solid #000;padding:5px 9px;vertical-align:top;background:#f2f2f2;font-weight:600;',
        };

        // ── Shared page header (logo + title) ──────────────────────────
        const pageHeader = (titleText: string) => `
      <table style="${S.tbl}border:none;margin-bottom:6px;">
        <tr>
          <td style="border:none;width:100px;vertical-align:middle;padding:0;">
            <img src="${logoSrc}" style="height:44px;width:auto;" crossorigin="anonymous" onerror="this.style.display='none'"/>
          </td>
          <td style="border:none;text-align:center;vertical-align:middle;padding:0;">
            <strong style="font-size:15pt;">${titleText}</strong>
          </td>
          <td style="border:none;width:100px;padding:0;"></td>
        </tr>
      </table>
      <hr style="border:none;border-top:2px solid #000;margin:4px 0 16px;"/>`;

        // ── Feature / Bug rows ──────────────────────────────────────────
        let featRows = '', bugRows = '', fi = 1, bi = 1;
        items.forEach(item => {
            const dept = item.departmentName || 'General';
            const desc = item.description || item.title || '—';
            if (item.typeName === 'Issue') {
                const sev = item.priorityName || 'Medium';
                bugRows += `<tr>
              <td style="${S.td}width:36px;">${bi++}</td>
              <td style="${S.td}width:120px;">${dept}</td>
              <td style="${S.td}width:80px;">${sev}</td>
              <td style="${S.td}">${desc}</td>
            </tr>`;
            } else {
                featRows += `<tr>
              <td style="${S.td}width:36px;">${fi++}</td>
              <td style="${S.td}width:120px;">${dept}</td>
              <td style="${S.td}" colspan="2">${desc}</td>
            </tr>`;
            }
        });
        if (!featRows) featRows = `<tr><td style="${S.td}" colspan="4" align="center" style="color:#888;">No features in this release</td></tr>`;
        if (!bugRows) bugRows = `<tr><td style="${S.td}" colspan="4" align="center" style="color:#888;">No bug fixes in this release</td></tr>`;

        // ── Detail sections (rich text release notes per ticket) ────────
        const detailSections = items.map(item => {
            const key = this.getTicketKey(item);
            const noteHtml = (this.releaseNoteContent[key] || '').trim();
            const ticketImages = this.rnTicketImages[key] || [];

            if (!noteHtml && ticketImages.length === 0) return '';

            const heading = item.description || item.title || 'Untitled';
            const dept = item.departmentName || 'General';

            const imagesHtml = ticketImages.map(img => `
        <div style="margin-top:12px;">
            ${img.caption ? `<p style="font-size:9pt;color:#555;margin:0 0 4px;font-style:italic;">${img.caption}</p>` : ''}
            <img src="${img.base64}" style="max-width:100%;height:auto;border:1px solid #ddd;border-radius:3px;" />
        </div>`
            ).join('');

            return `
    <div class="page-break-before" style="page-break-before:always;height:0;"></div>
    <div style="${S.page}">
      ${pageHeader(`${this.selectedPlatform?.name || 'Glosys'} Release Notes`)}
      <div style="margin-bottom:12px;">
        <span style="font-size:9pt;font-weight:600;background:#f2f2f2;border:1px solid #ccc;padding:2px 8px;border-radius:3px;">${dept}</span>
      </div>
      <h3 style="font-size:12pt;font-weight:700;margin:0 0 10px;">${heading}</h3>
      ${noteHtml ? `<div style="font-size:10.5pt;line-height:1.6;">${noteHtml}</div>` : ''}
      ${imagesHtml}
    </div>`;
        }).filter(h => h).join('');
        const pageBreak = isFirst ? '' : '<div class="page-break-before" style="page-break-before:always;height:0;"></div>';


        // ── PAGE 1: Cover page ──────────────────────────────────────────
        const coverPage = `
    <div style="${S.page}">
      <!-- Header: logo left, title center -->
      <table style="${S.tbl}border:none;margin-bottom:4px;">
        <tr>
          <td style="border:none;width:110px;vertical-align:middle;padding:0;">
            <img src="${logoSrc}" style="height:52px;width:auto;" crossorigin="anonymous" onerror="this.style.display='none'"/>
          </td>
          <td style="border:none;text-align:center;vertical-align:middle;padding:0;">
            <span style="font-size:20pt;font-weight:700;">${this.selectedPlatform?.name || 'Glosys'} Release Notes</span>
          </td>
          <td style="border:none;width:110px;padding:0;"></td>
        </tr>
      </table>
      <hr style="border:none;border-top:2px solid #000;margin:6px 0 40px;"/>

      <p style="text-align:center;font-size:13pt;margin:0 0 12px;"><strong>Release Notes</strong></p>
      <p style="text-align:center;font-size:13pt;margin:0 0 40px;"><strong>Version ${versionLabel}</strong></p>

      <!-- Meta table -->
      <table style="${S.tbl}width:auto;min-width:400px;margin:0 auto 40px;">
        <tr>
          <td style="${S.tdGray}width:130px;"><strong>Date</strong></td>
          <td style="${S.td}width:150px;">${todayStr}</td>
          <td style="${S.tdGray}width:150px;"><strong>Modification Date:</strong></td>
          <td style="${S.td}width:150px;">${buildDateStr}</td>
        </tr>
        <tr>
          <td style="${S.tdGray}"><strong>Author(s):</strong></td>
          <td style="${S.td}">${authorName}</td>
          <td style="${S.tdGray}"><strong>Approved by:</strong></td>
          <td style="${S.td}">${approverName}</td>
        </tr>
      </table>

      <!-- Privacy -->
      <p style="font-weight:700;font-size:10.5pt;margin:0 0 6px;"><strong>Privacy Information</strong></p>
      <p style="font-size:10pt;line-height:1.6;margin:0;">
        This document may contain information of a sensitive nature. This information should not be given to people 
        other than those who are involved with this system/project or who will become involved during its lifecycle.
      </p>
    </div>`;

        // ── PAGE 2: Summary table ───────────────────────────────────────
        const summaryPage = `
    <div style="page-break-before:always;"></div>
    <div style="${S.page}">
      ${pageHeader(`${this.selectedPlatform?.name || 'Glosys'} Release Notes`)}

      <!-- Release Details -->
      <table style="${S.tbl}margin-bottom:16px;">
        <thead>
          <tr>
            <th style="${S.th}width:180px;"></th>
            <th style="${S.th}">Department</th>
            <th style="${S.th}width:150px;">Signature</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="${S.td}">Prepared by:</td>
            <td style="${S.td}">Product Management Group</td>
            <td style="${S.td}">${authorName}</td>
          </tr>
          <tr>
            <td style="${S.td}">Authorized by:</td>
            <td style="${S.td}">Product Management Group</td>
            <td style="${S.td}">${approverName}</td>
          </tr>
        </tbody>
      </table>

      <!-- Main content table -->
      <table style="${S.tbl}">
        <tbody>
          <tr><td style="${S.th}" colspan="4">Overview</td></tr>
          <tr><td style="${S.td}" colspan="4">${overviewText}</td></tr>

          <tr><td style="${S.th}" colspan="4">New Features</td></tr>
          <tr>
            <td style="${S.th2}width:36px;">Sno</td>
            <td style="${S.th2}width:120px;">Department</td>
            <td style="${S.th2}" colspan="2">Description</td>
          </tr>
          ${featRows}

          <tr><td style="${S.th}" colspan="4">Bugs/ Fixes</td></tr>
          <tr>
            <td style="${S.th2}width:36px;">Sno</td>
            <td style="${S.th2}width:120px;">Department</td>
            <td style="${S.th2}width:80px;">Severity</td>
            <td style="${S.th2}">Issue Description</td>
          </tr>
          ${bugRows}

          <tr><td style="${S.th}" colspan="4">Known Issues</td></tr>
          <tr>
            <td style="${S.th2}width:36px;">Sno</td>
            <td style="${S.th2}width:120px;">Department</td>
            <td style="${S.th2}" colspan="2">Issue Description</td>
          </tr>
          <tr>
            <td style="${S.td}">NA</td>
            <td style="${S.td}">NA</td>
            <td style="${S.td}" colspan="2">NA</td>
          </tr>

          <tr><td style="${S.th}" colspan="4">Special instructions or guidance on how users can utilize the newly deployed features</td></tr>
          <tr><td style="${S.td}" colspan="4">${specialInstructions}</td></tr>

          <tr><td style="${S.th}" colspan="4">Configuration Impact:</td></tr>
          <tr>
            <td style="${S.td}" colspan="4">
              <ul style="margin:4px 0 4px 18px;padding:0;">${configLines}</ul>
            </td>
          </tr>
        </tbody>
      </table>
    </div>`;

        return `${pageBreak}${coverPage}${summaryPage}${detailSections}`;
    }
    private exportHTMLToPDF(bodyHtml: string, filename: string): void {
        this.showToast('Generating PDF...', 'info');

        const html2canvas = (window as any).html2canvas;
        const jsPDFLib = (window as any).jspdf?.jsPDF;

        if (!html2canvas || !jsPDFLib) {
            this.showToast('PDF library not loaded. Check index.html script tags.', 'error');
            console.error('html2canvas:', html2canvas, 'jsPDF:', jsPDFLib);
            return;
        }

        // ── Hidden clipper: zero size on screen, inner div fully rendered ──
        const clipper = document.createElement('div');
        clipper.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;overflow:hidden;z-index:-9999;';

        const container = document.createElement('div');
        container.style.cssText = 'position:absolute;top:0;left:0;width:794px;background:#ffffff;font-family:Calibri,Arial,sans-serif;color:#000;';
        container.innerHTML = bodyHtml;

        clipper.appendChild(container);
        document.body.appendChild(clipper);

        // Wait for all images to load
        const imgs = Array.from(container.querySelectorAll('img')) as HTMLImageElement[];
        const waitForImages = imgs.map(img =>
            new Promise<void>(resolve => {
                if (img.complete && img.naturalWidth > 0) { resolve(); return; }
                img.onload = () => resolve();
                img.onerror = () => resolve();
            })
        );

        Promise.all(waitForImages).then(() => {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {

                    const totalHeight = container.scrollHeight;
                    const totalWidth = container.scrollWidth;
                    console.log('📐 Container:', totalWidth, 'x', totalHeight);

                    if (!totalHeight) {
                        this.showToast('PDF content is empty — nothing to render.', 'error');
                        document.body.removeChild(clipper);
                        return;
                    }

                    html2canvas(container, {
                        scale: 2,
                        useCORS: true,
                        allowTaint: true,
                        logging: false,
                        width: 794,
                        windowWidth: 794,
                        scrollX: 0,
                        scrollY: 0,
                        backgroundColor: '#ffffff'
                    }).then((canvas: HTMLCanvasElement) => {

                        console.log('🎨 Canvas:', canvas.width, 'x', canvas.height);

                        if (!canvas.width || !canvas.height) {
                            this.showToast('Canvas capture failed.', 'error');
                            document.body.removeChild(clipper);
                            return;
                        }

                        const imgData = canvas.toDataURL('image/jpeg', 0.98);

                        // A4 dimensions in inches
                        const pageW = 8.27;
                        const pageH = 11.69;
                        const margin = 0.4;
                        const usableW = pageW - margin * 2;
                        const usableH = pageH - margin * 2;

                        // Scale canvas pixels → inches
                        const pxPerInch = canvas.width / usableW;
                        const imgH_inches = canvas.height / pxPerInch;

                        const pdf = new jsPDFLib('p', 'in', 'a4');

                        if (imgH_inches <= usableH) {
                            // Single page
                            pdf.addImage(imgData, 'JPEG', margin, margin, usableW, imgH_inches);
                        } else {
                            // Multi-page: slice canvas per page
                            const pageH_px = usableH * pxPerInch;
                            let offsetY_px = 0;
                            let isFirst = true;

                            while (offsetY_px < canvas.height) {
                                const sliceH_px = Math.min(pageH_px, canvas.height - offsetY_px);

                                // Create a per-page canvas slice
                                const pageCanvas = document.createElement('canvas');
                                pageCanvas.width = canvas.width;
                                pageCanvas.height = sliceH_px;

                                const ctx = pageCanvas.getContext('2d')!;
                                ctx.fillStyle = '#ffffff';
                                ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
                                ctx.drawImage(
                                    canvas,
                                    0, offsetY_px,           // source x, y
                                    canvas.width, sliceH_px, // source w, h
                                    0, 0,                    // dest x, y
                                    canvas.width, sliceH_px  // dest w, h
                                );

                                const sliceData = pageCanvas.toDataURL('image/jpeg', 0.98);
                                const sliceH_inch = sliceH_px / pxPerInch;

                                if (!isFirst) pdf.addPage();
                                pdf.addImage(sliceData, 'JPEG', margin, margin, usableW, sliceH_inch);

                                offsetY_px += sliceH_px;
                                isFirst = false;
                            }
                        }

                        pdf.save(filename);
                        document.body.removeChild(clipper);
                        this.showToast('PDF downloaded!', 'success');
                        this.cdr.detectChanges();

                    }).catch((err: any) => {
                        console.error('html2canvas error:', err);
                        document.body.removeChild(clipper);
                        this.showToast('Capture failed: ' + (err?.message || err), 'error');
                        this.cdr.detectChanges();
                    });
                });
            });
        });
    }
    rnFeatureCount(): number {
        return this.rnPreviewItems.filter(i => i.typeName !== 'Issue').length;
    }
    rnBugCount(): number {
        return this.rnPreviewItems.filter(i => i.typeName === 'Issue').length;
    }
    private ensureReleaseNotesLoaded(items: any[]) {
        const missing = items.filter(item => {
            const key = this.getTicketKey(item);
            return this.releaseNoteContent[key] === undefined;
        });

        if (missing.length === 0) {
            return of(undefined);
        }

        const calls = missing.map(item =>
            this.svc.getReleaseNote(item.id).pipe(
                catchError(() => of({ releaseNote: '' })),
                map((response: any) => {
                    const key = this.getTicketKey(item);
                    this.releaseNoteContent[key] = response.releaseNote || '';
                })
            )
        );

        return forkJoin(calls).pipe(map(() => undefined));
    }
    onRNTicketImageSelected(event: Event, item: any): void {
        const input = event.target as HTMLInputElement;
        if (!input.files?.length) return;
        const key = this.getTicketKey(item);
        if (!this.rnTicketImages[key]) this.rnTicketImages[key] = [];

        Array.from(input.files).forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.rnTicketImages[key].push({
                    file,
                    base64: e.target?.result as string,
                    caption: ''
                });
                this.cdr.detectChanges();
            };
            reader.readAsDataURL(file);
        });
        input.value = '';
    }

    // Add this trigger method — uses ID instead of template ref
    triggerRNTicketImageInput(ticketKey: string): void {
        const input = document.getElementById('rnImg_' + ticketKey) as HTMLInputElement;
        if (input) { input.value = ''; input.click(); }
    }
    removeRNTicketImage(ticketKey: string, index: number): void {
        if (this.rnTicketImages[ticketKey]) {
            this.rnTicketImages[ticketKey].splice(index, 1);
            this.cdr.detectChanges();
        }
    }

     
    private resetToHomeState(): void {
        this.selectedPlatform = null;
        this.platformFilter = null;
        this.selectedEntity = null;
        this.selectedView = 'department';
        this.platformGroupedData = [];
        this.platformCurrentBuildData = { items: [] };
        this.platformPreviousBuildsData = [];
        this.platformFutureReleasesData = { items: [] };
        this.pipelineTickets = [];
        this.filteredPipelineTickets = [];
        this.currentBuildData = { items: [] };
        this.previousBuildsData = [];
        this.groupedDataArray = [];
        this.expandedBuilds.clear();
        this.expandedDepts.clear();
        this.isCurrentBuildsExpanded = false;
        this.isFutureReleasesExpanded = false;
        this.isPreviousBuildsExpanded = false;
        this.editingStatus = {};
        this.selectedNewStatus = {};
        this.savingStatus = {};
        this.router.navigate([], { relativeTo: this.route, queryParams: {}, queryParamsHandling: '' });
        this.cdr.detectChanges();
    }
}
 