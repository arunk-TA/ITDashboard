// generic-risks.component.ts

import { Component, Input, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardService } from '../../services/dashboard.service';
import { AuthService } from '../../services/auth.service';
import { RichTextEditorComponent } from '../rich-text-editor/rich-text-editor.component';
import { Subscription } from 'rxjs';

export interface Risk {
    id?: number;
    title: string;
    description: string;
    severity: string;
    status: string;
    assignedTo: string;
    dueDate?: string | null;
    mitigationPlan?: string;
    createdAt?: string;
    updatedAt?: string;
    createdBy?: string;
    entityId?: number;
    type?: string;
    category?: string;
}

@Component({
    selector: 'app-generic-risks',
    standalone: true,
    imports: [CommonModule, FormsModule, RichTextEditorComponent],
    templateUrl: './generic-risks.component.html',
    styleUrls: ['./generic-risks.component.css']
})
export class GenericRisksComponent implements OnInit, OnDestroy {
    // ============================================
    // TOAST NOTIFICATIONS
    // ============================================
    toasts: { id: number; message: string; type: 'success' | 'error' | 'info'; visible: boolean }[] = [];
    private toastCounter = 0;

    showConfirmDialog: boolean = false;
    confirmDialogMessage: string = '';
    confirmDialogCallback: (() => void) | null = null;
    confirmDialogTitle: string = 'Confirm Delete';


    @Input() pageTitle: string = 'Risks Dashboard';
    @Input() addButtonText: string = 'Add Risk';
    @Input() category: 'key_risks' | 'ceo_attention' = 'key_risks';
    @Input() entityId: number = 1;

    // ============================================
    // PERMISSIONS PROPERTIES
    // ============================================
    canManage: boolean = false;
    isViewer: boolean = true;
    canEdit: boolean = false;
    canDelete: boolean = false;
    canCreate: boolean = false;
    canAssignResource: boolean = false;
    isCEO: boolean = false;
    isSupervisor: boolean = false;
    isAdmin: boolean = false;

    // Data
    risks: Risk[] = [];
    filteredRisks: Risk[] = [];
    loading: boolean = true;
    saving: boolean = false;

    // Filters
    searchTerm: string = '';
    filterSeverity: string = '';
    filterStatus: string = '';

    // Modal
    showModal: boolean = false;
    isEditing: boolean = false;
    currentRisk: Risk = this.getEmptyRisk();

    // Options
    severities: string[] = ['Critical', 'High', 'Medium', 'Low'];
    statuses: string[] = ['Open', 'In Progress', 'Mitigated', 'Closed'];

    private subscriptions: Subscription = new Subscription();

