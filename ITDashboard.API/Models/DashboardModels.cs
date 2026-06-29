using System.Text.Json.Serialization;

namespace ITDashboard.API.Models;

// ─── Entity (Organisation/Client) ───────────────────────────
public class EntityModel
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? Logo { get; set; }
    public string? ContactEmail { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedDate { get; set; }
}

// ─── Master Configuration (dropdowns) ───────────────────────
public class MasterConfigModel
{
    public int Id { get; set; }
    public string FieldType { get; set; } = string.Empty;
    public string FieldName { get; set; } = string.Empty;
    public string? FieldValues { get; set; }
    public string? EntityIds { get; set; }
    public string? IsMandatory { get; set; }
    public string? IsActive { get; set; }
}

// ─── Category ────────────────────────────────────────────────
public class CategoryModel
{
    public int Id { get; set; }
    public string? EntityIds { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public string? CategoryDescription { get; set; }
    public string? IsActive { get; set; }
    public int? DepartmentId { get; set; }
    public string? DepartmentName { get; set; }
    public DateTime? CreatedDate { get; set; }
}

// ─── Subcategory ─────────────────────────────────────────────
public class SubcategoryModel
{
    public int Id { get; set; }
    public string? EntityIds { get; set; }
    public string SubcategoryName { get; set; } = string.Empty;
    public string? SubcategoryDescription { get; set; }
    public string? IsActive { get; set; }
    public int CategoryId { get; set; }
    public string? CategoryName { get; set; }
    public DateTime? CreatedDate { get; set; }
}

// ─── Ticket ──────────────────────────────────────────────────
public class TicketModel
{
    public bool? IsActive { get; set; } = true;
    public string? ReleaseNote { get; set; }
    public string? TypeName { get; set; }
    public string? DepartmentName { get; set; }
    public string? StatusName { get; set; }
    public string? ScheduleBuildNo { get; set; }
    public DateTime? ScheduleBuildDate { get; set; }
    public DateTime? PlannedDate { get; set; }

    public long TotalTickets { get; set; }
    public long FunctionalCount { get; set; }
    public long TechnicalCount { get; set; }
    public long TestingCount { get; set; }
    public long DeploymentCount { get; set; }
    public long InProduction { get; set; }

