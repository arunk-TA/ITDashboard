# Stemz IT Dashboard — Setup Guide

## Stack
| Layer    | Technology                        |
|----------|-----------------------------------|
| Frontend | Angular 21 (standalone components)|
| Backend  | ASP.NET Core 8 Web API            |
| ORM      | Dapper (thin, SP-friendly)        |
| Database | PostgreSQL (via Npgsql)           |
| Queries  | 100% Stored Procedures            |

---

## Project Structure

```
ITDashboard/
├── ITDashboard.API/                  ← .NET 8 Web API
│   ├── Controllers/
│   │   └── DashboardController.cs   ← All API endpoints
│   ├── Models/
│   │   └── DashboardModels.cs       ← C# DTOs
│   ├── Repositories/
│   │   └── DashboardRepository.cs   ← Dapper calls to SPs
│   ├── StoredProcedures/
│   │   └── sp_ITDashboard.sql       ← All PostgreSQL SPs
│   ├── Program.cs
│   ├── appsettings.json
│   └── ITDashboard.API.csproj
│
└── ITDashboard.UI/                   ← Angular 21
    └── src/app/
        ├── models/
        │   └── dashboard.models.ts  ← TypeScript interfaces
        ├── services/
        │   └── dashboard.service.ts ← HTTP calls to API
        ├── components/
        │   ├── layout/              ← Sidebar + KPI bar
        │   ├── portfolio/           ← Entity/category cards
        │   ├── cr-pipeline/         ← Kanban board
        │   ├── releases/            ← Release history table
        │   └── alerts/              ← Overdue / at-risk
        ├── app.config.ts
        ├── app.routes.ts
        └── app.component.ts
```

---

## Step 1 — Run the Stored Procedures in PostgreSQL

Open **pgAdmin** or **psql** and run the SQL file:

```sql
-- In pgAdmin: right-click your DB → Query Tool → open and run:
\i 'path\to\ITDashboard.API\StoredProcedures\sp_ITDashboard.sql'
```

This creates 10 stored functions (sp_get_entities, sp_get_tickets, etc.)

---

## Step 2 — Configure the .NET API

Edit `ITDashboard.API/appsettings.json`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=YOUR_DB;Username=postgres;Password=YOUR_PASSWORD"
  }
}
```

---

## Step 3 — Run the .NET API

```bash
cd ITDashboard\ITDashboard.API
dotnet restore
dotnet run
```

API will start at `http://localhost:5000`

Test in browser: `http://localhost:5000/swagger`

---

## Step 4 — Run the Angular App

```bash
cd ITDashboard\ITDashboard.UI
npm install
ng serve
```

Open `http://localhost:4200`

---

## API Endpoints

| Method | URL                                      | Description                        |
|--------|------------------------------------------|------------------------------------|
| GET    | /api/dashboard/entities                  | All organisations                  |
| GET    | /api/dashboard/master-config             | Dropdowns (Status, Priority, etc.) |
| GET    | /api/dashboard/categories?entityId=0     | Categories by entity               |
| GET    | /api/dashboard/subcategories             | Subcategories                      |
| POST   | /api/dashboard/tickets                   | Tickets with filters               |
| GET    | /api/dashboard/kpi?entityId=0            | KPI summary counts                 |
| GET    | /api/dashboard/portfolio                 | Entity+Category summary            |
| GET    | /api/dashboard/cr-pipeline?entityId=0    | CR tickets only                    |
| GET    | /api/dashboard/releases?entityId=0       | Tickets with build numbers         |
| GET    | /api/dashboard/alerts?entityId=0         | Overdue + due-soon tickets         |

---

## Switching from PostgreSQL to Oracle / SQL Server

**Only 2 files need to change:**

### 1. `ITDashboard.API.csproj` — swap NuGet package
```xml
<!-- Oracle -->
<PackageReference Include="Oracle.ManagedDataAccess.Core" Version="23.x" />

<!-- SQL Server -->
<PackageReference Include="Microsoft.Data.SqlClient" Version="5.x" />
```

### 2. `DashboardRepository.cs` — swap connection
```csharp
// PostgreSQL (current)
private IDbConnection CreateConnection() => new NpgsqlConnection(_connectionString);

// Oracle
private IDbConnection CreateConnection() => new OracleConnection(_connectionString);

// SQL Server
private IDbConnection CreateConnection() => new SqlConnection(_connectionString);
```

### 3. Rewrite stored procedures in Oracle PL/SQL or T-SQL syntax
The logic stays identical — only syntax changes (e.g. `RETURN QUERY` → `OPEN cursor FOR`).

---

## Data Mapping

| Entity ID | Organisation       | Notes          |
|-----------|--------------------|----------------|
| 0         | Stemz Global       | QMC entity     |
| 1         | Stemz Healthcare   | QMC entity     |
| 2         | Nederlands Diagnostics |            |
| 3         | ND Phisantae       |                |
| 4         | Soul Space         |                |
| 5         | Internal Projects  |                |
| 6         | Cancer Care        |                |

`entity_ids` in master_configuration, categories, and subcategories uses JSONB arrays —
e.g. `[0, 1]` means the record belongs to both QMC entities.

---

## Stored Procedures Summary

| Function                     | Purpose                                      |
|------------------------------|----------------------------------------------|
| sp_get_entities()            | List all active organisations                |
| sp_get_master_config(…)      | Dropdown values (Status, Priority, Dept…)    |
| sp_get_categories(…)         | Categories filtered by entity                |
| sp_get_subcategories(…)      | Subcategories filtered by category/entity    |
| sp_get_tickets(…)            | Full ticket list with all joins              |
| sp_get_dashboard_kpi(…)      | 7 KPI counts for top bar                    |
| sp_get_portfolio_summary()   | Grouped by entity+category                  |
| sp_get_cr_pipeline(…)        | Change Requests only (type=CR)              |
| sp_get_release_history(…)    | Tickets that have build numbers             |
| sp_get_alerts(…)             | Overdue + due-within-3-days tickets         |