    constructor(
        private dashboardService: DashboardService,
        private authService: AuthService,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        this.setupPermissions();
        this.loadRisks();
    }

    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
    }

    // ============================================
    // TOAST METHODS
    // ============================================

    showToast(message: string, type: 'success' | 'error' | 'info' = 'success', duration: number = 3000): void {
        const id = ++this.toastCounter;
        this.toasts.push({ id, message, type, visible: true });
        this.cdr.detectChanges();

        if (type !== 'error') {
            setTimeout(() => this.dismissToast(id), duration);
        }
    }
    // generic-risks.component.ts - Add these methods

    openConfirmDialog(message: string, callback: () => void, title: string = 'Confirm Delete'): void {
        this.confirmDialogTitle = title;
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

    // ============================================
    // PERMISSIONS
    // ============================================

    // generic-risks.component.ts - Fixed setupPermissions()

    private setupPermissions(): void {
        this.subscriptions.add(
            this.authService.currentUser$.subscribe((user: any) => {
                if (user) {
                    const roles = this.authService.getUserRoles();
                    this.isCEO = roles.includes('CEO');
                    this.isSupervisor = roles.includes('Supervisor');
                    this.isAdmin = roles.includes('Admin');
                    this.isViewer = this.authService.isViewer;

                    const hasManagementRole = this.isSupervisor || this.isAdmin;

                    // ✅ For both Key Risks and CEO Attention:
                    // - CEO, Supervisor, Admin: Full access (edit/delete/create)
                    // - Viewer with CEO role (Raman): Full access (edit/delete/create)
                    // - Regular Viewer: No access

                    // Allow access if user has CEO, Supervisor, or Admin role
                    // Viewer status doesn't block access if they have CEO role
                    if (this.isCEO || hasManagementRole) {
                        this.canEdit = true;
                        this.canDelete = true;
                        this.canCreate = true;
                        this.canAssignResource = true;
                        this.canManage = true;
                        this.isViewer = false;
                    } else {
                        // Regular viewers or users without roles
                        this.canEdit = false;
                        this.canDelete = false;
                        this.canCreate = false;
                        this.canAssignResource = false;
                        this.canManage = false;
                        this.isViewer = true;
                    }

                    console.log(`🔐 Risk Permissions for ${this.category}:`, {
                        user: user.email,
                        roles: roles,
                        category: this.category,
                        isCEO: this.isCEO,
                        isSupervisor: this.isSupervisor,
                        isAdmin: this.isAdmin,
                        isViewer: this.isViewer,
                        hasManagementRole: hasManagementRole,
                        canEdit: this.canEdit,
                        canDelete: this.canDelete,
                        canCreate: this.canCreate,
                        canManage: this.canManage
                    });
                } else {
                    this.canManage = false;
                    this.isViewer = true;
                    this.canEdit = false;
                    this.canDelete = false;
                    this.canCreate = false;
                    this.canAssignResource = false;
                    this.isCEO = false;
                    this.isSupervisor = false;
                    this.isAdmin = false;
                }
                this.cdr.detectChanges();
            })
        );
    }
    private getEmptyRisk(): Risk {
        return {
            title: '',
            description: '',
            severity: 'Medium',
            status: 'Open',
            assignedTo: '',
            dueDate: '',
            mitigationPlan: '',
            category: this.category,
            entityId: this.entityId
        };
    }

    // ============================================
    // DATA METHODS
    // ============================================

    // generic-risks.component.ts - Fixed loadRisks method

    loadRisks(): void {
        this.loading = true;
        this.cdr.detectChanges();

        console.log('🔄 Loading risks with entityId:', this.entityId, 'category:', this.category);

        this.dashboardService.getKeyRisks(this.entityId, this.category).subscribe({
            next: (data: any) => {
                console.log('✅ API returned risks:', data);
                console.log('✅ Number of risks:', data?.length || 0);

                this.risks = data || [];
                this.applyFilter();
                this.loading = false;
                this.cdr.detectChanges();

                // ✅ Force UI update after a short delay
                setTimeout(() => {
                    this.cdr.detectChanges();
                }, 100);
            },
            error: (err: any) => {
                console.error('Error loading risks:', err);
                this.loading = false;
                this.cdr.detectChanges();
            }
        });
    }
    applyFilter(): void {
        const search = this.searchTerm.toLowerCase();
        this.filteredRisks = this.risks.filter((risk: Risk) => {
            const matchSearch = !search ||
                risk.title.toLowerCase().includes(search) ||
                risk.description.toLowerCase().includes(search) ||
                (risk.assignedTo && risk.assignedTo.toLowerCase().includes(search));

            const matchSeverity = !this.filterSeverity || risk.severity === this.filterSeverity;
            const matchStatus = !this.filterStatus || risk.status === this.filterStatus;

            return matchSearch && matchSeverity && matchStatus;
        });
        this.cdr.detectChanges();
    }

    resetFilter(): void {
        this.searchTerm = '';
        this.filterSeverity = '';
        this.filterStatus = '';
        this.applyFilter();
    }

    // ============================================
    // MODAL METHODS
    // ============================================

    openAddModal(): void {
        if (!this.canCreate) {
            this.showToast('You do not have permission to create items.', 'error');
            return;
        }
        this.isEditing = false;
        this.currentRisk = this.getEmptyRisk();
        this.showModal = true;
        this.cdr.detectChanges();
    }

    openEditModal(risk: Risk): void {
        if (!this.canEdit) {
            this.showToast('You do not have permission to edit items.', 'error');
            return;
        }
        this.isEditing = true;
        this.currentRisk = { ...risk };
        this.showModal = true;
        this.cdr.detectChanges();
    }

    closeModal(): void {
        this.showModal = false;
        this.currentRisk = this.getEmptyRisk();
        this.cdr.detectChanges();
    }

    // ============================================
    // SAVE METHODS
    // ============================================

    // generic-risks.component.ts - Updated saveRisk method

    // generic-risks.component.ts - Fixed saveRisk method

    saveRisk(): void {
        if (!this.canManage) return;

        const title = this.currentRisk.title?.trim() || '';
        const description = this.currentRisk.description?.trim() || '';

        if (!title) {
            this.showToast('Title is required.', 'error');
            return;
        }

        if (!description || description === '<p><br></p>' || description === '<p></p>' || description === '') {
            this.showToast('Description is required.', 'error');
            return;
        }

        this.saving = true;
        this.cdr.detectChanges();

        let dueDate: string | null = null;
        if (this.currentRisk.dueDate) {
            const dateStr = this.currentRisk.dueDate;
            if (dateStr.includes('T')) {
                dueDate = dateStr.split('T')[0];
            } else if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
                dueDate = dateStr;
            } else {
                try {
                    const parsed = new Date(dateStr);
                    if (!isNaN(parsed.getTime())) {
                        const year = parsed.getFullYear();
                        const month = String(parsed.getMonth() + 1).padStart(2, '0');
                        const day = String(parsed.getDate()).padStart(2, '0');
                        dueDate = `${year}-${month}-${day}`;
                    }
                } catch {
                    dueDate = null;
                }
            }
        }

        const riskData = {
            title: title,
            description: description,
            severity: this.currentRisk.severity || 'Medium',
            status: this.currentRisk.status || 'Open',
            assignedTo: this.currentRisk.assignedTo || '',
            dueDate: dueDate,
            mitigationPlan: this.currentRisk.mitigationPlan || '',
            category: this.category,
            entityId: this.entityId
        };

        console.log('📤 Sending to API:', riskData);

        if (this.isEditing && this.currentRisk.id) {
            this.dashboardService.updateKeyRisk(this.currentRisk.id, riskData).subscribe({
                next: (updated: any) => {
                    console.log('✅ Update response:', updated);

                    // ✅ Close modal and reset saving flag
                    this.saving = false;
                    this.closeModal();
                    this.showToast('Item updated successfully', 'success');

                    // ✅ Reload data immediately
                    this.loadRisks();
                    this.cdr.detectChanges();
                },
                error: (err: any) => {
                    console.error('❌ Error updating risk:', err);
                    this.saving = false;
                    this.showToast('Failed to update item', 'error');
                    this.cdr.detectChanges();
                }
            });
        } else {
            this.dashboardService.createKeyRisk(riskData).subscribe({
                next: (created: any) => {
                    console.log('✅ Create response:', created);

                    // ✅ Close modal and reset saving flag
                    this.saving = false;
                    this.closeModal();
                    this.showToast('Item created successfully', 'success');

                    // ✅ Reload data immediately (not after delay)
                    this.loadRisks();
                    this.cdr.detectChanges();
                },
                error: (err: any) => {
                    console.error('❌ Error creating risk:', err);
                    this.saving = false;
                    this.showToast('Failed to create item', 'error');
                    this.cdr.detectChanges();
                }
            });
        }
    }
    deleteRisk(id: number): void {
        if (!this.canDelete) {
            this.showToast('You do not have permission to delete items.', 'error');
            return;
        }

        // ✅ Use custom confirm dialog instead of browser confirm
        this.openConfirmDialog(
            'Are you sure you want to delete this item? This action cannot be undone.',
            () => {
                this.dashboardService.deleteKeyRisk(id).subscribe({
                    next: () => {
                        this.risks = this.risks.filter((r: Risk) => r.id !== id);
                        this.applyFilter();
                        this.showToast('Item deleted successfully', 'success');
                        this.cdr.detectChanges();
                    },
                    error: (err: any) => {
                        console.error('Error deleting risk:', err);
                        this.showToast('Failed to delete item', 'error');
                        this.cdr.detectChanges();
                    }
                });
            }
        );
    }
    // ============================================
    // UI HELPERS
    // ============================================

    getSeverityClass(severity: string): string {
        const map: { [key: string]: string } = {
            'Critical': 'severity-critical',
            'High': 'severity-high',
            'Medium': 'severity-medium',
            'Low': 'severity-low'
        };
        return map[severity] || '';
    }

    getStatusClass(status: string): string {
        const map: { [key: string]: string } = {
            'Open': 'status-open',
            'In Progress': 'status-progress',
            'Mitigated': 'status-mitigated',
            'Closed': 'status-closed'
        };
        return map[status] || '';
    }
}