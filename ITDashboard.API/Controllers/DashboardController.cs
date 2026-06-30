using ITDashboard.API.Models;
using ITDashboard.API.Repositories;
using ITDashboard.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Net;
using System.Security.Claims;
using System.Text.Json;
using static Org.BouncyCastle.Math.EC.ECCurve;

namespace ITDashboard.API.Controllers;
[AllowAnonymous]
[ApiController]
[Route("[controller]")]
public class DashboardController : ControllerBase
{
    private readonly IDashboardRepository _repo;
    private readonly IConfiguration _config;
    private readonly HelpdeskTokenService _helpdeskTokenService;

    // Session cache [AllowAnonymous]
    private static CookieContainer _helpdeskCookies = new CookieContainer();
    private static DateTime _cookieExpiry = DateTime.MinValue;
    private static string? _cachedJwtToken = null;   // ← ADD
    private static string? _cachedCsrfToken = null;  // ← ADD
    private static string? _cachedLoginResponse = null;

    public DashboardController(IDashboardRepository repo, IConfiguration config, HelpdeskTokenService helpdeskTokenService)
    {
        _repo = repo;
        _config = config;
        _helpdeskTokenService = helpdeskTokenService; // ← add

    }

    // GET api/dashboard/entities
    [HttpGet("entities")]
    public async Task<IActionResult> GetEntities()
    {
        var result = await _repo.GetEntitiesAsync();
        return Ok(result);
    }
    [HttpGet("active-users")]
    public async Task<IActionResult> GetActiveUsers()
    {
        var users = await _repo.GetActiveUsersAsync();
        return Ok(users);
    }

    [HttpPut("tickets/{ticketId}/assigned-user")]
    public async Task<IActionResult> UpdateAssignedUser(int ticketId, [FromBody] UpdateAssignedUserRequest request)
    {
        var success = await _repo.UpdateAssignedUserAsync(ticketId, request.UserId, GetCurrentUser(), GetCurrentUserId());
        if (!success) return NotFound();
        return Ok(new { message = "User assigned successfully" });
    }

     
    [HttpPut("tickets/{ticketId}/status")]
    public async Task<IActionResult> UpdateTicketStatus(int ticketId, [FromBody] UpdateStatusRequest request)
    {
        var success = await _repo.UpdateTicketStatusAsync(ticketId, request.StatusId, GetCurrentUser(), GetCurrentUserId());
        if (!success) return NotFound();
        return Ok(new { message = "Status updated successfully" });
    }
    [HttpGet("tickets/{ticketId}/audit-log")]
    public async Task<IActionResult> GetAuditLog(int ticketId)
    {
        var logs = await _repo.GetTicketAuditLogAsync(ticketId);
        return Ok(logs);
    }

    private async Task<(CookieContainer? cookies, string? csrfToken)> GetHelpdeskSession()
    {
        // Return cached if still valid
        if (!string.IsNullOrEmpty(_cachedJwtToken) && DateTime.UtcNow < _cookieExpiry)
        {
            Console.WriteLine("✅ Using cached JWT token");
            return (_helpdeskCookies, _cachedCsrfToken ?? "no-csrf");
        }

        try
        {
            var baseUrl = _config["HelpdeskApi:BaseUrl"]?.TrimEnd('/');
            var username = _config["HelpdeskApi:Username"] ?? "nandakumarr";
            var password = _config["HelpdeskApi:Password"] ?? "N#tarun@2017";
            var clientId = _config["HelpdeskApi:ClientId"];
            var clientSecret = _config["HelpdeskApi:ClientSecretKey"];
            var baseUri = new Uri(baseUrl!);

            var cookieContainer = new CookieContainer();
            var handler = new HttpClientHandler
            {
                CookieContainer = cookieContainer,
                AllowAutoRedirect = true,
                UseCookies = true,
                ServerCertificateCustomValidationCallback = (msg, cert, chain, errors) => true
            };

            using var client = new HttpClient(handler);
            client.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
            client.DefaultRequestHeaders.Add("Accept", "application/json");
            client.DefaultRequestHeaders.Add("Client-ID", clientId);
            client.DefaultRequestHeaders.Add("Client-Secret-Key", clientSecret);

            // ✅ CORRECT URL
            var loginUrl = $"{baseUrl}/helpdesk/api/login/";
            Console.WriteLine($"🔵 Logging in at: {loginUrl}");

            var loginData = new { username, password };
            var json = System.Text.Json.JsonSerializer.Serialize(loginData);
            var content = new StringContent(json, System.Text.Encoding.UTF8, "application/json");

            var response = await client.PostAsync(loginUrl, content);
            var responseText = await response.Content.ReadAsStringAsync();

            Console.WriteLine($"🔵 Login status: {response.StatusCode}");

            if (!response.IsSuccessStatusCode)
            {
                Console.WriteLine($"❌ Login failed: {responseText}");
                return (null, null);
            }

            var tokenJson = System.Text.Json.JsonDocument.Parse(responseText);

            if (!tokenJson.RootElement.TryGetProperty("access", out var accessTokenEl))
            {
                Console.WriteLine("❌ No 'access' field in response");
                return (null, null);
            }

            var jwtToken = accessTokenEl.GetString();
            Console.WriteLine($"✅ JWT token obtained!");
            string? entityId = null;
            string? roleId = null;

            if (tokenJson.RootElement.TryGetProperty("user", out var userEl))
            {
                if (userEl.TryGetProperty("entity_data", out var entityData))
                {
                    // Get first entity automatically
                    if (entityData.ValueKind == JsonValueKind.Array && entityData.GetArrayLength() > 0)
                        entityId = entityData[0].TryGetProperty("id", out var eid)
                                   ? eid.GetString() : null;
                }
            }
            cookieContainer.Add(baseUri, new Cookie("access_token", jwtToken!));
            _cachedLoginResponse = responseText;
            _cachedJwtToken = jwtToken;
            _cachedCsrfToken = "no-csrf";
            _helpdeskCookies = cookieContainer;
            _cookieExpiry = DateTime.UtcNow.AddMinutes(55);

            Console.WriteLine("✅ Session established!");
            return (cookieContainer, "no-csrf");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Session error: {ex.Message}");
            return (null, null);
        }
    }
    [HttpGet("helpdesk/get-token")]
    public async Task<IActionResult> GetHelpdeskToken()
    {
        var (_, _) = await GetHelpdeskSession(); // ensures token is cached

        if (string.IsNullOrEmpty(_cachedJwtToken))
            return StatusCode(500, new { error = "Could not get token" });

        return Ok(new { token = _cachedJwtToken });
    }

