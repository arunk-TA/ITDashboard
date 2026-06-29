using Dapper;
using ITDashboard.API.Models;
using Npgsql;
using NpgsqlTypes;
using System.Data;

namespace ITDashboard.API.Repositories;

/// <summary>
/// All database access goes through stored procedures.
/// Swap out Npgsql for OracleConnection / SqlConnection
/// and change CommandType.StoredProcedure syntax to switch DB.
/// </summary>
public interface IDashboardRepository
{
    Task LogAuditAsync(int ticketId, string action, string? fieldName, string? oldValue, string? newValue, string? changedBy, int? changedById = null);
    Task<IEnumerable<AuditLogModel>> GetTicketAuditLogAsync(int ticketId);
    Task<bool> UpdateTicketStatusAsync(int ticketId, int statusId, string? changedBy = null, int? changedById = null);
    Task<bool> UpdateBuildNoAsync(int ticketId, string buildNo, string? changedBy = null, int? changedById = null);
    Task<bool> UpdatePlannedDateAsync(int ticketId, DateTime? plannedDate, string? changedBy = null, int? changedById = null);
    Task<bool> UpdateBuildDateAsync(int ticketId, DateTime? buildDate, string? changedBy = null, int? changedById = null);
    Task<bool> UpdateAssignedUserAsync(int ticketId, int userId, string? changedBy = null, int? changedById = null);
    Task<int> CreateTicketAsync(CreateTicketRequest request, string? createdBy = null, int? createdById = null);
    Task<bool> DeactivateTicketAsync(int ticketId, string reason, string? changedBy = null, int? changedById = null);
    Task<bool> ActivateTicketAsync(int ticketId, string? changedBy = null, int? changedById = null);
    Task<IEnumerable<BuildDocumentModel>> GetBuildDocumentsAsync(string buildNo, int? platformId);
    Task<int> SaveBuildDocumentAsync(BuildDocumentModel doc);
    Task<bool> DeleteBuildDocumentAsync(int id);
    Task<IEnumerable<KeyRiskModel>> GetKeyRisksAsync(int? entityId = null, string? category = null);
    Task<int> CreateKeyRiskAsync(CreateKeyRiskRequest request, string? createdBy = null);
    Task<bool> UpdateKeyRiskAsync(int id, UpdateKeyRiskRequest request, string? updatedBy = null);

    Task<IEnumerable<MasterConfigModel>> StatusList(int entityId);
    Task<IEnumerable<PlatformModel>> GetPlatformsAsync(int? entityId = null);

    Task<IEnumerable<TicketModel>> GetDepartmentSummaryAsync(int? entityId);
    Task<string?> GetReleaseNoteAsync(int ticketId);
    Task<bool> UpdateReleaseNoteAsync(int ticketId, string releaseNote);
    Task<IEnumerable<EntityModel>> GetEntitiesAsync();
    Task<IEnumerable<MasterConfigModel>> GetMasterConfigAsync(int? entityId, string? fieldType);
    Task<IEnumerable<CategoryModel>> GetCategoriesAsync(int? entityId);
    Task<IEnumerable<SubcategoryModel>> GetSubcategoriesAsync(int? categoryId, int? entityId);
    Task<IEnumerable<TicketModel>> GetTicketsAsync(TicketFilterRequest filter);
    Task<DashboardKpiModel?> GetDashboardKpiAsync(int? entityId);
    Task<IEnumerable<PortfolioSummaryModel>> GetPortfolioSummaryAsync(int? userId = null);
    Task<IEnumerable<CrPipelineModel>> GetCrPipelineAsync(int? entityId);
    Task<IEnumerable<ReleaseHistoryModel>> GetReleaseHistoryAsync(int? entityId);
    Task<IEnumerable<AlertModel>> GetAlertsAsync(int? entityId);
    Task<IEnumerable<PortfolioSummaryModel>> GetPortfolioCategoriesAsync();
    Task<IEnumerable<TicketModel>> GetCategoryReleasesAsync(int? categoryId, int? entityId);
    Task<KeyRiskModel?> GetKeyRiskByIdAsync(int id);
    Task<bool> DeleteKeyRiskAsync(int id);
    Task<IEnumerable<UserModel>> GetActiveUsersAsync();
}

