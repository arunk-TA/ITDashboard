// generic-risks.component.ts

import { Component, Input, OnInit, OnDestroy, AfterViewInit, ChangeDetectorRef, ElementRef } from '@angular/core';
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
    private resizeObserver: ResizeObserver | null = null;
    private readonly SIZE_STORAGE_PREFIX = 'risk-card-size-';
    private readonly CARD_TRACK_WIDTH = 350;
    private readonly GRID_GAP = 20;


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
    draggedIndex: number | null = null;
    dragOverIndex: number | null = null;
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
        private cdr: ChangeDetectorRef,
        private elementRef: ElementRef
    ) { }

    ngOnInit(): void {
        this.setupPermissions();
        this.loadRisks();
    }
    ngAfterViewInit(): void {
        this.setupResizeObserver();
    }

    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
    }

    private setupResizeObserver(): void {
        this.resizeObserver = new ResizeObserver((entries) => {
            const containerWidth = this.elementRef.nativeElement.querySelector('.risks-grid')?.clientWidth || window.innerWidth;
            for (const entry of entries) {
                const card = entry.target as HTMLElement;
                const riskId = card.getAttribute('data-risk-id');
                if (!riskId) continue;
                const { width, height } = entry.contentRect;
                if (width > 0 && height > 0) {
                    const safeWidth = Math.min(width, containerWidth);
                    if (width > containerWidth) {
                        card.style.width = safeWidth + 'px'; // force it back in bounds live
                    }
                    localStorage.setItem(this.SIZE_STORAGE_PREFIX + riskId, JSON.stringify({ width: safeWidth, height }));
                }
            }
        });

        this.observeAllCards();
    }

    private observeAllCards(): void {
        if (!this.resizeObserver) return;
        const cards: HTMLElement[] = Array.from(
            this.elementRef.nativeElement.querySelectorAll('.risk-card')
        );

        const containerWidth = this.elementRef.nativeElement
            .querySelector('.risks-grid')?.clientWidth || window.innerWidth;

        const sizesToApply = cards.map(card => {
            const riskId = card.getAttribute('data-risk-id');
            if (!riskId) return null;
            const saved = localStorage.getItem(this.SIZE_STORAGE_PREFIX + riskId);
            if (!saved) return null;
            try {
                const parsed = JSON.parse(saved);
                return { card, ...parsed };
            } catch {
                return null;
            }
        }).filter(Boolean) as { card: HTMLElement; width: number; height: number }[];

        requestAnimationFrame(() => {
            sizesToApply.forEach(({ card, width, height }) => {
                const safeWidth = Math.min(width, containerWidth);
                card.style.width = safeWidth + 'px';
                card.style.height = height + 'px';
            });
            cards.forEach(card => this.resizeObserver!.observe(card));
        });
    }
     
    private restoreCardSize(card: HTMLElement): void {
        const riskId = card.getAttribute('data-risk-id');
        if (!riskId) return;

        const saved = localStorage.getItem(this.SIZE_STORAGE_PREFIX + riskId);
        if (saved) {
            try {
                const { width, height } = JSON.parse(saved);
                card.style.width = width + 'px';
                card.style.height = height + 'px';
            } catch (e) {
                console.warn('Failed to restore card size:', e);
            }
        }
    }

   

     
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
    onDragStart(event: DragEvent, index: number): void {
        this.draggedIndex = index;
        const risk = this.filteredRisks[index];

        // Store the data
        event.dataTransfer?.setData('text/plain', JSON.stringify({
            index: index,
            id: risk.id
        }));
        event.dataTransfer!.effectAllowed = 'move';

        // Add dragging class for visual feedback
        const card = (event.target as HTMLElement).closest('.risk-card');
        if (card) {
            setTimeout(() => {
                card.classList.add('dragging');
            }, 0);
        }
    }

    onDragOver(event: DragEvent): void {
        event.preventDefault();
        event.dataTransfer!.dropEffect = 'move';

        // Get the drop target index
        const target = (event.target as HTMLElement).closest('.risk-card');
        if (target) {
            const index = parseInt(target.getAttribute('data-index') || '');
            if (!isNaN(index) && index !== this.dragOverIndex) {
                this.dragOverIndex = index;
                this.cdr.detectChanges();
            }
        }
    }

    onDrop(event: DragEvent, dropIndex: number): void {
        event.preventDefault();

        const rawData = event.dataTransfer?.getData('text');
        if (!rawData) {
            this.resetDragState();
            return;
        }

        try {
            const draggedData = JSON.parse(rawData);
            const draggedId = draggedData.id;

            // Find the dragged risk in the main array
            const draggedRisk = this.risks.find(r => r.id === draggedId);
            const targetRisk = this.filteredRisks[dropIndex];

            if (!draggedRisk || !targetRisk) {
                this.resetDragState();
                return;
            }

            // Get indices in the main risks array
            const draggedIndex = this.risks.indexOf(draggedRisk);
            const targetIndex = this.risks.indexOf(targetRisk);

            if (draggedIndex === -1 || targetIndex === -1) {
                this.resetDragState();
                return;
            }

            // Swap the items in the array
            [this.risks[draggedIndex], this.risks[targetIndex]] =
                [this.risks[targetIndex], this.risks[draggedIndex]];

            // Reapply filter
            this.applyFilter();

            // ✅ Save the new order to database - FIX: use dashboardService
            const orderedIds = this.filteredRisks.map(r => r.id!);
            this.dashboardService.reorderKeyRisks(orderedIds).subscribe({
                next: () => {
                    this.showToast('Panel reordered successfully', 'success');
                },
                error: (err: any) => {  // ✅ Add explicit 'any' type
                    console.error('Failed to save order:', err);
                    // Rollback the order change
                    this.loadRisks();
                    this.showToast('Failed to save order. Please try again.', 'error');
                }
            });

        } catch (error) {
            console.error('Error during drag and drop:', error);
        }

        this.resetDragState();
    }
    onDragEnd(event: DragEvent): void {
        this.resetDragState();
    }

    onDragLeave(event: DragEvent): void {
        const target = (event.target as HTMLElement).closest('.risk-card');
        if (target) {
            target.classList.remove('drag-over');
        }
        this.dragOverIndex = null;
    }

    private resetDragState(): void {
        this.draggedIndex = null;
        this.dragOverIndex = null;
        document.querySelectorAll('.risk-card').forEach(card => {
            card.classList.remove('dragging', 'drag-over');
        });
        this.cdr.detectChanges();
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

        this.dashboardService.getKeyRisks(this.entityId, this.category).subscribe({
            next: (data: any) => {
                this.risks = data || [];
                this.applyFilter();
                this.loading = false;
                this.cdr.detectChanges();

                // Cards now exist in the DOM — attach observers and restore sizes
                setTimeout(() => {
                    this.observeAllCards();
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