    // GET api/dashboard/master-config?entityId=0&fieldType=Status
    [HttpGet("master-config")]
    public async Task<IActionResult> GetMasterConfig(
        [FromQuery] int? entityId,
        [FromQuery] string? fieldType)
    {
        var result = await _repo.GetMasterConfigAsync(entityId, fieldType);
        return Ok(result);
    }

    // GET api/dashboard/categories?entityId=0
    [HttpGet("categories")]
    public async Task<IActionResult> GetCategories([FromQuery] int? entityId)
    {
        var result = await _repo.GetCategoriesAsync(entityId);
        return Ok(result);
    }

    // GET api/dashboard/subcategories?categoryId=60&entityId=0
    [HttpGet("subcategories")]
    public async Task<IActionResult> GetSubcategories(
        [FromQuery] int? categoryId,
        [FromQuery] int? entityId)
    {
        var result = await _repo.GetSubcategoriesAsync(categoryId, entityId);
        return Ok(result);
    }

    // ✅ Change to GET
    [HttpGet("tickets")]
    public async Task<IActionResult> GetTickets(
        [FromQuery] int? entityId,
        [FromQuery] int? statusId,
        [FromQuery] int? typeId,
        [FromQuery] int? priorityId,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate)
    {
        var filter = new TicketFilterRequest
        {
            EntityId = entityId,
            StatusId = statusId,
            TypeId = typeId,
            PriorityId = priorityId,
            FromDate = fromDate,
            ToDate = toDate
        };
        var result = await _repo.GetTicketsAsync(filter);
        return Ok(result);
    }


    // GET api/dashboard/kpi?entityId=0
    [HttpGet("kpi")]
    public async Task<IActionResult> GetKpi([FromQuery] int? entityId)
    {
        var result = await _repo.GetDashboardKpiAsync(entityId);
        return Ok(result);
    }

     
    [HttpGet("helpdesk/debug-login")]
    public async Task<IActionResult> DebugLogin()
    {
        var baseUrl = _config["HelpdeskApi:BaseUrl"]?.TrimEnd('/');
        var username = _config["HelpdeskApi:Username"] ?? "nandakumarr";
        var password = _config["HelpdeskApi:Password"] ?? "N#tarun@2017";
        var clientId = _config["HelpdeskApi:ClientId"];
        var clientSecret = _config["HelpdeskApi:ClientSecretKey"];

        var result = new Dictionary<string, object>();

        using var client = new HttpClient();
        client.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0");
        client.DefaultRequestHeaders.Add("Accept", "application/json");
        client.DefaultRequestHeaders.Add("Client-ID", clientId);
        client.DefaultRequestHeaders.Add("Client-Secret-Key", clientSecret);

        var loginData = new { username, password };
        var json = System.Text.Json.JsonSerializer.Serialize(loginData);

        // ✅ Try ALL possible login endpoints
        string[] tokenUrls =
        {
        $"{baseUrl}/helpdesk/api/auth/login/",
        $"{baseUrl}/helpdesk/api/login/",
        $"{baseUrl}/helpdesk/api/user/login/",
        $"{baseUrl}/helpdesk/api/users/login/",
        $"{baseUrl}/helpdesk/api/token/",
        $"{baseUrl}/api/auth/login/",
        $"{baseUrl}/api/login/",
        $"{baseUrl}/api/token/",
    };

        foreach (var url in tokenUrls)
        {
            try
            {
                var content = new StringContent(json, System.Text.Encoding.UTF8, "application/json");
                var response = await client.PostAsync(url, content);
                var responseText = await response.Content.ReadAsStringAsync();

                result[url] = new
                {
                    status = response.StatusCode.ToString(),
                    response = responseText.Substring(0, Math.Min(200, responseText.Length))
                };
            }
            catch (Exception ex)
            {
                result[url] = new { error = ex.Message };
            }
        }

        return Ok(result);
    }
    [HttpGet("portfolio")]
    public async Task<IActionResult> GetPortfolio()
    {
        var result = await _repo.GetPortfolioSummaryAsync();
        return Ok(result);
    }
    [HttpGet("portfolio/summary")]
    public async Task<IActionResult> GetPortfolioSummary([FromQuery] int? userId)
    {
        var data = await _repo.GetPortfolioSummaryAsync(userId);
        return Ok(data);
    }
    // GET api/dashboard/category-releases?categoryId=61&entityId=1
    [HttpGet("category-releases")]
    public async Task<IActionResult> GetCategoryReleases([FromQuery] int? categoryId, [FromQuery] int? entityId)
    {
        var result = await _repo.GetCategoryReleasesAsync(categoryId, entityId);
        return Ok(result);
    }