public class DashboardRepository : IDashboardRepository
{
    private readonly string _connectionString;

    public DashboardRepository(IConfiguration config)
    {
        _connectionString = config.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Connection string not found.");
        Dapper.DefaultTypeMap.MatchNamesWithUnderscores = true;
    }

    private IDbConnection CreateConnection() => new NpgsqlConnection(_connectionString);

    // ─── AUDIT LOG ──────────────────────────────────────────────
    public async Task LogAuditAsync(int ticketId, string action, string? fieldName,
        string? oldValue, string? newValue, string? changedBy, int? changedById = null)
    {
        using var conn = CreateConnection();
        await conn.ExecuteAsync(@"
        SELECT sp_insert_audit_log(
            @p_ticket_id, @p_action, @p_field_name,
            @p_old_value, @p_new_value,
            @p_changed_by, @p_changed_by_id, NULL
        )",
            new
            {
                p_ticket_id = ticketId,
                p_action = action,
                p_field_name = fieldName,
                p_old_value = oldValue,
                p_new_value = newValue,
                p_changed_by = changedBy ?? "System",
                p_changed_by_id = changedById
            });
    }

    public async Task<IEnumerable<AuditLogModel>> GetTicketAuditLogAsync(int ticketId)
    {
        using var conn = CreateConnection();
        return await conn.QueryAsync<AuditLogModel>(@"
        SELECT * FROM public.ticket_audit_log
        WHERE ticket_id = @TicketId
        ORDER BY changed_date DESC",
            new { TicketId = ticketId });
    }

    // ─── CREATE TICKET ──────────────────────────────────────────
    // ─── CREATE TICKET ──────────────────────────────────────────
    public async Task<int> CreateTicketAsync(CreateTicketRequest request, string? createdBy = null, int? createdById = null)
    {
        using var conn = CreateConnection();

        var assignedUsers = request.AssignedUserId.HasValue
            ? $"[{request.AssignedUserId.Value}]"
            : "[]";

        try
        {
            var parameters = new
            {
                p_title = request.Title,
                p_description = request.Description ?? "",
                p_entity_id = request.EntityId,
                p_platform_id = request.PlatformId,
                p_status_id = request.StatusId,
                p_type_id = request.TypeId,
                p_priority_id = request.PriorityId,
                p_department_id = request.DepartmentId,
                p_category_id = request.CategoryId,
                p_planned_date = request.PlannedDate,
                p_schedule_build_date = request.ScheduleBuildDate,
                p_schedule_build_no = request.ScheduleBuildNo,
                p_assigned_users = assignedUsers,
                p_created_by = createdBy ?? "System",
                p_created_by_id = createdById
            };

            Console.WriteLine($"📝 CreateTicket - Title: {request.Title}, UserId: {createdById}");
            Console.WriteLine($"📝 PlannedDate: {request.PlannedDate}, ScheduleBuildDate: {request.ScheduleBuildDate}");
            Console.WriteLine($"📝 AssignedUsers: {assignedUsers}");

            var result = await conn.ExecuteScalarAsync<int>(
                "SELECT sp_create_ticket(@p_title, @p_description, @p_entity_id, @p_platform_id, @p_status_id, @p_type_id, @p_priority_id, @p_department_id, @p_category_id, @p_planned_date, @p_schedule_build_date, @p_schedule_build_no, @p_assigned_users::jsonb, @p_created_by, @p_created_by_id)",
                parameters
            );

            return result;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ CreateTicketAsync error: {ex.Message}");
            Console.WriteLine($"❌ Inner: {ex.InnerException?.Message}");
            throw;
        }
    }
    // ─── UPDATE PLANNED DATE ────────────────────────────────────
    public async Task<bool> UpdatePlannedDateAsync(int ticketId, DateTime? plannedDate, string? changedBy = null, int? changedById = null)
    {
        using var conn = CreateConnection();

        // Get old value for audit
        var oldVal = await conn.QueryFirstOrDefaultAsync<DateTime?>(
            "SELECT planned_date FROM public.tickets_createtickets WHERE id = @TicketId",
            new { TicketId = ticketId });

        var rows = await conn.ExecuteAsync(@"
            UPDATE public.tickets_createtickets 
            SET planned_date = @PlannedDate, updated_date = CURRENT_TIMESTAMP
            WHERE id = @TicketId",
            new { TicketId = ticketId, PlannedDate = plannedDate });

        if (rows > 0)
        {
            await LogAuditAsync(ticketId, "PLANNED_DATE_CHANGED", "planned_date",
                oldVal?.ToString("yyyy-MM-dd"), plannedDate?.ToString("yyyy-MM-dd"),
                changedBy ?? "System", changedById);
        }

        return rows > 0;
    }

