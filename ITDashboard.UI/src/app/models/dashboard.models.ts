// src/app/models/dashboard.models.ts

export interface EntityModel {
    id: number;
    name: string;
    description?: string;
    displayName: string;
    address?: string;
    logo?: string;
    contactEmail?: string;
    isActive: boolean;
    createdDate: string;
}

export interface MasterConfigModel {
    id: number;
    fieldType: string;
    referrenceTo: string | null;
    fieldName: string;
    fieldValues: string;
    entityIds: string;
    isMandatory: string;
    isActive: string;
    createdDate: string;
    createdBy: string;
    updatedBy: string;
    updatedDate: string;
}

export interface CategoryModel {
    id: number;
    entityIds?: string;
    categoryName: string;
    categoryDescription?: string;
    isActive?: string;
    departmentId?: number;
    departmentName?: string;
    createdDate?: string;
}

export interface SubcategoryModel {
    id: number;
    subcategoryName: string;
    subcategoryDescription?: string;
    categoryId: number;
    categoryName?: string;
}

// Raw row returned by sp_get_department_summary
export interface DepartmentSummaryRow {
    id: number;
    ticketNo: number;
    title: string;
    assignee?: string;
    entityId?: number;
    entityName?: string;
    categoryName?: string;
    departmentName?: string;
    platformName?: string;
    priorityName?: string;
    statusName?: string;
    typeName?: string;
    scheduleBuildNo?: string;
    scheduleBuildDate?: string;
    plannedDate?: string;
    remarks?: string;
    createdDate: string;
    functionalCount: number;
    technicalCount: number;
    testingCount: number;
    deploymentCount: number;
    inProduction: number;
    totalTickets: number;
}

// Grouped shape used in the HTML template
export interface DeptGroupRow {
    departmentName: string;
    totalTickets: number;
    functionalCount: number;
    technicalCount: number;
    testingCount: number;
    deploymentCount: number;
    inProduction: number;
    releases: DepartmentSummaryRow[];
}

export interface TicketModel {
    id: number;
    ticketNo: number;
    title: string;
    description?: string;
    assignee?: string;
    entityId?: number;
    entityName?: string;
    categoryId?: number;
    categoryName?: string;
    departmentId?: number;
    departmentName?: string;
    platformId?: number;
    platformName?: string;
    priorityId?: number;
    priorityName?: string;
    statusId?: number;
    statusName?: string;
    typeId?: number;
    typeName?: string;
    scheduleBuildNo?: string;
    plannedDate?: string;
    scheduleBuildDate?: string;
    remarks?: string;
    createdDate: string;
    updatedDate?: string;
}

export interface DashboardKpiModel {
    totalTickets: number;
    yetToStart: number;
    openTickets: number;
    inProgress: number;
    closedTickets: number;
    overdueTickets: number;
    totalCr: number;
    totalIncidents: number;
      
}

export interface PortfolioSummaryModel {
    entityId?: number;
    entityName?: string;
    displayOrder?: number; 
    categoryId?: number;
    categoryName?: string;
    totalTickets: number;
    openTickets: number;
    inProduction: number;
    overdue: number;
    platforms?: PlatformInfo[];
    inProgress: number;
    yetToStart: number;
    onHold?: number; 
    readyToDeploy: number; 

}

export interface CrPipelineModel {
    id: number;
    ticketNo: number;
    title: string;
    assignee?: string;
    entityName?: string;
    categoryName?: string;
    priorityName?: string;
    statusName?: string;
    scheduleBuildNo?: string;
    plannedDate?: string;
    remarks?: string;
    createdDate: string;
    platformId?: number;        // ← Add this
    platformName?: string;
}

export interface ReleaseHistoryModel {
    id: number;
    ticketNo: number;
    title: string;
    assignee?: string;
    entityName?: string;
    categoryName?: string;
    platformName?: string;
    statusName?: string;
    scheduleBuildNo?: string;
    scheduleBuildDate?: string;
    plannedDate?: string;
    plannedDuration?: string;
    remarks?: string;
}

export interface AlertModel {
    alertType?: string;
    ticketId: number;
    ticketNo: number;
    title: string;
    assignee?: string;
    entityName?: string;
    priority?: string;
    daysOverdue: number;
    statusName?: string;
}

export interface TicketFilterRequest {
    entityId?: number | null;
    statusId?: number | null;
    typeId?: number | null;
    priorityId?: number | null;
    fromDate?: string | null;
    toDate?: string | null;
}

// Platform related interfaces (defined only once)
export interface PlatformModel {
    id: number;
    allIds?: number[]; 
    fieldType: string;
    fieldName: string;
    fieldValues: string;
    entityIds: number[];
    isMandatory: string;
    isActive: string;
}

export interface PlatformInfo {
    id: number;
    name: string;
    allIds?: number[];
}
export interface ReleaseNote {
    id?: number;
    ticketId: number;
    entityId: number;
    platformId: number;
    buildNo: string;
    releaseNoteText: string;
    createdAt?: Date;
    updatedAt?: Date;
}
export interface Risk {
    id?: number;
    title: string;
    description: string;
    severity: string;
    status: string;        // 'Open', 'Closed', etc.
    assignedTo?: string;
    dueDate?: string;
    mitigationPlan?: string;
    isDraft?: boolean;     // New field for draft status
    isActive?: boolean;    // For soft delete
    submittedAt?: string;
    submittedBy?: string;
    createdBy?: string;
    updatedBy?: string;
    createdAt?: string;
    updatedAt?: string;
    category?: string;     // 'key_risks' or 'ceo_attention'
    displayOrder?: number;
}

// Also add these request models if needed
export interface CreateKeyRiskRequest {
    title: string;
    description?: string;
    severity: string;
    status: string;
    assignedTo?: string;
    dueDate?: string;
    mitigationPlan?: string;
    entityId?: number;
    isDraft?: boolean;
}

export interface KeyRiskModel {
    id: number;
    title: string;
    description: string;
    severity: string;
    status: string;
    assignedTo?: string;
    dueDate?: string;
    mitigationPlan?: string;
    entityId?: number;
    category?: string;
    createdDate?: string;
    updatedDate?: string;
    isActive?: boolean;
    isDraft?: boolean;
}
export interface UpdateKeyRiskRequest {
    title: string;
    description?: string;
    severity: string;
    status: string;
    assignedTo?: string;
    dueDate?: string;
    mitigationPlan?: string;
    isDraft?: boolean;
}
export interface CategoryModel {
    id: number;
    entityIds?: string;
    categoryName: string;
    categoryDescription?: string;
    isActive?: string;
    departmentId?: number;
    departmentName?: string;
    createdDate?: string;
}
export interface StatusModel {
    id: number;
    entityIds?: string;
    Status: string;
    Statusid: number;
    createdDate?: string;
    UpdatedDate?: String;
}