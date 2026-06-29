// src/app/services/dashboard.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { KeyRiskModel } from '../models/dashboard.models';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import {
    AlertModel, CategoryModel, CrPipelineModel,
    DashboardKpiModel, DepartmentSummaryRow, EntityModel,
    MasterConfigModel, PortfolioSummaryModel,
    ReleaseHistoryModel, SubcategoryModel,
    TicketFilterRequest, TicketModel,
    PlatformModel
} from '../models/dashboard.models';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class DashboardService {

    private base = environment.apiUrl + '/api/dashboard';
    private apiBase = environment.apiUrl + '/api/dashboard';
    // Subject to communicate entity selection between components

    private selectedEntitySubject = new BehaviorSubject<PortfolioSummaryModel | null>(null);
    selectedEntity$ = this.selectedEntitySubject.asObservable();

    // ✅ Add this
    getCurrentEntity(): PortfolioSummaryModel | null {
        return this.selectedEntitySubject.getValue();
    }
    getTicketAuditLog(ticketId: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.base}/tickets/${ticketId}/audit-log`);
    }

    constructor(private http: HttpClient) {
        console.log('API Base URL:', this.base);

        // ✅ Restore selected entity on page refresh
        const saved = localStorage.getItem('selectedEntity');
        if (saved) {
            try {
                const entity = JSON.parse(saved);
                this.selectedEntitySubject.next(entity);
            } catch {
                localStorage.removeItem('selectedEntity');
            }
        }
    }

    // Method to set selected entity (called from Portfolio component)
    // ✅ New - matches what portfolio actually passes
    setSelectedEntity(entity: PortfolioSummaryModel | null): void {
        this.selectedEntitySubject.next(entity);
        if (entity) {
            localStorage.setItem('selectedEntity', JSON.stringify(entity));
        } else {
            localStorage.removeItem('selectedEntity');
        }
    }

    deactivateTicket(ticketId: number, reason: string): Observable<any> {
        return this.http.put(`${this.base}/tickets/${ticketId}/deactivate`, { reason });
    }

    activateTicket(ticketId: number): Observable<any> {
        return this.http.put(`${this.base}/tickets/${ticketId}/activate`, {});
    }


    // ── Entities ────────────────────────────────────────────────
    getEntities(): Observable<EntityModel[]> {
        return this.http.get<EntityModel[]>(`${this.base}/entities`);
    }

    // ── Master Config ───────────────────────────────────────────
    getMasterConfig(entityId?: number, fieldType?: string): Observable<MasterConfigModel[]> {
        let params = new HttpParams();
        if (entityId != null) params = params.set('entityId', entityId);
        if (fieldType) params = params.set('fieldType', fieldType);
        return this.http.get<MasterConfigModel[]>(`${this.base}/master-config`, { params });
    }

    // ── Categories ──────────────────────────────────────────────
    getCategories(entityId?: number): Observable<CategoryModel[]> {
        let params = new HttpParams();
        if (entityId != null) params = params.set('entityId', entityId);
        return this.http.get<CategoryModel[]>(`${this.base}/categories`, { params });
    }
    updateTicketStatus(ticketId: number, statusId: number, statusName: string): Observable<any> {
        return this.http.put(`${this.base}/tickets/${ticketId}/status`, { statusId, statusName });
    }

    // ── Subcategories ───────────────────────────────────────────
    getSubcategories(categoryId?: number, entityId?: number): Observable<SubcategoryModel[]> {
        let params = new HttpParams();
        if (categoryId != null) params = params.set('categoryId', categoryId);
        if (entityId != null) params = params.set('entityId', entityId);
        return this.http.get<SubcategoryModel[]>(`${this.base}/subcategories`, { params });
    }


    updateTicketBuildNo(ticketId: number, buildNo: string): Observable<any> {
        return this.http.put(`${this.base}/tickets/${ticketId}/build-no`, { buildNo });
    }

    // In dashboard.service.ts - these are already correct
    updateTicketPlannedDate(ticketId: number, plannedDate: string | null): Observable<any> {
        return this.http.put(`${this.base}/tickets/${ticketId}/planned-date`, { plannedDate });
    }

    updateTicketBuildDate(ticketId: number, buildDate: string | null): Observable<any> {
        return this.http.put(`${this.base}/tickets/${ticketId}/build-date`, { buildDate });
    }
    getTickets(filter: any): Observable<TicketModel[]> {
        let params = new HttpParams();
        if (filter.entityId != null) params = params.set('entityId', filter.entityId);
        if (filter.statusId != null) params = params.set('statusId', filter.statusId);
        if (filter.typeId != null) params = params.set('typeId', filter.typeId);
        if (filter.priorityId != null) params = params.set('priorityId', filter.priorityId);

        return this.http.get<TicketModel[]>(`${this.base}/tickets`, { params });
    }

    // ── KPI ─────────────────────────────────────────────────────
    getKpi(entityId?: number): Observable<DashboardKpiModel> {
        let params = new HttpParams();
        if (entityId != null) params = params.set('entityId', entityId);
        return this.http.get<DashboardKpiModel>(`${this.base}/kpi`, { params });
    }


    getHelpdeskCount(timeFilter: string, date: string): Observable<any> {
        let url = `${this.apiBase}/helpdesk/dashboard-count?time_filter=${timeFilter}`;

        if (timeFilter === 'daily' || timeFilter === 'weekly') {
            url += `&date=${date}`;
        } else if (timeFilter === 'monthly') {
            const month = String(new Date().getMonth() + 1).padStart(2, '0');
            url += `&month=${month}`;
        }

        console.log('🔵 Calling Helpdesk API:', url);
        return this.http.get<any>(url);
    }


    // ── Portfolio entity-level summary (top cards) ───────────────
    getPortfolioSummary(): Observable<any[]> {
        const userStr = localStorage.getItem('user');
        const user = userStr ? JSON.parse(userStr) : null;
        // ✅ Try all possible ID field names
        const userId = user?.id ?? user?.userId ?? user?.user_id ?? user?.Id ?? null;

        console.log('🔍 Resolved userId for summary:', userId);


        console.log('🔍 localStorage user:', user); // ← add this to see the full object
        console.log('🔍 HI Uset:', user);
        const params = user?.id ? `?userId=${user.id}` : '';
        return this.http.get<any[]>(`${this.apiBase}/portfolio/summary${params}`);
    }

    createTicket(ticket: any): Observable<any> {
        return this.http.post(`${this.base}/tickets`, ticket);
    }


    // ── Portfolio categories (used internally — same endpoint) ───
    getPortfolioCategories(): Observable<PortfolioSummaryModel[]> {
        return this.http.get<PortfolioSummaryModel[]>(`${this.base}/portfolio`);
    }

    // ── Department drill-down (click an entity card) ─────────────
    getDepartmentSummary(entityId: number): Observable<DepartmentSummaryRow[]> {
        let params = new HttpParams();
        if (entityId != null) params = params.set('entityId', entityId);
        return this.http.get<any[]>(`${this.base}/department-summary`, { params }).pipe(
            map(data => data.map(item => ({
                id: item.Id || item.id,
                ticketNo: item.TicketNo || item.ticketNo,
                title: item.Title || item.title,
                assignee: item.Assignee || item.assignee,
                entityId: item.EntityId || item.entityId,
                entityName: item.EntityName || item.entityName,
                categoryName: item.CategoryName || item.categoryName,
                departmentName: item.DepartmentName || item.departmentName,
                platformName: item.PlatformName || item.platformName,
                priorityName: item.PriorityName || item.priorityName,
                statusName: item.StatusName || item.statusName,
                typeName: item.TypeName || item.typeName,
                scheduleBuildNo: item.ScheduleBuildNo || item.scheduleBuildNo,
                scheduleBuildDate: item.ScheduleBuildDate || item.scheduleBuildDate,
                plannedDate: item.PlannedDate || item.plannedDate,
                remarks: item.Remarks || item.remarks,
                createdDate: item.CreatedDate || item.createdDate,
                functionalCount: item.FunctionalCount || item.functionalCount || 0,
                technicalCount: item.TechnicalCount || item.technicalCount || 0,
                testingCount: item.TestingCount || item.testingCount || 0,
                deploymentCount: item.DeploymentCount || item.deploymentCount || 0,
                inProduction: item.InProduction || item.inProduction || 0,
                totalTickets: item.TotalTickets || item.totalTickets || 0
            })))
        );
    }

    // ── CR Pipeline ─────────────────────────────────────────────
    getCrPipeline(entityId?: number): Observable<CrPipelineModel[]> {
        let params = new HttpParams();
        if (entityId != null) params = params.set('entityId', entityId);
        return this.http.get<CrPipelineModel[]>(`${this.base}/cr-pipeline`, { params });
    }

    // ── Releases ─────────────────────────────────────────────────
    getReleases(entityId?: number): Observable<ReleaseHistoryModel[]> {
        let params = new HttpParams();
        if (entityId != null) params = params.set('entityId', entityId);
        return this.http.get<ReleaseHistoryModel[]>(`${this.base}/releases`, { params });
    }

    // ── Alerts ──────────────────────────────────────────────────
    getAlerts(entityId?: number): Observable<AlertModel[]> {
        let params = new HttpParams();
        if (entityId != null) params = params.set('entityId', entityId);
        return this.http.get<AlertModel[]>(`${this.base}/alerts`, { params });
    }
    getActiveUsers(): Observable<any[]> {
        return this.http.get<any[]>(`${this.base}/active-users`);
    }
    updateTicketAssignedUser(ticketId: number, userId: number): Observable<any> {
        console.log('Calling API to update ticket:', ticketId, 'with user:', userId);
        return this.http.put(`${this.base}/tickets/${ticketId}/assigned-user`, { userId });
    }
    getBuildDocuments(buildNo: string, platformId?: number): Observable<any[]> {
        let params = new HttpParams();
        params = params.set('buildNo', buildNo);
        if (platformId) params = params.set('platformId', platformId.toString());
        return this.http.get<any[]>(`${this.base}/build-documents`, { params });
    }

    uploadBuildDocument(file: File, buildNo: string, platformId?: number, entityId?: number): Observable<any> {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('buildNo', buildNo);
        if (platformId) formData.append('platformId', platformId.toString());
        if (entityId) formData.append('entityId', entityId.toString());
        return this.http.post(`${this.base}/build-documents/upload`, formData);
    }

    deleteBuildDocument(id: number): Observable<any> {
        return this.http.delete(`${this.base}/build-documents/${id}`);
    }
    // ── Platforms ────────────────────────────────────────────────
    getPlatforms(entityId?: number): Observable<PlatformModel[]> {
        let params = new HttpParams();
        if (entityId != null) params = params.set('entityId', entityId);
        params = params.set('fieldType', 'Platforms');
        return this.http.get<MasterConfigModel[]>(`${this.base}/master-config`, { params }).pipe(
            map(platforms => platforms.map(p => ({
                id: p.id,
                fieldType: p.fieldType,
                fieldName: p.fieldName,
                fieldValues: p.fieldValues,
                entityIds: this.parseEntityIds(p.entityIds),
                isMandatory: p.isMandatory,
                isActive: p.isActive
            })))
        );
    }
    // Key Risks CRUD operations
    getKeyRisks(entityId?: number, category?: string): Observable<KeyRiskModel[]> {
        let params = new HttpParams();
        if (entityId != null) {
            params = params.set('entityId', entityId.toString());
        }
        if (category) {
            params = params.set('category', category);
        }
        console.log('🔵 Service: getKeyRisks called with entityId:', entityId, 'category:', category);
        console.log('🔵 Service: Full URL:', `${this.base}/key-risks`, { params });
        return this.http.get<KeyRiskModel[]>(`${this.base}/key-risks`, { params });
    }

    getKeyRiskById(id: number): Observable<KeyRiskModel> {
        return this.http.get<KeyRiskModel>(`${this.base}/key-risks/${id}`);
    }

    updateKeyRisk(id: number, risk: any): Observable<any> {
        console.log(`Sending update to API for ID ${id}:`, risk);
        return this.http.put(`${this.base}/key-risks/${id}`, risk);
    }

    createKeyRisk(risk: any): Observable<any> {
        console.log('Sending create to API:', risk);
        return this.http.post(`${this.base}/key-risks`, risk);
    }

    deleteKeyRisk(id: number): Observable<any> {
        return this.http.delete(`${this.base}/key-risks/${id}`);
    }
    getReleaseNote(ticketId: number): Observable<any> {
        return this.http.get(`${this.base}/release-note/${ticketId}`);
    }

    // ✅ ADD THIS METHOD - Update release note
    updateReleaseNote(ticketId: number, releaseNote: string): Observable<any> {
        return this.http.put(`${this.base}/release-note/${ticketId}`, { releaseNote });
    }


    private parseEntityIds(entityIdsStr: any): number[] {
        if (!entityIdsStr) return [];
        if (Array.isArray(entityIdsStr)) return entityIdsStr.map(Number);
        try {
            const parsed = JSON.parse(String(entityIdsStr));
            if (Array.isArray(parsed)) return parsed.map(Number);
            return [];
        } catch {
            return [];
        }
    }

}