    // ─── UPDATE BUILD DATE ──────────────────────────────────────
    public async Task<bool> UpdateBuildDateAsync(int ticketId, DateTime? buildDate, string? changedBy = null, int? changedById = null)
    {
        using var conn = CreateConnection();

        // Get old value for audit
        var oldVal = await conn.QueryFirstOrDefaultAsync<DateTime?>(
            "SELECT schedule_build_date FROM public.tickets_createtickets WHERE id = @TicketId",
            new { TicketId = ticketId });

        var rows = await conn.ExecuteAsync(@"
            UPDATE public.tickets_createtickets 
            SET schedule_build_date = @BuildDate, updated_date = CURRENT_TIMESTAMP
            WHERE id = @TicketId",
            new { TicketId = ticketId, BuildDate = buildDate });

        if (rows > 0)
        {
            await LogAuditAsync(ticketId, "BUILD_DATE_CHANGED", "schedule_build_date",
                oldVal?.ToString("yyyy-MM-dd"), buildDate?.ToString("yyyy-MM-dd"),
                changedBy ?? "System", changedById);
        }

        return rows > 0;
    }

    // ─── UPDATE ASSIGNED USER ──────────────────────────────────
    public async Task<bool> UpdateAssignedUserAsync(int ticketId, int userId, string? changedBy = null, int? changedById = null)
    {
        using var conn = CreateConnection();

        // Get old value for audit
        var oldVal = await conn.QueryFirstOrDefaultAsync<string>(
            "SELECT assigned_users FROM public.tickets_createtickets WHERE id = @TicketId",
            new { TicketId = ticketId });

        // Get user name for new value
        var newUserName = await conn.QueryFirstOrDefaultAsync<string>(
            "SELECT realname FROM public.users WHERE id = @UserId",
            new { UserId = userId });

        var rows = await conn.ExecuteAsync(@"
            UPDATE public.tickets_createtickets 
            SET assigned_users = jsonb_build_array(@UserId), updated_date = CURRENT_TIMESTAMP
            WHERE id = @TicketId",
            new { TicketId = ticketId, UserId = userId });

        if (rows > 0)
        {
            await LogAuditAsync(ticketId, "ASSIGNED_USER_CHANGED", "assigned_users",
                oldVal, newUserName ?? userId.ToString(), changedBy ?? "System", changedById);
        }

        return rows > 0;
    }