    [HttpGet("portfolio/categories")]
    public async Task<IActionResult> GetPortfolioCategories()
    {
        var data = await _repo.GetPortfolioCategoriesAsync();
        return Ok(data);
    }
    [HttpGet("department-summary")]
    public async Task<IActionResult> GetDepartmentSummary([FromQuery] int entityId)
    {
        var result = await _repo.GetDepartmentSummaryAsync(entityId);
        return Ok(result);
    }
    [HttpGet("Status")]
    public async Task<IActionResult> Status([FromQuery] int entityId)
    {
        var result = await _repo.StatusList(entityId);
        return Ok(result);
    }


    // GET api/dashboard/cr-pipeline?entityId=0
    [HttpGet("cr-pipeline")]
    public async Task<IActionResult> GetCrPipeline([FromQuery] int? entityId)
    {
        var result = await _repo.GetCrPipelineAsync(entityId);
        return Ok(result);
    }

    // GET api/dashboard/releases?entityId=0
    [HttpGet("releases")]
    public async Task<IActionResult> GetReleases([FromQuery] int? entityId)
    {
        var result = await _repo.GetReleaseHistoryAsync(entityId);
        return Ok(result);
    }

    // GET api/dashboard/alerts?entityId=0
    [HttpGet("alerts")]
    public async Task<IActionResult> GetAlerts([FromQuery] int? entityId)
    {
        var result = await _repo.GetAlertsAsync(entityId);
        return Ok(result);
    }
    // ─── Key Risks Endpoints ────────────────────────────────────
    [HttpGet("key-risks")]
    public async Task<IActionResult> GetKeyRisks([FromQuery] int? entityId, [FromQuery] string? category)
    {
        var result = await _repo.GetKeyRisksAsync(entityId, category);
        return Ok(result);
    }


    [HttpGet("key-risks/{id}")]
    public async Task<IActionResult> GetKeyRiskById(int id)
    {
        var result = await _repo.GetKeyRiskByIdAsync(id);
        if (result == null)
            return NotFound($"Key risk with ID {id} not found");
        return Ok(result);
    }

