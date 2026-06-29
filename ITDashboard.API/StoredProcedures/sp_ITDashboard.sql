-- ============================================================
-- IT Dashboard - Stored Procedures
-- Database: PostgreSQL
-- Description: All queries are wrapped in stored procedures
--              so switching to Oracle/SQL Server is easy.
-- ============================================================

-- ─── 1. GET ENTITIES (Organisations/Clients) ────────────────
CREATE OR REPLACE FUNCTION sp_get_entities()
RETURNS TABLE (
    id          INTEGER,
    name        TEXT,
    description TEXT,
    display_name TEXT,
    address     TEXT,
    logo        TEXT,
    contact_email TEXT,
    is_active   BOOLEAN,
    created_date TIMESTAMPTZ
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.id, e.name, e.description, e.display_name,
        e.address, e.logo, e.contact_email,
        e.is_active, e.created_date
    FROM public.tickets_entity e
    WHERE e.is_active = true
    ORDER BY e.id;
END;
$$;

-- ─── 2. GET MASTER CONFIGURATION (dropdowns: Status, Priority, Dept, etc.) ─
CREATE OR REPLACE FUNCTION sp_get_master_config(
    p_entity_id     INTEGER DEFAULT NULL,
    p_field_type    TEXT    DEFAULT NULL
)
RETURNS TABLE (
    id          INTEGER,
    field_type  TEXT,
    field_name  TEXT,
    field_values TEXT,
    entity_ids  JSONB,
    is_mandatory TEXT,
    is_active   TEXT
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        mc.id,
        mc.field_type,
        mc.field_name,
        mc.field_values,
        mc.entity_ids,
        mc.is_mandatory,
        mc.is_active
    FROM public.tickets_master_configuration mc
    WHERE mc.is_active = 'Y'
      AND (p_entity_id IS NULL OR mc.entity_ids @> to_jsonb(p_entity_id))
      AND (p_field_type IS NULL OR mc.field_type = p_field_type)
    ORDER BY mc.id;
END;
$$;

-- ─── 3. GET CATEGORIES ──────────────────────────────────────
CREATE OR REPLACE FUNCTION sp_get_categories(
    p_entity_id INTEGER DEFAULT NULL
)
RETURNS TABLE (
    id                   INTEGER,
    entity_ids           JSONB,
    category_name        TEXT,
    category_description TEXT,
    is_active            TEXT,
    department_id        INTEGER,
    department_name      TEXT,
    created_date         TIMESTAMPTZ
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.entity_ids,
        c.category_name,
        c.category_description,
        c.is_active,
        c.department_id,
        mc.field_name AS department_name,
        c.created_date
    FROM public.tickets_category c
    LEFT JOIN public.tickets_master_configuration mc
           ON mc.id = c.department_id AND mc.field_type = 'Department'
    WHERE c.is_active = 'Y'
      AND (p_entity_id IS NULL OR c.entity_ids @> to_jsonb(p_entity_id))
    ORDER BY c.id;
END;
$$;

-- ─── 4. GET SUBCATEGORIES ───────────────────────────────────
CREATE OR REPLACE FUNCTION sp_get_subcategories(
    p_category_id INTEGER DEFAULT NULL,
    p_entity_id   INTEGER DEFAULT NULL
)
RETURNS TABLE (
    id                      INTEGER,
    entity_ids              JSONB,
    subcategory_name        TEXT,
    subcategory_description TEXT,
    is_active               TEXT,
    category_id             INTEGER,
    category_name           TEXT,
    created_date            TIMESTAMPTZ
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        sc.id,
        sc.entity_ids,
        sc.subcategory_name,
        sc.subcategory_description,
        sc.is_active,
        sc.category_id,
        cat.category_name,
        sc.created_date
    FROM public.tickets_subcategory sc
    INNER JOIN public.tickets_category cat ON cat.id = sc.category_id
    WHERE sc.is_active = 'Y'
      AND (p_category_id IS NULL OR sc.category_id = p_category_id)
      AND (p_entity_id   IS NULL OR sc.entity_ids  @> to_jsonb(p_entity_id))
    ORDER BY sc.id;
END;
$$;

-- ─── 5. GET ALL TICKETS (with joins) ────────────────────────
CREATE OR REPLACE FUNCTION sp_get_tickets(
    p_entity_id   INTEGER DEFAULT NULL,
    p_status_id   INTEGER DEFAULT NULL,
    p_type_id     INTEGER DEFAULT NULL,
    p_priority_id INTEGER DEFAULT NULL,
    p_from_date   DATE    DEFAULT NULL,
    p_to_date     DATE    DEFAULT NULL
)
RETURNS TABLE (
    id                  INTEGER,
    ticket_no           INTEGER,
    title               TEXT,
    description         TEXT,
    assignee            TEXT,
    entity_id           INTEGER,
    entity_name         TEXT,
    category_id         INTEGER,
    category_name       TEXT,
    department_id       INTEGER,
    department_name     TEXT,
    platform_id         INTEGER,
    platform_name       TEXT,
    priority_id         INTEGER,
    priority_name       TEXT,
    status_id           INTEGER,
    status_name         TEXT,
    type_id             INTEGER,
    type_name           TEXT,
    schedule_build_no   TEXT,
    planned_date        DATE,
    schedule_build_date DATE,
    remarks             TEXT,
    created_date        TIMESTAMPTZ,
    updated_date        TIMESTAMPTZ
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.id,
        t.ticket_no,
        t.title,
        t.description,
        t.assignee,
        t.entity_id,
        ent.name              AS entity_name,
        t.category_id,
        cat.category_name,
        t.department_id,
        dept.field_name       AS department_name,
        t.platform_id,
        plat.field_name       AS platform_name,
        t.priority_id,
        pri.field_name        AS priority_name,
        t.status_id,
        sta.field_name        AS status_name,
        t.type_id,
        typ.field_name        AS type_name,
        t.schedule_build_no,
        t.planned_date,
        t.schedule_build_date,
        t.remarks,
        t.created_date,
        t.updated_date
    FROM public.tickets_createtickets t
    LEFT JOIN public.tickets_entity                e_ent
           ON e_ent.id = t.entity_id
    LEFT JOIN public.tickets_entity                ent
           ON ent.id = t.entity_id
    LEFT JOIN public.tickets_category              cat
           ON cat.id = t.category_id
    LEFT JOIN public.tickets_master_configuration  dept
           ON dept.id = t.department_id AND dept.field_type = 'Department'
    LEFT JOIN public.tickets_master_configuration  plat
           ON plat.id = t.platform_id  AND plat.field_type = 'Platforms'
    LEFT JOIN public.tickets_master_configuration  pri
           ON pri.id  = t.priority_id  AND pri.field_type  = 'Priority'
    LEFT JOIN public.tickets_master_configuration  sta
           ON sta.id  = t.status_id    AND sta.field_type  = 'Status'
    LEFT JOIN public.tickets_master_configuration  typ
           ON typ.id  = t.type_id      AND typ.field_type  = 'Request Type'
    WHERE
        (p_entity_id   IS NULL OR t.entity_id   = p_entity_id)
      AND (p_status_id   IS NULL OR t.status_id   = p_status_id)
      AND (p_type_id     IS NULL OR t.type_id     = p_type_id)
      AND (p_priority_id IS NULL OR t.priority_id = p_priority_id)
      AND (p_from_date   IS NULL OR t.created_date::DATE >= p_from_date)
      AND (p_to_date     IS NULL OR t.created_date::DATE <= p_to_date)
    ORDER BY t.id DESC;
END;
$$;

-- ─── 6. DASHBOARD KPI SUMMARY ───────────────────────────────
CREATE OR REPLACE FUNCTION sp_get_dashboard_kpi(
    p_entity_id INTEGER DEFAULT NULL
)
RETURNS TABLE (
    total_tickets    BIGINT,
    open_tickets     BIGINT,
    in_progress      BIGINT,
    closed_tickets   BIGINT,
    overdue_tickets  BIGINT,
    total_cr         BIGINT,
    total_incidents  BIGINT
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)                                                  AS total_tickets,
        COUNT(*) FILTER (WHERE sta.field_name NOT IN ('In Production','FD - Pending Sign Off')) AS open_tickets,
        COUNT(*) FILTER (WHERE sta.field_name IN ('DEV Inprogress','Testing Inprogress','FD Inprogress','TD Inprogress')) AS in_progress,
        COUNT(*) FILTER (WHERE sta.field_name = 'In Production') AS closed_tickets,
        COUNT(*) FILTER (
            WHERE t.planned_date IS NOT NULL
              AND t.planned_date < CURRENT_DATE
              AND sta.field_name != 'In Production'
        )                                                          AS overdue_tickets,
        COUNT(*) FILTER (WHERE typ.field_name = 'CR')             AS total_cr,
        COUNT(*) FILTER (WHERE typ.field_name = 'Issue')          AS total_incidents
    FROM public.tickets_createtickets t
    LEFT JOIN public.tickets_master_configuration sta
           ON sta.id = t.status_id   AND sta.field_type = 'Status'
    LEFT JOIN public.tickets_master_configuration typ
           ON typ.id = t.type_id     AND typ.field_type = 'Request Type'
    WHERE (p_entity_id IS NULL OR t.entity_id = p_entity_id);
END;
$$;

-- ─── 7. GET PORTFOLIO (tickets grouped by entity+category) ──
CREATE OR REPLACE FUNCTION sp_get_portfolio_summary()
RETURNS TABLE (
    entity_id        INTEGER,
    entity_name      TEXT,
    category_id      INTEGER,
    category_name    TEXT,
    total_tickets    BIGINT,
    open_tickets     BIGINT,
    in_production    BIGINT,
    overdue          BIGINT
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.entity_id,
        ent.name               AS entity_name,
        t.category_id,
        cat.category_name,
        COUNT(*)               AS total_tickets,
        COUNT(*) FILTER (WHERE sta.field_name != 'In Production') AS open_tickets,
        COUNT(*) FILTER (WHERE sta.field_name = 'In Production')  AS in_production,
        COUNT(*) FILTER (
            WHERE t.planned_date IS NOT NULL
              AND t.planned_date < CURRENT_DATE
              AND sta.field_name != 'In Production'
        )                      AS overdue
    FROM public.tickets_createtickets t
    LEFT JOIN public.tickets_entity               ent ON ent.id = t.entity_id
    LEFT JOIN public.tickets_category             cat ON cat.id = t.category_id
    LEFT JOIN public.tickets_master_configuration sta ON sta.id = t.status_id AND sta.field_type = 'Status'
    GROUP BY t.entity_id, ent.name, t.category_id, cat.category_name
    ORDER BY ent.name, cat.category_name;
END;
$$;

-- ─── 8. GET CR PIPELINE (grouped by build/status stages) ────
CREATE OR REPLACE FUNCTION sp_get_cr_pipeline(
    p_entity_id INTEGER DEFAULT NULL
)
RETURNS TABLE (
    id               INTEGER,
    ticket_no        INTEGER,
    title            TEXT,
    assignee         TEXT,
    entity_name      TEXT,
    category_name    TEXT,
    priority_name    TEXT,
    status_name      TEXT,
    schedule_build_no TEXT,
    planned_date     DATE,
    remarks          TEXT,
    created_date     TIMESTAMPTZ
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.id,
        t.ticket_no,
        t.title,
        t.assignee,
        ent.name              AS entity_name,
        cat.category_name,
        pri.field_name        AS priority_name,
        sta.field_name        AS status_name,
        t.schedule_build_no,
        t.planned_date,
        t.remarks,
        t.created_date
    FROM public.tickets_createtickets t
    LEFT JOIN public.tickets_entity               ent ON ent.id = t.entity_id
    LEFT JOIN public.tickets_category             cat ON cat.id = t.category_id
    LEFT JOIN public.tickets_master_configuration pri ON pri.id = t.priority_id AND pri.field_type = 'Priority'
    LEFT JOIN public.tickets_master_configuration sta ON sta.id = t.status_id   AND sta.field_type = 'Status'
    LEFT JOIN public.tickets_master_configuration typ ON typ.id = t.type_id     AND typ.field_type = 'Request Type'
    WHERE typ.field_name = 'CR'
      AND (p_entity_id IS NULL OR t.entity_id = p_entity_id)
    ORDER BY t.ticket_no;
END;
$$;

-- ─── 9. GET RELEASE HISTORY ─────────────────────────────────
CREATE OR REPLACE FUNCTION sp_get_release_history(
    p_entity_id INTEGER DEFAULT NULL
)
RETURNS TABLE (
    id                  INTEGER,
    ticket_no           INTEGER,
    title               TEXT,
    assignee            TEXT,
    entity_name         TEXT,
    category_name       TEXT,
    platform_name       TEXT,
    status_name         TEXT,
    schedule_build_no   TEXT,
    schedule_build_date DATE,
    planned_date        DATE,
    planned_duration    TEXT,
    remarks             TEXT
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.id,
        t.ticket_no,
        t.title,
        t.assignee,
        ent.name              AS entity_name,
        cat.category_name,
        plat.field_name       AS platform_name,
        sta.field_name        AS status_name,
        t.schedule_build_no,
        t.schedule_build_date,
        t.planned_date,
        t.planned_duration,
        t.remarks
    FROM public.tickets_createtickets t
    LEFT JOIN public.tickets_entity               ent  ON ent.id  = t.entity_id
    LEFT JOIN public.tickets_category             cat  ON cat.id  = t.category_id
    LEFT JOIN public.tickets_master_configuration plat ON plat.id = t.platform_id AND plat.field_type = 'Platforms'
    LEFT JOIN public.tickets_master_configuration sta  ON sta.id  = t.status_id   AND sta.field_type  = 'Status'
    WHERE t.schedule_build_no IS NOT NULL
      AND (p_entity_id IS NULL OR t.entity_id = p_entity_id)
    ORDER BY t.schedule_build_date DESC NULLS LAST;
END;
$$;

-- ─── 10. GET ALERTS (overdue / at risk tickets) ──────────────
CREATE OR REPLACE FUNCTION sp_get_alerts(
    p_entity_id INTEGER DEFAULT NULL
)
RETURNS TABLE (
    alert_type   TEXT,
    ticket_id    INTEGER,
    ticket_no    INTEGER,
    title        TEXT,
    assignee     TEXT,
    entity_name  TEXT,
    priority     TEXT,
    days_overdue INTEGER,
    status_name  TEXT
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    -- Overdue tickets
    SELECT
        'danger'                             AS alert_type,
        t.id                                 AS ticket_id,
        t.ticket_no,
        t.title,
        t.assignee,
        ent.name                             AS entity_name,
        pri.field_name                       AS priority,
        (CURRENT_DATE - t.planned_date)::INT AS days_overdue,
        sta.field_name                       AS status_name
    FROM public.tickets_createtickets t
    LEFT JOIN public.tickets_entity               ent ON ent.id = t.entity_id
    LEFT JOIN public.tickets_master_configuration pri ON pri.id = t.priority_id AND pri.field_type = 'Priority'
    LEFT JOIN public.tickets_master_configuration sta ON sta.id = t.status_id   AND sta.field_type = 'Status'
    WHERE t.planned_date IS NOT NULL
      AND t.planned_date < CURRENT_DATE
      AND sta.field_name != 'In Production'
      AND (p_entity_id IS NULL OR t.entity_id = p_entity_id)

    UNION ALL

    -- Tickets nearing deadline (within 3 days)
    SELECT
        'warning'                            AS alert_type,
        t.id                                 AS ticket_id,
        t.ticket_no,
        t.title,
        t.assignee,
        ent.name                             AS entity_name,
        pri.field_name                       AS priority,
        (t.planned_date - CURRENT_DATE)::INT AS days_overdue,
        sta.field_name                       AS status_name
    FROM public.tickets_createtickets t
    LEFT JOIN public.tickets_entity               ent ON ent.id = t.entity_id
    LEFT JOIN public.tickets_master_configuration pri ON pri.id = t.priority_id AND pri.field_type = 'Priority'
    LEFT JOIN public.tickets_master_configuration sta ON sta.id = t.status_id   AND sta.field_type = 'Status'
    WHERE t.planned_date IS NOT NULL
      AND t.planned_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 3
      AND sta.field_name != 'In Production'
      AND (p_entity_id IS NULL OR t.entity_id = p_entity_id)

    ORDER BY alert_type, days_overdue;
END;
$$;