    // ─── UPDATE TICKET STATUS ──────────────────────────────────
    public async Task<bool> UpdateTicketStatusAsync(int ticketId, int statusId, string? changedBy = null, int? changedById = null)
    {
        using var conn = CreateConnection();

        var oldStatus = await conn.QueryFirstOrDefaultAsync<string>(@"
            SELECT mc.field_name 
            FROM public.tickets_createtickets t
            JOIN public.tickets_master_configuration mc ON mc.id = t.status_id AND mc.field_type = 'Status'
            WHERE t.id = @TicketId",
            new { TicketId = ticketId });

        var newStatus = await conn.QueryFirstOrDefaultAsync<string>(@"
            SELECT field_name FROM public.tickets_master_configuration 
            WHERE id = @StatusId",
            new { StatusId = statusId });

        var rows = await conn.ExecuteAsync(@"
            UPDATE public.tickets_createtickets 
            SET status_id = @StatusId, updated_date = CURRENT_TIMESTAMP
            WHERE id = @TicketId",
            new { TicketId = ticketId, StatusId = statusId });

        if (rows > 0)
        {
            await LogAuditAsync(ticketId, "STATUS_CHANGED", "status",
                oldStatus, newStatus, changedBy ?? "System", changedById);
        }

        return rows > 0;
    }

    // ─── UPDATE BUILD NO ────────────────────────────────────────
    public async Task<bool> UpdateBuildNoAsync(int ticketId, string buildNo, string? changedBy = null, int? changedById = null)
    {
        using var conn = CreateConnection();

        var oldVal = await conn.QueryFirstOrDefaultAsync<string>(
            "SELECT schedule_build_no FROM public.tickets_createtickets WHERE id = @TicketId",
            new { TicketId = ticketId });

        var rows = await conn.ExecuteAsync(@"
            UPDATE public.tickets_createtickets 
            SET schedule_build_no = NULLIF(@BuildNo, ''), updated_date = CURRENT_TIMESTAMP
            WHERE id = @TicketId",
            new { TicketId = ticketId, BuildNo = buildNo });

        if (rows > 0)
        {
            await LogAuditAsync(ticketId, "BUILD_NO_CHANGED", "schedule_build_no",
                oldVal, buildNo, changedBy ?? "System", changedById);
        }

        return rows > 0;
    }

    // ─── DEACTIVATE TICKET ─────────────────────────────────────
    public async Task<bool> DeactivateTicketAsync(int ticketId, string reason, string? changedBy = null, int? changedById = null)
    {
        using var conn = CreateConnection();

        var rows = await conn.ExecuteAsync(@"
            UPDATE public.tickets_createtickets 
            SET is_active = FALSE,
                remarks = COALESCE(remarks, '') || '\n[DEACTIVATED: ' || @Reason || ' on ' || CURRENT_TIMESTAMP || ']',
                updated_date = CURRENT_TIMESTAMP
            WHERE id = @TicketId",
            new { TicketId = ticketId, Reason = reason });

        if (rows > 0)
        {
            await LogAuditAsync(ticketId, "DEACTIVATED", "is_active",
                "true", "false", changedBy ?? "System", changedById);
        }

        return rows > 0;
    }

    // ─── ACTIVATE TICKET ──────────────────────────────────────
    public async Task<bool> ActivateTicketAsync(int ticketId, string? changedBy = null, int? changedById = null)
    {
        using var conn = CreateConnection();

        var rows = await conn.ExecuteAsync(@"
            UPDATE public.tickets_createtickets 
            SET is_active = TRUE, updated_date = CURRENT_TIMESTAMP
            WHERE id = @TicketId",
            new { TicketId = ticketId });

        if (rows > 0)
        {
            await LogAuditAsync(ticketId, "ACTIVATED", "is_active",
                "false", "true", changedBy ?? "System", changedById);
        }

        return rows > 0;
    }

    // ─── GET ACTIVE USERS ──────────────────────────────────────
    public async Task<IEnumerable<UserModel>> GetActiveUsersAsync()
    {
        using var conn = CreateConnection();
        var sql = @"
            SELECT id, name, realname, email
            FROM public.users
            WHERE is_active = true
            ORDER BY name";

        return await conn.QueryAsync<UserModel>(sql);
    }