    [HttpPost("key-risks")]
    public async Task<IActionResult> CreateKeyRisk([FromBody] CreateKeyRiskRequest request)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(request.Title))
                return BadRequest(new { error = "Title is required" });

            // Set default category if not provided
            if (string.IsNullOrEmpty(request.Category))
                request.Category = "key_risks";

            if (string.IsNullOrEmpty(request.Description))
                request.Description = "<p></p>";

            var id = await _repo.CreateKeyRiskAsync(request, User.Identity?.Name ?? "System");
            return Ok(new { id = id, message = "Risk created successfully" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPut("key-risks/{id}")]
    public async Task<IActionResult> UpdateKeyRisk(int id, [FromBody] UpdateKeyRiskRequest request)
    {
        try
        {
            Console.WriteLine($"Updating risk ID: {id}");
            Console.WriteLine($"Title: {request.Title}");
            Console.WriteLine($"Description: {request.Description?.Substring(0, Math.Min(100, request.Description?.Length ?? 0))}");

            if (string.IsNullOrWhiteSpace(request.Title))
                return BadRequest(new { error = "Title is required" });

            var success = await _repo.UpdateKeyRiskAsync(id, request, "System");

            if (!success)
                return NotFound(new { error = $"Key risk with ID {id} not found" });

            return Ok(new { message = "Risk updated successfully", id = id });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Exception: {ex.Message}");
            return StatusCode(500, new { error = ex.Message });
        }
    }
    [HttpDelete("key-risks/{id}")]
    public async Task<IActionResult> DeleteKeyRisk(int id)
    {
        var success = await _repo.DeleteKeyRiskAsync(id);
        if (!success)
            return NotFound($"Key risk with ID {id} not found");

        return Ok(new { Message = "Risk deleted successfully" });
    }
    [HttpGet("release-note/{ticketId}")]
    public async Task<IActionResult> GetReleaseNote(int ticketId)
    {
        var releaseNote = await _repo.GetReleaseNoteAsync(ticketId);
        return Ok(new { releaseNote = releaseNote ?? "" });
    }

    // ✅ ADD THIS ENDPOINT - Update release note
    [HttpPut("release-note/{ticketId}")]
    public async Task<IActionResult> UpdateReleaseNote(int ticketId, [FromBody] UpdateReleaseNoteRequest request)
    {
        if (request == null)
        {
            return BadRequest(new { error = "Invalid request" });
        }

        var success = await _repo.UpdateReleaseNoteAsync(ticketId, request.ReleaseNote ?? "");

        if (!success)
        {
            return NotFound(new { error = $"Ticket with ID {ticketId} not found" });
        }

        return Ok(new { message = "Release note saved successfully" });
    }
    [HttpGet("build-documents")]
    public async Task<IActionResult> GetBuildDocuments(
    [FromQuery] string buildNo,
    [FromQuery] int? platformId)
    {
        var docs = await _repo.GetBuildDocumentsAsync(buildNo, platformId);
        return Ok(docs);
    }

    [HttpGet("helpdesk/debug-asset")]
    public async Task<IActionResult> DebugAsset()
    {
        var requestPath = Request.Path.Value ?? "";
        var baseUrl = _config["HelpdeskApi:BaseUrl"]?.TrimEnd('/');

        string assetEndpoint;
        if (requestPath.StartsWith("/api/"))
            assetEndpoint = "/api/dashboard/helpdesk/proxy-asset";
        else
            assetEndpoint = "/dashboard/helpdesk/proxy-asset";

        return Ok(new
        {
            requestPath,
            assetEndpoint,
            baseUrl,
            cachedJwtToken = _cachedJwtToken?[..20] + "...",
            cachedLoginResponse = _cachedLoginResponse?[..100]
        });
    }

    [HttpPost("build-documents/upload")]

    public async Task<IActionResult> UploadBuildDocument(
        [FromForm] IFormFile file,
        [FromForm] string buildNo,
        [FromForm] int? platformId,
        [FromForm] int? entityId)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { error = "No file provided" });

        // Save to wwwroot/uploads/build-docs/
        var uploadDir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "build-docs");
        Directory.CreateDirectory(uploadDir);

        var uniqueName = $"{buildNo}_{Guid.NewGuid()}_{file.FileName}";
        var filePath = Path.Combine(uploadDir, uniqueName);

        using (var stream = new FileStream(filePath, FileMode.Create))
            await file.CopyToAsync(stream);

        var doc = new BuildDocumentModel
        {
            BuildNo = buildNo,
            PlatformId = platformId,
            EntityId = entityId,
            FileName = file.FileName,
            FilePath = $"/uploads/build-docs/{uniqueName}",
            FileSize = file.Length,
            UploadedBy = "System"
        };

        var id = await _repo.SaveBuildDocumentAsync(doc);
        return Ok(new { id, message = "Document uploaded successfully", filePath = doc.FilePath });
    }

    [AllowAnonymous]
    [HttpGet("helpdesk/proxy")]
    public async Task<IActionResult> HelpdeskProxy([FromQuery] string path = "AdminDashboard")
    {
        try
        {
            var baseUrl = _config["HelpdeskApi:BaseUrl"]?.TrimEnd('/');
            var clientId = _config["HelpdeskApi:ClientId"];
            var clientSecret = _config["HelpdeskApi:ClientSecretKey"];

            var (cookieContainer, csrfToken) = await GetHelpdeskSession();

            if (cookieContainer == null)
                return Content("<html><body><h3>Could not authenticate with helpdesk.</h3></body></html>", "text/html");

            var handler = new HttpClientHandler
            {
                CookieContainer = cookieContainer,
                UseCookies = true,
                AllowAutoRedirect = true
            };

            using var httpClient = new HttpClient(handler);
            httpClient.DefaultRequestHeaders.Add("Client-ID", clientId);
            httpClient.DefaultRequestHeaders.Add("Client-Secret-Key", clientSecret);
            httpClient.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
            httpClient.DefaultRequestHeaders.Add("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8");
            httpClient.DefaultRequestHeaders.Add("Referer", $"{baseUrl}/AdminDashboard");

            if (!string.IsNullOrEmpty(_cachedJwtToken))
                httpClient.DefaultRequestHeaders.Authorization =
                    new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _cachedJwtToken);

            var targetUrl = $"{baseUrl}/AdminDashboard";
            var response = await httpClient.GetAsync(targetUrl);

            var finalUrl = response.RequestMessage?.RequestUri?.ToString() ?? "";
            if (finalUrl.Contains("login") || response.StatusCode == System.Net.HttpStatusCode.Unauthorized)
            {
                _helpdeskCookies = new CookieContainer();
                _cookieExpiry = DateTime.MinValue;
                (cookieContainer, csrfToken) = await GetHelpdeskSession();
                if (cookieContainer != null)
                {
                    var retryHandler = new HttpClientHandler { CookieContainer = cookieContainer, UseCookies = true };
                    using var retryClient = new HttpClient(retryHandler);
                    retryClient.DefaultRequestHeaders.Add("Client-ID", clientId);
                    retryClient.DefaultRequestHeaders.Add("Client-Secret-Key", clientSecret);
                    retryClient.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0");
                    response = await retryClient.GetAsync(targetUrl);
                }
            }

            var content = await response.Content.ReadAsStringAsync();

            //var requestHost = Request.Host.Value;
            //var isLocal = requestHost.Contains("localhost");
            //var apiPrefix = isLocal ? "/api" : "";
            //var assetEndpoint = $"{apiPrefix}/dashboard/helpdesk/proxy-asset";

            var routePrefix = _config["AppSettings:RoutePrefix"] ?? "";
            //var assetEndpoint = string.IsNullOrEmpty(routePrefix)
            //    ? "/dashboard/helpdesk/proxy-asset"
            //    : $"/{routePrefix}/dashboard/helpdesk/proxy-asset";
            var assetEndpoint = "/api/dashboard/helpdesk/proxy-asset";

            Console.WriteLine($"🔵 routePrefix={routePrefix} assetEndpoint={assetEndpoint}");

            // ✅ Double-check it starts with /
            if (!assetEndpoint.StartsWith("/"))
                assetEndpoint = "/" + assetEndpoint;

            Console.WriteLine($"🔵 requestPath: '{Request.Path.Value}'");
            Console.WriteLine($"🔵 assetEndpoint: '{assetEndpoint}'");
            // ── STEP A: Parse login response ──
            var loginResponse = System.Text.Json.JsonDocument.Parse(_cachedLoginResponse ?? "{}");

            string userJson = "{}";
            string userEntityJson = "{}";
            string roleMappingsJson = "[]";
            string selectedRoleMappingJson = "{}";
            string refreshToken = "";

            try
            {
                var root = loginResponse.RootElement;

                if (root.TryGetProperty("user", out var userEl))
                    userJson = userEl.GetRawText();

                if (root.TryGetProperty("user", out var userEl2) &&
                    userEl2.TryGetProperty("entity_data", out var entityData))
                {
                    if (entityData.ValueKind == JsonValueKind.Array && entityData.GetArrayLength() > 0)
                        userEntityJson = entityData[0].GetRawText();
                    else
                        userEntityJson = entityData.GetRawText();
                }

                if (root.TryGetProperty("user", out var userEl3) &&
                    userEl3.TryGetProperty("role_mappings", out var roleMappings))
                {
                    roleMappingsJson = roleMappings.GetRawText();

                    foreach (var mapping in roleMappings.EnumerateArray())
                    {
                        if (mapping.TryGetProperty("role_name", out var rn) &&
                            rn.GetString()?.ToLower() == "admin")
                        {
                            selectedRoleMappingJson = mapping.GetRawText();
                            break;
                        }
                    }

                    if (selectedRoleMappingJson == "{}" && roleMappings.GetArrayLength() > 0)
                        selectedRoleMappingJson = roleMappings[0].GetRawText();
                }

                if (root.TryGetProperty("refresh", out var refreshEl))
                    refreshToken = refreshEl.GetString() ?? "";
            }
            catch (Exception ex)
            {
                Console.WriteLine($"⚠️ Failed to parse login response: {ex.Message}");
            }

            // ── STEP B: Escape all values so they are safe inside JS strings ──
            static string JsStr(string s) => s
                .Replace("\\", "\\\\")
                .Replace("'", "\\'")
                .Replace("\r", "\\r")
                .Replace("\n", "\\n")
                .Replace("</", "<\\/");

            static string JsJson(string json) => json.Replace("</", "<\\/");

            var safeJwt = JsStr(_cachedJwtToken ?? "");
            var safeRefresh = JsStr(refreshToken);
            var safeBaseUrl = JsStr(baseUrl ?? "");
            var safeAsset = JsStr(assetEndpoint);
            var safeUser = JsJson(userJson);
            var safeEntity = JsJson(userEntityJson);
            var safeRoles = JsJson(roleMappingsJson);
            var safeSelected = JsJson(selectedRoleMappingJson);

            // ── STEP C: Build injection script using safe variables ──
            var injectionScript = $@"
<script>
(function() {{
    if (window.location.pathname !== '/AdminDashboard') {{
        window.history.replaceState({{}}, '', '/AdminDashboard');
    }}

    var JWT_TOKEN      = '{safeJwt}';
    var REFRESH_TOKEN  = '{safeRefresh}';
    var BASE_URL       = '{safeBaseUrl}';
    var ASSET_ENDPOINT = '{safeAsset}';
    var USER_DATA      = {safeUser};
    var USER_ENTITY    = {safeEntity};
    var ROLE_MAPPINGS  = {safeRoles};
    var SELECTED_ROLE  = {safeSelected};

    try {{
        localStorage.setItem('access_token', JWT_TOKEN);
        localStorage.setItem('refresh_token', REFRESH_TOKEN);
        localStorage.setItem('user', JSON.stringify(USER_DATA));
        localStorage.setItem('user_data', JSON.stringify(USER_DATA));
        localStorage.setItem('userEntity', JSON.stringify(USER_ENTITY));
        localStorage.setItem('available_role_mappings', JSON.stringify(ROLE_MAPPINGS));
        localStorage.setItem('selected_role_mapping', JSON.stringify(SELECTED_ROLE));
        localStorage.setItem('admin_tickets_page', '0');
        localStorage.setItem('admin_tickets_rows_per_page', '50');
        console.log('✅ localStorage seeded');
    }} catch(e) {{
        console.warn('localStorage error:', e);
    }}

    var origFetch = window.fetch;
    window.fetch = function(url, opts) {{
        opts = opts || {{}};
        opts.headers = opts.headers || {{}};
        var urlStr = (typeof url === 'string') ? url : (url && url.url ? url.url : '');

        if (urlStr.match(/(verify[\-_]?token|token[\-_]?verify|\/me\/?$|current[\-_]?user|whoami|check[\-_]?auth|is[\-_]?authenticated)/i)) {{
            console.log('🔵 Intercepted auth check:', urlStr);
            return Promise.resolve(new Response(JSON.stringify({{
                id: USER_DATA.id,
                name: USER_DATA.name,
                email: USER_DATA.email,
                entity: USER_ENTITY,
                role_mapping: SELECTED_ROLE,
                access: JWT_TOKEN,
                refresh: REFRESH_TOKEN,
                is_authenticated: true
            }}), {{ status: 200, headers: {{ 'Content-Type': 'application/json' }} }}));
        }}

        var isAbsolute = urlStr.startsWith(BASE_URL);
        var isRelative = urlStr.startsWith('/helpdesk/') || urlStr.startsWith('/api/');
        var isAsset    = /\.(js|css|png|jpg|jpeg|ico|svg|woff|woff2|ttf|map)(\?|$)/.test(urlStr);

        if (isAbsolute || isRelative) {{
            opts.headers['Authorization'] = 'Bearer ' + JWT_TOKEN;
            if (USER_ENTITY && USER_ENTITY.id)
                opts.headers['Entity-ID'] = String(USER_ENTITY.id);
            if (SELECTED_ROLE && SELECTED_ROLE.id) {{
                opts.headers['Role-ID'] = String(SELECTED_ROLE.id);
                opts.headers['Role-Mapping-ID'] = String(SELECTED_ROLE.id);
            }}
            url = isAbsolute
                ? ASSET_ENDPOINT + '?url=' + encodeURIComponent(urlStr)
                : ASSET_ENDPOINT + '?url=' + encodeURIComponent(BASE_URL + urlStr);
        }} else if (isAsset && urlStr.startsWith('/') && !urlStr.startsWith('/api/')) {{
            url = ASSET_ENDPOINT + '?url=' + encodeURIComponent(BASE_URL + urlStr);
        }}

        if (JWT_TOKEN && !opts.headers['Authorization'])
            opts.headers['Authorization'] = 'Bearer ' + JWT_TOKEN;

        return origFetch.call(this, url, opts);
    }};

    var origOpen = XMLHttpRequest.prototype.open;
    var origSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function(method, url) {{
        this._origUrl = url;
        var urlStr = (typeof url === 'string') ? url : '';
        if (urlStr.startsWith(BASE_URL)) {{
            url = ASSET_ENDPOINT + '?url=' + encodeURIComponent(urlStr);
        }} else if (urlStr.startsWith('/') && !urlStr.startsWith('/api/')) {{
            url = ASSET_ENDPOINT + '?url=' + encodeURIComponent(BASE_URL + urlStr);
        }}
        return origOpen.apply(this, [method, url].concat(Array.prototype.slice.call(arguments, 2)));
    }};
    XMLHttpRequest.prototype.send = function() {{
        try {{ this.setRequestHeader('Authorization', 'Bearer ' + JWT_TOKEN); }} catch(e) {{}}
        try {{
            if (USER_ENTITY && USER_ENTITY.id)
                this.setRequestHeader('Entity-ID', String(USER_ENTITY.id));
            if (SELECTED_ROLE && SELECTED_ROLE.id)
                this.setRequestHeader('Role-Mapping-ID', String(SELECTED_ROLE.id));
        }} catch(e) {{}}
        return origSend.apply(this, arguments);
    }};

    function startObserver() {{
        var target = document.body || document.documentElement;
        if (!target) {{
            setTimeout(startObserver, 50);
            return;
        }}
        var observer = new MutationObserver(function() {{
            if (window.location.pathname !== '/AdminDashboard') {{
                window.history.replaceState({{}}, '', '/AdminDashboard');
                window.dispatchEvent(new PopStateEvent('popstate', {{ state: {{}} }}));
            }} else {{
                observer.disconnect();
            }}
        }});
        observer.observe(target, {{ childList: true, subtree: true }});
    }}

    // ─── TRIM/CLEANUP FUNCTIONS ─────────────────────────────────
    function trimHeaderSection() {{
        // Hide header/logo sections
        var headerElements = document.querySelectorAll('header, .MuiAppBar-root, .MuiToolbar-root, [class*=""header""], [class*=""Header""], [class*=""navbar""], [class*=""Navbar""], [class*=""topbar""], [class*=""TopBar""]');
        headerElements.forEach(function(el) {{
            var text = (el.innerText || el.textContent || '').trim();
            if (text.includes('Stemz Tech') || text.includes('Helpdesk') || text.includes('Admin')) {{
                el.style.display = 'none';
                console.log('🙈 Hidden header section');
            }}
        }});

        // Hide dropdown/menu (Off ▼, ADMIN, email)
        var dropdownElements = document.querySelectorAll('button, [role=""button""], [class*=""dropdown""], [class*=""Dropdown""], [class*=""menu""], [class*=""Menu""], div, span, p');
        dropdownElements.forEach(function(el) {{
            var text = (el.innerText || el.textContent || '').trim();
            if (text.includes('Off ▼') || text === 'Off' || text === '▼' || text === 'ADMIN' || text.includes('sridharang@@q')) {{
                el.style.display = 'none';
                console.log('🙈 Hidden: ' + text);
            }}
        }});

        // Hide any divs with header/logo content
        var allDivs = document.querySelectorAll('div[class*=""header""], div[class*=""Header""], div[class*=""logo""], div[class*=""Logo""]');
        allDivs.forEach(function(el) {{
            var text = (el.innerText || el.textContent || '').trim();
            if (text.includes('Stemz Tech') || text.includes('Helpdesk')) {{
                el.style.display = 'none';
                console.log('🙈 Hidden logo/header div');
            }}
        }});
    }}

    function runCleanup() {{
        trimHeaderSection();
    }}

    // Run cleanup with delays for React rendering
    runCleanup();
    setTimeout(runCleanup, 500);
    setTimeout(runCleanup, 1500);
    setTimeout(runCleanup, 3000);
    setTimeout(runCleanup, 5000);

    // MutationObserver for React re-renders
    var cleanupObserver = new MutationObserver(function() {{
        runCleanup();
    }});
    document.addEventListener('DOMContentLoaded', function() {{
        cleanupObserver.observe(document.body, {{ childList: true, subtree: true }});
    }});

    if (document.readyState === 'loading') {{
        document.addEventListener('DOMContentLoaded', startObserver);
    }} else {{
        startObserver();
    }}

    console.log('✅ Proxy fully initialized with cleanup');
}})();
</script>";

            // ── STEP D: Inject script and rewrite asset URLs ──
            if (content.Contains("<head>", StringComparison.OrdinalIgnoreCase))
                content = content.Replace("<head>", "<head>" + injectionScript, StringComparison.OrdinalIgnoreCase);
            else
                content = injectionScript + content;

            content = content
                .Replace("src=\"/assets/", $"src=\"{assetEndpoint}?url={baseUrl}/assets/")
                .Replace("href=\"/assets/", $"href=\"{assetEndpoint}?url={baseUrl}/assets/")
                .Replace("src=\"assets/", $"src=\"{assetEndpoint}?url={baseUrl}/assets/")
                .Replace("href=\"assets/", $"href=\"{assetEndpoint}?url={baseUrl}/assets/");

            Response.Headers.Remove("X-Frame-Options");
            Response.Headers.Remove("Content-Security-Policy");

            return Content(content, "text/html; charset=utf-8");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Proxy error: {ex.Message}");
            return StatusCode(500, $"<html><body><h3>Error: {ex.Message}</h3></body></html>");
        }
    }
    [AllowAnonymous]
    [HttpGet("helpdesk/proxy-asset")]
    [HttpPost("helpdesk/proxy-asset")]
    public async Task<IActionResult> ProxyAsset([FromQuery] string url)
    {
        if (string.IsNullOrWhiteSpace(url) || (!url.StartsWith("http://") && !url.StartsWith("https://")))
        {
            Console.WriteLine($"❌ Rejected bad URL: '{url}'");
            return BadRequest("Invalid URL");
        }

        Console.WriteLine($"🔵 proxy-asset: {url}");

        try
        {
            var clientId = _config["HelpdeskApi:ClientId"];
            var clientSecret = _config["HelpdeskApi:ClientSecretKey"];

            var (cookieContainer, _) = await GetHelpdeskSession();

            var handler = new HttpClientHandler
            {
                CookieContainer = cookieContainer ?? new CookieContainer(),
                UseCookies = true,
                ServerCertificateCustomValidationCallback = (m, c, ch, e) => true
            };

            using var client = new HttpClient(handler);
            client.DefaultRequestHeaders.Add("Client-ID", clientId);
            client.DefaultRequestHeaders.Add("Client-Secret-Key", clientSecret);
            client.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0");

            if (!string.IsNullOrEmpty(_cachedJwtToken))
                client.DefaultRequestHeaders.Authorization =
                    new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _cachedJwtToken);

            foreach (var header in Request.Headers)
            {
                var key = header.Key.ToLower();
                if (key == "entity-id" || key == "role-id" || key == "role-mapping-id")
                {
                    try { client.DefaultRequestHeaders.Add(header.Key, header.Value.ToString()); }
                    catch { }
                }
            }

            HttpResponseMessage response;
            if (Request.Method == "POST" || Request.Method == "PUT" || Request.Method == "PATCH")
            {
                using var bodyStream = new StreamReader(Request.Body);
                var bodyContent = await bodyStream.ReadToEndAsync();
                var reqContent = new StringContent(bodyContent,
                    System.Text.Encoding.UTF8,
                    Request.ContentType ?? "application/json");
                response = Request.Method == "POST"
                    ? await client.PostAsync(url, reqContent)
                    : await client.PutAsync(url, reqContent);
            }
            else
            {
                response = await client.GetAsync(url);
            }

            // ✅ Log what the upstream server actually returned
            Console.WriteLine($"🔵 proxy-asset response: {response.StatusCode} | Content-Type: {response.Content.Headers.ContentType}");

            if (response.StatusCode == System.Net.HttpStatusCode.Forbidden ||
                response.StatusCode == System.Net.HttpStatusCode.Unauthorized)
            {
                _cachedJwtToken = null;
                _cookieExpiry = DateTime.MinValue;
                await GetHelpdeskSession();
                if (!string.IsNullOrEmpty(_cachedJwtToken))
                {
                    client.DefaultRequestHeaders.Authorization =
                        new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _cachedJwtToken);
                    response = await client.GetAsync(url);
                }
            }

            var bytes = await response.Content.ReadAsByteArrayAsync();
            var contentType = response.Content.Headers.ContentType?.MediaType ?? "application/octet-stream";

            // ✅ Force correct MIME type based on file extension
            // This fixes cases where the upstream server returns wrong Content-Type
            if (url.EndsWith(".js") || url.Contains(".js?"))
                contentType = "application/javascript";
            else if (url.EndsWith(".css") || url.Contains(".css?"))
                contentType = "text/css";
            else if (url.EndsWith(".woff2"))
                contentType = "font/woff2";
            else if (url.EndsWith(".woff"))
                contentType = "font/woff";
            else if (url.EndsWith(".png"))
                contentType = "image/png";
            else if (url.EndsWith(".svg"))
                contentType = "image/svg+xml";
            else if (url.EndsWith(".json"))
                contentType = "application/json";

            // ✅ If upstream returned HTML for a JS file, it's a 401/redirect — return empty JS instead
            var responseText = System.Text.Encoding.UTF8.GetString(bytes);
            if ((url.EndsWith(".js") || url.Contains(".js?")) && responseText.TrimStart().StartsWith("<"))
            {
                Console.WriteLine($"❌ Upstream returned HTML for JS file: {url}");
                Console.WriteLine($"❌ First 200 chars: {responseText[..Math.Min(200, responseText.Length)]}");
                // Return empty JS so the browser doesn't crash with MIME error
                return Content("/* proxy: upstream returned HTML for this asset */", "application/javascript");
            }

            Response.Headers["Access-Control-Allow-Origin"] = "*";
            Response.Headers["Access-Control-Allow-Headers"] = "*";
            Response.Headers["Cache-Control"] = "public, max-age=3600";

            return File(bytes, contentType);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ proxy-asset error for {url}: {ex.Message}");
            // ✅ For JS files return empty JS, not HTML error
            if (url.EndsWith(".js") || url.Contains(".js?"))
                return Content($"/* proxy error: {ex.Message} */", "application/javascript");
            return StatusCode(500);
        }
    }
    [HttpGet("helpdesk/dashboard-count")]
    public async Task<IActionResult> GetHelpdeskDashboardCount(
   [FromQuery] string time_filter = "monthly",
   [FromQuery] string? month = null,
   [FromQuery] string? date = null)
    {
        try
        {
            var baseUrl = _config["HelpdeskApi:BaseUrl"]?.TrimEnd('/');
            var clientId = _config["HelpdeskApi:ClientId"];
            var clientSecret = _config["HelpdeskApi:ClientSecretKey"];

            // ✅ Get JWT token (cached after first call)
            var (_, _) = await GetHelpdeskSession();

            if (string.IsNullOrEmpty(_cachedJwtToken))
            {
                Console.WriteLine("❌ No JWT token available");
                return StatusCode(503, new { error = "Could not authenticate with helpdesk" });
            }

            using var client = new HttpClient();
            client.DefaultRequestHeaders.Add("Client-ID", clientId);
            client.DefaultRequestHeaders.Add("Client-Secret-Key", clientSecret);
            client.DefaultRequestHeaders.Add("Accept", "application/json");
            client.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0");

            // ✅ Add Bearer token — this is the missing piece
            client.DefaultRequestHeaders.Authorization =
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _cachedJwtToken);

            var targetMonth = month ?? DateTime.Today.ToString("MM");
            var targetDate = date ?? DateTime.Today.ToString("yyyy-MM-dd");

            string url;
            if (time_filter == "monthly")
                url = $"{baseUrl}/helpdesk/api/tickets/admindashboard/count/?time_filter=monthly&month={targetMonth}";
            else
                url = $"{baseUrl}/helpdesk/api/tickets/admindashboard/count/?time_filter={time_filter}&date={targetDate}";

            Console.WriteLine($"🔵 Helpdesk URL: {url}");
            Console.WriteLine($"🔵 Using token: {_cachedJwtToken?[..20]}...");

            var response = await client.GetAsync(url);
            var content = await response.Content.ReadAsStringAsync();

            Console.WriteLine($"🔵 Status: {response.StatusCode}");
            Console.WriteLine($"🔵 Response: {content}");

            // ✅ If 401, token may have expired — clear cache and retry once
            if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized)
            {
                Console.WriteLine("⚠️ Token expired, refreshing...");
                _cachedJwtToken = null;
                _cookieExpiry = DateTime.MinValue;

                await GetHelpdeskSession();

                if (!string.IsNullOrEmpty(_cachedJwtToken))
                {
                    client.DefaultRequestHeaders.Authorization =
                        new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _cachedJwtToken);
                    response = await client.GetAsync(url);
                    content = await response.Content.ReadAsStringAsync();
                    Console.WriteLine($"🔵 Retry status: {response.StatusCode}");
                }
            }

            if (!response.IsSuccessStatusCode)
                return StatusCode((int)response.StatusCode, new { error = content });

            return Content(content, "application/json");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Helpdesk error: {ex.Message}");
            return StatusCode(500, new { error = ex.Message });
        }
    }
    [HttpDelete("build-documents/{id}")]
    public async Task<IActionResult> DeleteBuildDocument(int id)
    {
        var success = await _repo.DeleteBuildDocumentAsync(id);
        if (!success) return NotFound();
        return Ok(new { message = "Document deleted" });
    }
    [HttpGet("debug/claims")]
    public IActionResult DebugClaims()
    {
        var claims = User.Claims.Select(c => new { c.Type, c.Value });
        return Ok(claims);
    }

    [HttpPut("tickets/{ticketId}/deactivate")]
    public async Task<IActionResult> DeactivateTicket(int ticketId, [FromBody] DeactivateTicketRequest request)
    {
        var success = await _repo.DeactivateTicketAsync(ticketId, request.Reason, GetCurrentUser(), GetCurrentUserId());
        if (!success) return NotFound();
        return Ok(new { message = "Ticket deactivated successfully" });
    }

    [HttpPut("tickets/{ticketId}/activate")]
    public async Task<IActionResult> ActivateTicket(int ticketId)
    {
        var success = await _repo.ActivateTicketAsync(ticketId, GetCurrentUser(), GetCurrentUserId());
        if (!success) return NotFound();
        return Ok(new { message = "Ticket activated successfully" });
    }




    [HttpPut("tickets/{ticketId}/build-no")]
    public async Task<IActionResult> UpdateBuildNo(int ticketId, [FromBody] UpdateBuildNoRequest request)
    {
        var success = await _repo.UpdateBuildNoAsync(ticketId, request.BuildNo, GetCurrentUser(), GetCurrentUserId());
        if (!success) return NotFound();
        return Ok(new { message = "Build No updated successfully" });
    }

    [HttpPut("tickets/{ticketId}/planned-date")]
    public async Task<IActionResult> UpdatePlannedDate(int ticketId, [FromBody] UpdatePlannedDateRequest request)
    {
        var success = await _repo.UpdatePlannedDateAsync(ticketId, request.PlannedDate, GetCurrentUser(), GetCurrentUserId());
        if (!success) return NotFound();
        return Ok(new { message = "Planned Date updated successfully" });
    }

    [HttpPut("tickets/{ticketId}/build-date")]
    public async Task<IActionResult> UpdateBuildDate(int ticketId, [FromBody] UpdateBuildDateRequest request)
    {
        var success = await _repo.UpdateBuildDateAsync(ticketId, request.BuildDate, GetCurrentUser(), GetCurrentUserId());
        if (!success) return NotFound();
        return Ok(new { message = "Build Date updated successfully" });
    }
    [HttpPost("tickets")]
    public async Task<IActionResult> CreateTicket([FromBody] CreateTicketRequest request)
    {
        try
        {
            var createdBy = GetCurrentUser();
            var createdById = GetCurrentUserId();

            if (string.IsNullOrEmpty(request.Title))
                return BadRequest(new { error = "Title is required" });

            var newId = await _repo.CreateTicketAsync(request, createdBy, createdById);
            if (newId <= 0)
                return StatusCode(500, new { error = "Failed to create ticket" });

            return Ok(new { id = newId, message = "Ticket created successfully" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message, inner = ex.InnerException?.Message });
        }
    }
    private string GetCurrentUser() =>
    User.FindFirst(ClaimTypes.Name)?.Value ?? "System";

    private int? GetCurrentUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier);
        return claim != null ? int.Parse(claim.Value) : null;
    }



    // ✅ ADD THIS REQUEST MODEL (can be inside same file or separate)
    public class UpdateReleaseNoteRequest
    {
        public string ReleaseNote { get; set; } = "";
    }

    public class UpdateStatusRequest
    {
        public int StatusId { get; set; }
        public string StatusName { get; set; } = string.Empty;
    }
    public class UpdateAssignedUserRequest
    {
        public int UserId { get; set; }
    }
    public class UpdateBuildNoRequest
    {
        public string BuildNo { get; set; } = string.Empty;
    }

    public class UpdatePlannedDateRequest
    {
        public DateTime? PlannedDate { get; set; }
    }

    public class UpdateBuildDateRequest
    {
        public DateTime? BuildDate { get; set; }
    }
    public class DeactivateTicketRequest
    {
        public string Reason { get; set; } = string.Empty;
    }
}