    public int Id { get; set; }
    public int TicketNo { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Assignee { get; set; }
    public int? EntityId { get; set; }
    public string? EntityName { get; set; }
    public int? CategoryId { get; set; }
    public string? CategoryName { get; set; }
    public int? DepartmentId { get; set; }
    public int? PlatformId { get; set; }
    public string? PlatformName { get; set; }
    public int? PriorityId { get; set; }
    public string? PriorityName { get; set; }
    public int? StatusId { get; set; }
    public int? TypeId { get; set; }
    public string? Remarks { get; set; }
    public DateTime CreatedDate { get; set; }
    public DateTime? UpdatedDate { get; set; }

    public string? assigned_users { get; set; }

    // Or keep both
    [JsonIgnore]
    public List<int>? AssignedUsers { get; set; }
}

// ─── Dashboard KPI ───────────────────────────────────────────
public class DashboardKpiModel
{
    public long TotalTickets { get; set; }
    public long YetToStart { get; set; }
    public long OpenTickets { get; set; }
    public long InProgress { get; set; }
    public long ClosedTickets { get; set; }
    public long OverdueTickets { get; set; }
    public long TotalCr { get; set; }
    public long TotalIncidents { get; set; }
}

//// ─── Portfolio Summary ───────────────────────────────────────
//public class PortfolioSummaryModel
//{
//    public int? EntityId { get; set; }
//    public string? EntityName { get; set; }
//    public int? CategoryId { get; set; }
//    public string? CategoryName { get; set; }
//    public long TotalTickets { get; set; }
//    public long OpenTickets { get; set; }
//    public long InProduction { get; set; }
//    public long Overdue { get; set; }
//}

// ─── CR Pipeline ─────────────────────────────────────────────
public class CrPipelineModel
{
    public int Id { get; set; }
    public int TicketNo { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Assignee { get; set; }
    public string? EntityName { get; set; }
    public string? CategoryName { get; set; }
    public string? PriorityName { get; set; }
    public string? StatusName { get; set; }
    public string? ScheduleBuildNo { get; set; }
    public DateTime? PlannedDate { get; set; }
    public string? Remarks { get; set; }
    public DateTime CreatedDate { get; set; }
}

// ─── Release History ─────────────────────────────────────────
public class ReleaseHistoryModel
{
    public int Id { get; set; }
    public int TicketNo { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Assignee { get; set; }
    public string? EntityName { get; set; }
    public string? CategoryName { get; set; }
    public string? PlatformName { get; set; }
    public string? StatusName { get; set; }
    public string? ScheduleBuildNo { get; set; }
    public DateTime? ScheduleBuildDate { get; set; }
    public DateTime? PlannedDate { get; set; }
    public string? PlannedDuration { get; set; }
    public string? Remarks { get; set; }
}

// ─── Alert ───────────────────────────────────────────────────
public class AlertModel
{
    public string? AlertType { get; set; }
    public int TicketId { get; set; }
    public int TicketNo { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Assignee { get; set; }
    public string? EntityName { get; set; }
    public string? Priority { get; set; }
    public int DaysOverdue { get; set; }
    public string? StatusName { get; set; }
}

public class ReleaseDetailModel
{
    public string? ReleaseNo { get; set; }
    public DateTime? PlannedDate { get; set; }
    public DateTime? ActualReleaseDate { get; set; }
    public string? Status { get; set; }
}


// ─── Filter Request DTOs ──────────────────────────────────────
public class TicketFilterRequest
{
    public int? EntityId { get; set; }
    public int? StatusId { get; set; }
    public int? TypeId { get; set; }
    public int? PriorityId { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
}
// ITDashboard.API/Models/DashboardModels.cs

// Add this new model
public class PlatformModel
{
    public int Id { get; set; }
    public string FieldType { get; set; } = string.Empty;
    public string FieldName { get; set; } = string.Empty;
    public string? FieldValues { get; set; }
    public List<int> EntityIds { get; set; } = new List<int>();
    public string? IsMandatory { get; set; }
    public string? IsActive { get; set; }
}

// Update PortfolioSummaryModel to include platforms
public class PortfolioSummaryModel
{
    public int? EntityId { get; set; }
    public string? EntityName { get; set; }
    public int? CategoryId { get; set; }
    public string? CategoryName { get; set; }
    public long TotalTickets { get; set; }
    public long OpenTickets { get; set; }
    public long InProgress { get; set; }
    public long InProduction { get; set; }
    public long Overdue { get; set; }
    public List<PlatformInfo>? Platforms { get; set; }  // Add this
}

// Add this helper model
public class PlatformInfo
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
}
// Key Risks Model
public class KeyRiskModel
{
    public string? Category { get; set; }
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Severity { get; set; } = "Medium";
    public string Status { get; set; } = "Open";
    public string? AssignedTo { get; set; }
    public DateTime? DueDate { get; set; }
    public string? MitigationPlan { get; set; }
    public int? EntityId { get; set; }
    public DateTime CreatedDate { get; set; }
    public DateTime UpdatedDate { get; set; }
    public bool IsActive { get; set; }
}

// Create/Update Request Models
public class CreateKeyRiskRequest
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Severity { get; set; } = "Medium";
    public string Status { get; set; } = "Open";
    public string? AssignedTo { get; set; }
    public DateTime? DueDate { get; set; }
    public string? MitigationPlan { get; set; }
    public int? EntityId { get; set; }
    public string? Category { get; set; }
}

public class UpdateKeyRiskRequest
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Severity { get; set; } = "Medium";
    public string Status { get; set; } = "Open";
    public string? AssignedTo { get; set; }
    public DateTime? DueDate { get; set; }
    public string? MitigationPlan { get; set; }
    public string? Category { get; set; }
}

public class UserModel
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Realname { get; set; }
    public string? Email { get; set; }
}
public class BuildDocumentModel
{
    public int Id { get; set; }
    public string BuildNo { get; set; } = "";
    public int? PlatformId { get; set; }
    public int? EntityId { get; set; }
    public string FileName { get; set; } = "";
    public string FilePath { get; set; } = "";
    public long? FileSize { get; set; }
    public string? UploadedBy { get; set; }
    public DateTime? UploadedDate { get; set; }
}
// Models/CreateTicketRequest.cs
public class CreateTicketRequest
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int EntityId { get; set; }
    public int PlatformId { get; set; }
    public int StatusId { get; set; }
    public int TypeId { get; set; }
    public int? PriorityId { get; set; }
    public int? DepartmentId { get; set; }
    public int? CategoryId { get; set; }
    public DateTime? PlannedDate { get; set; }
    public DateTime? ScheduleBuildDate { get; set; }
    public string? ScheduleBuildNo { get; set; }  // null = Future, value = Current
    public int? AssignedUserId { get; set; }
}

// Models/AuditLogModel.cs
public class AuditLogModel
{
    public int Id { get; set; }
    public int TicketId { get; set; }
    public string Action { get; set; } = string.Empty;
    public string? FieldName { get; set; }
    public string? OldValue { get; set; }
    public string? NewValue { get; set; }
    public string? ChangedBy { get; set; }
    public int? ChangedById { get; set; }
    public DateTime ChangedDate { get; set; }
    public string? Remarks { get; set; }
}