    // ─── GET DEPARTMENT SUMMARY ───────────────────────────────
    public async Task<IEnumerable<TicketModel>> GetDepartmentSummaryAsync(int? entityId)
    {
        using var conn = CreateConnection();
        var result = await conn.QueryAsync<TicketModel>(
            "SELECT * FROM sp_get_department_summary(@p_entity_id)",
            new { p_entity_id = entityId }
        );
        return result;
    }

    // ─── ENTITIES ──────────────────────────────────────────────
    public async Task<IEnumerable<EntityModel>> GetEntitiesAsync()
    {
        using var conn = CreateConnection();
        return await conn.QueryAsync<EntityModel>("SELECT * FROM sp_get_entities()");
    }

    // ─── MASTER CONFIG ─────────────────────────────────────────
    public async Task<IEnumerable<MasterConfigModel>> GetMasterConfigAsync(int? entityId, string? fieldType)
    {
        using var conn = CreateConnection();
        return await conn.QueryAsync<MasterConfigModel>(
            "SELECT * FROM sp_get_master_config(@p_entity_id, @p_field_type)",
            new { p_entity_id = entityId, p_field_type = fieldType }
        );
    }

    public async Task<IEnumerable<MasterConfigModel>> StatusList(int entityId)
    {
        using var conn = CreateConnection();
        const string sql = @"
            SELECT * FROM public.tickets_master_configuration 
            WHERE field_type = 'Status' 
            AND is_active = 'Y'
            ORDER BY field_name";

        return await conn.QueryAsync<MasterConfigModel>(sql);
    }

    // ─── PLATFORMS ─────────────────────────────────────────────
    public async Task<IEnumerable<PlatformModel>> GetPlatformsAsync(int? entityId = null)
    {
        using var conn = CreateConnection();

        var platforms = await conn.QueryAsync<MasterConfigModel>(
            "SELECT * FROM sp_get_master_config(@p_entity_id, @p_field_type)",
            new { p_entity_id = entityId, p_field_type = "Platforms" }
        );

        var result = new List<PlatformModel>();

        foreach (var platform in platforms)
        {
            var entityIds = new List<int>();

            if (!string.IsNullOrEmpty(platform.EntityIds))
            {
                try
                {
                    var cleaned = platform.EntityIds.Trim('[', ']');
                    if (!string.IsNullOrEmpty(cleaned))
                    {
                        entityIds = cleaned.Split(',')
                            .Select(int.Parse)
                            .ToList();
                    }
                }
                catch
                {
                    entityIds = new List<int>();
                }
            }

            result.Add(new PlatformModel
            {
                Id = platform.Id,
                FieldType = platform.FieldType,
                FieldName = platform.FieldName,
                FieldValues = platform.FieldValues,
                EntityIds = entityIds,
                IsMandatory = platform.IsMandatory,
                IsActive = platform.IsActive
            });
        }

        return result;
    }

    // ─── CATEGORIES ────────────────────────────────────────────
    public async Task<IEnumerable<CategoryModel>> GetCategoriesAsync(int? entityId)
    {
        using var conn = CreateConnection();
        return await conn.QueryAsync<CategoryModel>(
            "SELECT * FROM sp_get_categories(@p_entity_id)",
            new { p_entity_id = entityId }
        );
    }

    // ─── SUBCATEGORIES ─────────────────────────────────────────
    public async Task<IEnumerable<SubcategoryModel>> GetSubcategoriesAsync(int? categoryId, int? entityId)
    {
        using var conn = CreateConnection();
        return await conn.QueryAsync<SubcategoryModel>(
            "SELECT * FROM sp_get_subcategories(@p_category_id, @p_entity_id)",
            new { p_category_id = categoryId, p_entity_id = entityId }
        );
    }

