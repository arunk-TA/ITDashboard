using ITDashboard.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Text;
using System.Text.Json;

namespace ITDashboard.API.Controllers;

[AllowAnonymous]
[ApiController]
[Route("[controller]")]
public class MOHController : ControllerBase
{
    private readonly MOHService _mohService;
    private readonly IConfiguration _config;
    private readonly ILogger<MOHController> _logger;

    public MOHController(
        MOHService mohService,
        IConfiguration config,
        ILogger<MOHController> logger)
    {
        _mohService = mohService;
        _config = config;
        _logger = logger;
    }

    [HttpGet("proxy")]
    public async Task<IActionResult> Proxy([FromQuery] string path = "/approvalDashboard")
    {
        try
        {
            var targetPath = string.IsNullOrEmpty(path) ? "/approvalDashboard" : path;
            if (!targetPath.StartsWith("/"))
                targetPath = "/" + targetPath;

            var response = await _mohService.ProxyRequestAsync(targetPath, HttpMethod.Get);

            var bytes = await response.Content.ReadAsByteArrayAsync();

            string content;
            if (response.Content.Headers.ContentEncoding.Contains("gzip") ||
                response.Content.Headers.ContentEncoding.Contains("br") ||
                response.Content.Headers.ContentEncoding.Contains("deflate"))
            {
                content = await _mohService.GetDecompressedContentAsync(response);
                bytes = Encoding.UTF8.GetBytes(content);
            }
            else
            {
                content = Encoding.UTF8.GetString(bytes);
            }

            if (_mohService.IsHtmlResponse(bytes) || content.Contains("<html"))
            {
                var token = await _mohService.GetTokenAsync();
                content = InjectScript(content, token ?? "", MOHService.CachedLoginResponse ?? "");

                Response.Headers.Remove("X-Frame-Options");
                Response.Headers.Remove("Content-Security-Policy");

                return Content(content, "text/html; charset=utf-8");
            }

            var contentType = response.Content.Headers.ContentType?.MediaType ?? "application/octet-stream";
            return File(bytes, contentType);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "MOH Proxy error");
            return StatusCode(500, $"<html><body><h3>Error: {ex.Message}</h3></body></html>");
        }
    }

    [HttpGet("token")]
    public async Task<IActionResult> GetToken()
    {
        var token = await _mohService.GetTokenAsync();
        if (string.IsNullOrEmpty(token))
            return StatusCode(500, new { error = "Could not get MOH token" });

        return Ok(new { token });
    }

    [HttpGet("debug-login")]
    public async Task<IActionResult> DebugLogin()
    {
        var baseUrl = _config["MohApi:BaseUrl"]?.TrimEnd('/');
        var clientId = _config["MohApi:ClientId"];
        var clientSecret = _config["MohApi:ClientSecretKey"];
        var username = _config["MohApi:Username"];
        var password = _config["MohApi:Password"];

        var result = new Dictionary<string, object>();

        using var client = new HttpClient();
        client.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0");
        client.DefaultRequestHeaders.Add("Accept", "application/json");
        client.DefaultRequestHeaders.Add("Client-ID", clientId);
        client.DefaultRequestHeaders.Add("Client-Secret-Key", clientSecret);

        var loginData = new { username, password };
        var json = JsonSerializer.Serialize(loginData);

        string[] tokenUrls =
        {
            $"{baseUrl}/api/auth/login/",
            $"{baseUrl}/api/login/",
            $"{baseUrl}/api/token/",
            $"{baseUrl}/api/user/login/",
            $"{baseUrl}/auth/login/",
            $"{baseUrl}/helpdesk/api/login/",
        };

        foreach (var url in tokenUrls)
        {
            try
            {
                var content = new StringContent(json, Encoding.UTF8, "application/json");
                var response = await client.PostAsync(url, content);
                var responseText = await response.Content.ReadAsStringAsync();
                result[url] = new
                {
                    status = response.StatusCode.ToString(),
                    response = responseText[..Math.Min(300, responseText.Length)]
                };
            }
            catch (Exception ex)
            {
                result[url] = new { error = ex.Message };
            }
        }

        return Ok(result);
    }

    [HttpGet("debug-login-full")]
    public async Task<IActionResult> DebugLoginFull()
    {
        var baseUrl = _config["MohApi:BaseUrl"]?.TrimEnd('/');
        var clientId = _config["MohApi:ClientId"];
        var clientSecret = _config["MohApi:ClientSecretKey"];
        var username = _config["MohApi:Username"];
        var password = _config["MohApi:Password"];

        using var client = new HttpClient();
        client.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0");
        client.DefaultRequestHeaders.Add("Accept", "application/json");
        client.DefaultRequestHeaders.Add("Client-ID", clientId);
        client.DefaultRequestHeaders.Add("Client-Secret-Key", clientSecret);

        var loginData = new { username, password };
        var json = JsonSerializer.Serialize(loginData);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        var response = await client.PostAsync($"{baseUrl}/api/login/", content);
        var responseText = await response.Content.ReadAsStringAsync();

        return Content(responseText, "application/json");
    }

    [HttpGet("proxy-api")]
    [HttpPost("proxy-api")]
    [HttpPut("proxy-api")]
    [HttpDelete("proxy-api")]
    public async Task<IActionResult> ProxyApi([FromQuery] string path)
    {
        try
        {
            if (string.IsNullOrEmpty(path))
                return BadRequest(new { error = "Missing path parameter" });

            _logger.LogInformation($"🔄 ===== PROXY API CALL ===== Path: {path}");

            if (!path.StartsWith("/"))
                path = "/" + path;

            var upstreamPath = path;
            _logger.LogInformation($"🔄 Upstream path: {upstreamPath}");

            var method = Request.Method.ToUpper() switch
            {
                "POST" => HttpMethod.Post,
                "PUT" => HttpMethod.Put,
                "DELETE" => HttpMethod.Delete,
                _ => HttpMethod.Get
            };

            string? body = null;
            if (method == HttpMethod.Post || method == HttpMethod.Put)
            {
                using var reader = new StreamReader(Request.Body);
                body = await reader.ReadToEndAsync();
            }

            var response = await _mohService.ProxyRequestAsync(upstreamPath, method, body);
            var content = await response.Content.ReadAsStringAsync();
            if (content.Contains("/media/%5Bnull%5D") || content.Contains("/media/[null]"))
            {
                content = content
                    .Replace("\"http://stemzclock.stemzglobal.com/media/%5Bnull%5D\"", "null")
                    .Replace("\"http://stemzclock.stemzglobal.com/media/[null]\"", "null")
                    .Replace("\"https://stemzclock.stemzglobal.com/media/%5Bnull%5D\"", "null")
                    .Replace("\"https://stemzclock.stemzglobal.com/media/[null]\"", "null");
            }
            _logger.LogInformation($"📡 Response for {upstreamPath}: {response.StatusCode}");

            if (response.Content.Headers.ContentType?.MediaType == "application/json" ||
                content.TrimStart().StartsWith("{") || content.TrimStart().StartsWith("["))
            {
                _logger.LogInformation($"📦 Response body (first 200 chars): {content.Substring(0, Math.Min(200, content.Length))}");
                return Content(content, "application/json");
            }

            var bytes = Encoding.UTF8.GetBytes(content);
            var contentType = response.Content.Headers.ContentType?.MediaType ?? "application/octet-stream";
            return File(bytes, contentType);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"❌ MOH proxy-api error for path: {path}");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpGet("proxy-asset")]
    [HttpPost("proxy-asset")]
    public async Task<IActionResult> ProxyAsset([FromQuery] string url)
    {
        if (string.IsNullOrWhiteSpace(url) || (!url.StartsWith("http://") && !url.StartsWith("https://")))
        {
            _logger.LogWarning($"Rejected bad MOH URL: '{url}'");
            return BadRequest("Invalid URL");
        }

        try
        {
            var bytes = await _mohService.ProxyAssetAsync(url);
            var contentType = _mohService.GetContentType(url, bytes);

            if ((url.EndsWith(".js") || url.Contains(".js?")) && _mohService.IsHtmlResponse(bytes))
            {
                _logger.LogWarning($"MOH upstream returned HTML for JS: {url}");
                return Content("/* MOH proxy: upstream returned HTML for this asset */", "application/javascript");
            }

            Response.Headers["Access-Control-Allow-Origin"] = "*";
            Response.Headers["Access-Control-Allow-Headers"] = "*";
            Response.Headers["Cache-Control"] = "public, max-age=3600";

            return File(bytes, contentType);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"MOH proxy-asset error for {url}");
            if (url.EndsWith(".js") || url.Contains(".js?"))
                return Content($"/* MOH proxy error: {ex.Message} */", "application/javascript");
            return StatusCode(500);
        }
    }
     
    private string InjectScript(string content, string token, string loginResponseJson)
    {
        if (string.IsNullOrEmpty(token))
            return content;

        var baseUrl = _config["MohApi:BaseUrl"] ?? "https://stemzclock.stemzglobal.com";
        var routePrefix = _config["AppSettings:RoutePrefix"] ?? "";
        var prefix = string.IsNullOrEmpty(routePrefix) ? "" : $"/{routePrefix}";
        var apiEndpoint = $"{prefix}/MOH/proxy-api";
        var assetEndpoint = $"{prefix}/MOH/proxy-asset";

        // Safely re-serialize the cached raw login response
        string loginResponseForJs = "{}";
        try
        {
            using var doc = JsonDocument.Parse(string.IsNullOrEmpty(loginResponseJson) ? "{}" : loginResponseJson);
            loginResponseForJs = JsonSerializer.Serialize(doc.RootElement);
        }
        catch (Exception ex)
        {
            _logger.LogWarning($"Could not parse cached login response for injection: {ex.Message}");
        }

        // Rewrite relative src="/..." and href="/..."
        content = System.Text.RegularExpressions.Regex.Replace(
            content,
            @"(src|href)=""(/(?!/)[^""]*)""",
            m =>
            {
                var attr = m.Groups[1].Value;
                var relPath = m.Groups[2].Value;
                var absoluteTarget = baseUrl.TrimEnd('/') + relPath;
                var rewritten = $"{assetEndpoint}?url={Uri.EscapeDataString(absoluteTarget)}";
                return $@"{attr}=""{rewritten}""";
            });

        var mainScript = $@"
<script>
(function() {{

    // =========================
    // ROUTE REWRITE
    // =========================
    var alreadyRedirected = false;

    function rewriteUrl(url) {{
        if (!alreadyRedirected && typeof url === 'string' &&
            url.indexOf('/Dashboard') !== -1 &&
            url.indexOf('/approvalDashboard') === -1) {{
            alreadyRedirected = true;
            return '/approvalDashboard';
        }}
        return url;
    }}

    var origPushState = history.pushState;
    var origReplaceState = history.replaceState;

    history.pushState = function(state, title, url) {{
        return origPushState.call(this, state, title, rewriteUrl(url));
    }};

    history.replaceState = function(state, title, url) {{
        return origReplaceState.call(this, state, title, rewriteUrl(url));
    }};

    try {{
        origReplaceState.call(history, null, '', '/approvalDashboard');
    }} catch(e) {{ }}

    // =========================
    // TOKEN STORAGE
    // =========================
    var API_ENDPOINT = '{apiEndpoint}';
    var BASE_URL = '{baseUrl}';
    var JWT_TOKEN = {JsonSerializer.Serialize(token)};
    var LOGIN_DATA = {loginResponseForJs};

    try {{
        var accessVal = LOGIN_DATA.access || LOGIN_DATA.access_token || JWT_TOKEN;

        if (accessVal) {{
            localStorage.setItem('access_token', accessVal);
            localStorage.setItem('token', accessVal);
        }}

        var refreshVal = LOGIN_DATA.refresh || LOGIN_DATA.refresh_token;
        if (refreshVal) {{
            localStorage.setItem('refresh_token', refreshVal);
        }}

        localStorage.setItem('roles', JSON.stringify(LOGIN_DATA.roles || []));
        localStorage.setItem('user', JSON.stringify(LOGIN_DATA.user || {{}}));
        localStorage.setItem('userEntity', JSON.stringify(LOGIN_DATA.userEntity || LOGIN_DATA.user || {{}}));

        localStorage.setItem('session_active', 'true');
        localStorage.setItem('session_timestamp', new Date().toISOString());
    }} catch(e) {{ }}

    // =========================
    // API REWRITE
    // =========================
    function rewriteApiUrl(url) {{
        if (typeof url !== 'string') return url;

        if (url.indexOf(BASE_URL) === 0) {{
            return API_ENDPOINT + '?path=' + encodeURIComponent(url.substring(BASE_URL.length));
        }}

        if (url.indexOf('/api/') === 0) {{
            return API_ENDPOINT + '?path=' + encodeURIComponent(url);
        }}

        return url;
    }}

    var originalFetch = window.fetch;

    window.fetch = function(url, options) {{
        if (typeof url === 'string' && url.includes('wsm.sessionDeactivated')) {{
            return Promise.resolve(new Response(JSON.stringify({{ status: 'active' }}), {{
                status: 200,
                headers: {{ 'Content-Type': 'application/json' }}
            }}));
        }}

        if (typeof url === 'string') {{
            url = rewriteApiUrl(url);
        }}

        return originalFetch.call(this, url, options);
    }};

    var originalXHROpen = XMLHttpRequest.prototype.open;

    XMLHttpRequest.prototype.open = function(method, url) {{
        arguments[1] = rewriteApiUrl(url);
        return originalXHROpen.apply(this, arguments);
    }};

    // =========================
    // UI CLEANUP
    // =========================

    var style = document.createElement('style');
    style.innerHTML = `
        .MuiAppBar-root,
        .MuiToolbar-root {{
            display: none !important;
        }}

        .MuiDrawer-root,
        .MuiDrawer-paper {{
            display: none !important;
        }}

        .MuiBox-root,
        .MuiContainer-root,
        main {{
            margin-left: 0 !important;
            padding-left: 0 !important;
            margin-top: 0 !important;
            padding-top: 0 !important;
            width: 100% !important;
        }}

        html, body {{
            margin: 0 !important;
            padding: 0 !important;
        }}
    `;
    document.head.appendChild(style);

    function removePanels() {{
        document.querySelectorAll('.MuiPaper-root').forEach(function(card) {{
            var text = (card.innerText || '').trim();
            if (text.indexOf('Platforms') === 0 || text.indexOf('Recent Pending Requests') === 0) {{
                card.remove();
            }}
        }});
    }}
function expandApprovalStatusOverview() {{
        document.querySelectorAll('h6').forEach(function(h6) {{
            var text = (h6.textContent || '').trim();
            if (text !== 'Approval Status Overview') return;

            var card = h6.closest('.MuiPaper-root');
            if (!card) return;

            // Force the card itself to fill its row
            card.style.width = '100%';
            card.style.maxWidth = '100%';
            card.style.flex = '1 1 100%';

            // Force the grid/flex item wrapping the card to also span full width
            var gridItem = card.parentElement;
            if (gridItem) {{
                gridItem.style.flexBasis = '100%';
                gridItem.style.maxWidth = '100%';
                gridItem.style.width = '100%';
                gridItem.style.flex = '1 1 100%';
            }}

            // ApexCharts renders at a fixed pixel width on load — force it to
            // recalculate now that its container is wider
            if (window.ApexCharts) {{
                setTimeout(function() {{
                    window.dispatchEvent(new Event('resize'));
                }}, 100);
            }}
        }});
    }}

    function runCleanup() {{
        removePanels();
        expandApprovalStatusOverview();
    }}
    

    if (document.readyState === 'loading') {{
        document.addEventListener('DOMContentLoaded', runCleanup);
    }} else {{
        runCleanup();
    }}

    // Repeat cleanup on an interval to catch late/async-rendered panels
    var cleanupInterval = setInterval(runCleanup, 400);
    setTimeout(function() {{ clearInterval(cleanupInterval); }}, 20000);

}})();
</script>";
        if (content.Contains("<head>", StringComparison.OrdinalIgnoreCase))
        {
            content = content.Replace("<head>", "<head>" + mainScript, StringComparison.OrdinalIgnoreCase);
        }
        else if (content.Contains("<html", StringComparison.OrdinalIgnoreCase))
        {
            content = content.Replace("<html", "<html><head>" + mainScript + "</head>", StringComparison.OrdinalIgnoreCase);
        }
        else
        {
            content = mainScript + content;
        }

        return content;
    }
    [HttpGet("dashboard/counts")]
    public async Task<IActionResult> GetTaskCounts([FromQuery] int userId)
    {
        var response = await _mohService.ProxyRequestAsync(
            $"/api/task/tasks/counts/?user_id={userId}", HttpMethod.Get);
        var content = await response.Content.ReadAsStringAsync();
        return Content(content, "application/json");
    }

    [HttpGet("dashboard/approvals")]
    public async Task<IActionResult> GetPendingApprovals([FromQuery] int userId)
    {
        var response = await _mohService.ProxyRequestAsync(
            $"/api/task/tasks/approvals/?user_id={userId}", HttpMethod.Get);
        var content = await response.Content.ReadAsStringAsync();
        return Content(content, "application/json");
    }

    [HttpGet("dashboard/approval-status-overview")]
    public async Task<IActionResult> GetApprovalStatusOverview([FromQuery] int userId, [FromQuery] string view = "monthly")
    {
        var response = await _mohService.ProxyRequestAsync(
            $"/api/task/tasks/approval-status-overview/?user_id={userId}&view={view}", HttpMethod.Get);
        var content = await response.Content.ReadAsStringAsync();
        return Content(content, "application/json");
    }

    [HttpGet("dashboard/platform-wise-users")]
    public async Task<IActionResult> GetPlatformWiseUsers([FromQuery] int approverUserId)
    {
        var response = await _mohService.ProxyRequestAsync(
            $"/api/task/tasks/platform-wise-users/?approver_user_id={approverUserId}", HttpMethod.Get);
        var content = await response.Content.ReadAsStringAsync();
        return Content(content, "application/json");
    }

    [HttpGet("dashboard/time-distribution")]
    public async Task<IActionResult> GetTimeDistribution([FromQuery] int userId, [FromQuery] string view = "monthly")
    {
        var response = await _mohService.ProxyRequestAsync(
            $"/api/task/tasks/member/time-distribution/?user_id={userId}&view={view}", HttpMethod.Get);
        var content = await response.Content.ReadAsStringAsync();
        return Content(content, "application/json");
    }

    [HttpGet("dashboard/top-platforms")]
    public async Task<IActionResult> GetTopPlatforms([FromQuery] int userId, [FromQuery] string view = "monthly")
    {
        var response = await _mohService.ProxyRequestAsync(
            $"/api/task/tasks/top-platforms/?user_id={userId}&view={view}", HttpMethod.Get);
        var content = await response.Content.ReadAsStringAsync();
        return Content(content, "application/json");
    }
    [HttpGet("dashboard/profile")]
    public async Task<IActionResult> GetProfile()
    {
        var response = await _mohService.ProxyRequestAsync("/api/task/profile/", HttpMethod.Get);
        var content = await response.Content.ReadAsStringAsync();

        if (content.Contains("/media/%5Bnull%5D") || content.Contains("/media/[null]"))
        {
            content = content
                .Replace("\"http://stemzclock.stemzglobal.com/media/%5Bnull%5D\"", "null")
                .Replace("\"http://stemzclock.stemzglobal.com/media/[null]\"", "null")
                .Replace("\"https://stemzclock.stemzglobal.com/media/%5Bnull%5D\"", "null")
                .Replace("\"https://stemzclock.stemzglobal.com/media/[null]\"", "null");
        }

        return Content(content, "application/json");
    }
    [HttpGet("debug-api")]
    public IActionResult DebugApi()
    {
        return Ok(new
        {
            message = "API proxy is working",
            timestamp = DateTime.UtcNow,
            baseUrl = _config["MohApi:BaseUrl"]
        });
    }
}