    // ─── TICKETS ────────────────────────────────────────────────
    public async Task<IEnumerable<TicketModel>> GetTicketsAsync(TicketFilterRequest filter)
    {
        using var conn = CreateConnection();

        var parameters = new DynamicParameters();
        parameters.Add("p_entity_id", filter.EntityId, DbType.Int32);
        parameters.Add("p_status_id", filter.StatusId, DbType.Int32);
        parameters.Add("p_type_id", filter.TypeId, DbType.Int32);
        parameters.Add("p_priority_id", filter.PriorityId, DbType.Int32);
        // ✅ Explicitly pass as Date not DateTime
        parameters.Add("p_from_date", filter.FromDate.HasValue
            ? DateOnly.FromDateTime(filter.FromDate.Value)
            : (DateOnly?)null, DbType.Date);
        parameters.Add("p_to_date", filter.ToDate.HasValue
            ? DateOnly.FromDateTime(filter.ToDate.Value)
            : (DateOnly?)null, DbType.Date);

        return await conn.QueryAsync<TicketModel>(
            "SELECT * FROM sp_get_tickets(@p_entity_id, @p_status_id, @p_type_id, @p_priority_id, @p_from_date, @p_to_date)",
            parameters
        );
    }
    // ─── DASHBOARD KPI ─────────────────────────────────────────
    public async Task<DashboardKpiModel?> GetDashboardKpiAsync(int? entityId)
    {
        using var conn = CreateConnection();
        return await conn.QueryFirstOrDefaultAsync<DashboardKpiModel>(
            "SELECT * FROM sp_get_dashboard_kpi(@p_entity_id)",
            new { p_entity_id = entityId }
        );
    }

    // ─── PORTFOLIO ─────────────────────────────────────────────
    public async Task<IEnumerable<PortfolioSummaryModel>> GetPortfolioSummaryAsync(int? userId = null)
    {
        using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync();

        // ✅ Use DynamicParameters with explicit DbType instead of inline ::integer cast
        var parameters = new DynamicParameters();
        parameters.Add("p_user_id", userId, DbType.Int32);

        var summaries = await conn.QueryAsync<PortfolioSummaryModel>(
            "SELECT * FROM sp_get_entity_summary(@p_user_id)",
            parameters
        );

        var allPlatforms = await GetPlatformsAsync();
        var summaryList = summaries.ToList();
        foreach (var summary in summaryList)
        {
            summary.Platforms = allPlatforms
                .Where(p => p.EntityIds.Contains(summary.EntityId ?? 0))
                .Select(p => new PlatformInfo { Id = p.Id, Name = p.FieldName })
                .ToList();
        }

        return summaryList;
    }
    public async Task<IEnumerable<PortfolioSummaryModel>> GetPortfolioCategoriesAsync()
    {
        using var conn = CreateConnection();
        return await conn.QueryAsync<PortfolioSummaryModel>(
            @"SELECT 
                entity_id AS EntityId,
                entity_name AS EntityName,
                category_id AS CategoryId,
                category_name AS CategoryName,
                total_tickets AS TotalTickets,
                open_tickets AS OpenTickets,
                in_production AS InProduction,
                overdue AS Overdue
            FROM sp_get_portfolio_summary()"
        );
    }

    // ─── CATEGORY RELEASES ──────────────────────────────────────
    public async Task<IEnumerable<TicketModel>> GetCategoryReleasesAsync(int? categoryId, int? entityId)
    {
        using var conn = CreateConnection();
        return await conn.QueryAsync<TicketModel>(
            @"SELECT 
                t.schedule_build_no AS ScheduleBuildNo,
                t.description as description,
                t.estimation_end_date AS PlannedDate,
                t.schedule_build_date AS ScheduleBuildDate,
                sta.field_name AS StatusName,
                cat.category_name AS CategoryName
            FROM public.tickets_createtickets t
            LEFT JOIN public.tickets_master_configuration sta ON sta.id = t.status_id AND sta.field_type = 'Status'
            LEFT JOIN public.tickets_category cat ON cat.id = t.category_id
            WHERE t.category_id = @categoryId 
            AND t.entity_id = @entityId
            AND t.schedule_build_no IS NOT NULL
            ORDER BY t.schedule_build_no DESC",
            new { categoryId, entityId }
        );
    }

    // ─── CR PIPELINE ────────────────────────────────────────────
    public async Task<IEnumerable<CrPipelineModel>> GetCrPipelineAsync(int? entityId)
    {
        using var conn = CreateConnection();
        return await conn.QueryAsync<CrPipelineModel>(
            "SELECT * FROM sp_get_cr_pipeline(@p_entity_id)",
            new { p_entity_id = entityId }
        );
    }

    // ─── RELEASE HISTORY ───────────────────────────────────────
    public async Task<IEnumerable<ReleaseHistoryModel>> GetReleaseHistoryAsync(int? entityId)
    {
        using var conn = CreateConnection();
        return await conn.QueryAsync<ReleaseHistoryModel>(
            "SELECT * FROM sp_get_release_history(@p_entity_id)",
            new { p_entity_id = entityId }
        );
    }

    // ─── ALERTS ─────────────────────────────────────────────────
    public async Task<IEnumerable<AlertModel>> GetAlertsAsync(int? entityId)
    {
        using var conn = CreateConnection();
        return await conn.QueryAsync<AlertModel>(
            "SELECT * FROM sp_get_alerts(@p_entity_id)",
            new { p_entity_id = entityId }
        );
    }

    // ─── RELEASE NOTES ─────────────────────────────────────────
    public async Task<string?> GetReleaseNoteAsync(int ticketId)
    {
        using var conn = CreateConnection();
        const string sql = @"
            SELECT release_note 
            FROM public.tickets_createtickets 
            WHERE id = @TicketId";

        return await conn.QueryFirstOrDefaultAsync<string?>(sql, new { TicketId = ticketId });
    }

    public async Task<bool> UpdateReleaseNoteAsync(int ticketId, string releaseNote)
    {
        using var conn = CreateConnection();
        const string sql = @"
            UPDATE public.tickets_createtickets 
            SET release_note = @ReleaseNote,
                updated_date = CURRENT_TIMESTAMP
            WHERE id = @TicketId";

        var rowsAffected = await conn.ExecuteAsync(sql, new
        {
            TicketId = ticketId,
            ReleaseNote = releaseNote
        });

        return rowsAffected > 0;
    }

    // ─── BUILD DOCUMENTS ────────────────────────────────────────
    public async Task<IEnumerable<BuildDocumentModel>> GetBuildDocumentsAsync(string buildNo, int? platformId)
    {
        using var conn = CreateConnection();
        return await conn.QueryAsync<BuildDocumentModel>(@"
            SELECT id, build_no, platform_id, entity_id, file_name, file_path, 
                   file_size, uploaded_by, uploaded_date
            FROM public.build_documents
            WHERE build_no = @BuildNo 
              AND (@PlatformId IS NULL OR platform_id = @PlatformId)
              AND is_active = TRUE
            ORDER BY uploaded_date DESC",
            new { BuildNo = buildNo, PlatformId = platformId });
    }

    public async Task<int> SaveBuildDocumentAsync(BuildDocumentModel doc)
    {
        using var conn = CreateConnection();
        return await conn.ExecuteScalarAsync<int>(@"
            INSERT INTO public.build_documents 
                (build_no, platform_id, entity_id, file_name, file_path, file_size, uploaded_by)
            VALUES 
                (@BuildNo, @PlatformId, @EntityId, @FileName, @FilePath, @FileSize, @UploadedBy)
            RETURNING id",
            doc);
    }

    public async Task<bool> DeleteBuildDocumentAsync(int id)
    {
        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(
            "UPDATE public.build_documents SET is_active = FALSE WHERE id = @Id",
            new { Id = id });
        return rows > 0;
    }

    // ─── KEY RISKS ──────────────────────────────────────────────
    public async Task<IEnumerable<KeyRiskModel>> GetKeyRisksAsync(int? entityId = null, string? category = null)
    {
        using var conn = CreateConnection();
        var sql = @"
            SELECT 
                id, 
                title, 
                description,
                severity, 
                status, 
                assigned_to as AssignedTo, 
                due_date as DueDate, 
                mitigation_plan as MitigationPlan, 
                entity_id as EntityId,
                category,
                created_date as CreatedDate, 
                updated_date as UpdatedDate,
                is_active as IsActive
            FROM public.key_risks
            WHERE is_active = TRUE
            AND (@EntityId IS NULL OR entity_id = @EntityId)
            AND (@Category IS NULL OR category = @Category)";

        return await conn.QueryAsync<KeyRiskModel>(sql, new
        {
            EntityId = entityId,
            Category = category
        });
    }

    public async Task<KeyRiskModel?> GetKeyRiskByIdAsync(int id)
    {
        using var conn = CreateConnection();
        return await conn.QueryFirstOrDefaultAsync<KeyRiskModel>(
            "SELECT * FROM sp_get_key_risk_by_id(@p_id)",
            new { p_id = id }
        );
    }

    public async Task<int> CreateKeyRiskAsync(CreateKeyRiskRequest request, string? createdBy = null)
    {
        using var conn = CreateConnection();
        try
        {
            var sql = @"
                INSERT INTO public.key_risks (
                    title, description, severity, status, assigned_to, 
                    due_date, mitigation_plan, entity_id, category,
                    created_date, updated_date, created_by, updated_by, is_active
                ) VALUES (
                    @Title, @Description, @Severity, @Status, @AssignedTo,
                    @DueDate, @MitigationPlan, @EntityId, @Category,
                    NOW(), NOW(), @CreatedBy, @CreatedBy, true
                )
                RETURNING id";

            var id = await conn.ExecuteScalarAsync<int>(sql, new
            {
                Title = request.Title ?? string.Empty,
                Description = request.Description ?? string.Empty,
                Severity = request.Severity ?? "Medium",
                Status = request.Status ?? "Open",
                AssignedTo = request.AssignedTo ?? string.Empty,
                DueDate = request.DueDate,
                MitigationPlan = request.MitigationPlan ?? string.Empty,
                EntityId = request.EntityId ?? 1,
                Category = request.Category ?? "key_risks",
                CreatedBy = createdBy ?? "System"
            });

            return id;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error creating risk: {ex.Message}");
            return 0;
        }
    }

    public async Task<bool> UpdateKeyRiskAsync(int id, UpdateKeyRiskRequest request, string? updatedBy = null)
    {
        using var conn = CreateConnection();
        try
        {
            var sql = @"
                UPDATE public.key_risks
                SET 
                    title = @Title,
                    description = @Description,
                    severity = @Severity,
                    status = @Status,
                    assigned_to = @AssignedTo,
                    due_date = @DueDate,
                    mitigation_plan = @MitigationPlan,
                    category = @Category,
                    updated_date = NOW(),
                    updated_by = @UpdatedBy
                WHERE id = @Id";

            var result = await conn.ExecuteAsync(sql, new
            {
                Id = id,
                Title = request.Title,
                Description = request.Description ?? "",
                Severity = request.Severity,
                Status = request.Status,
                AssignedTo = request.AssignedTo ?? "",
                DueDate = request.DueDate,
                MitigationPlan = request.MitigationPlan ?? "",
                Category = request.Category ?? "key_risks",
                UpdatedBy = updatedBy ?? "System"
            });

            return result > 0;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error updating risk: {ex.Message}");
            return false;
        }
    }

    public async Task<bool> DeleteKeyRiskAsync(int id)
    {
        using var conn = CreateConnection();
        try
        {
            var sql = @"
                UPDATE public.key_risks
                SET is_active = FALSE, updated_date = NOW()
                WHERE id = @Id";

            var rowsAffected = await conn.ExecuteAsync(sql, new { Id = id });
            return rowsAffected > 0;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error deleting risk: {ex.Message}");
            return false;
        }
    }
}