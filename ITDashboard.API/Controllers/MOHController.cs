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

    // Cache login response for user data injection
    private static string? _cachedLoginResponse = null;

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
                // ✅ Get token AND full login response for user data
                var token = await _mohService.GetTokenAsync();
                content = InjectScript(content, token ?? "");

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

            if (!path.StartsWith("/"))
                path = "/" + path;

            _logger.LogInformation($"Proxying API call to: {path}");

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

            var response = await _mohService.ProxyRequestAsync(path, method, body);

            Response.Headers["Access-Control-Allow-Origin"] = "*";
            Response.Headers["Access-Control-Allow-Headers"] = "*";
            Response.Headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS";
            Response.Headers["Access-Control-Expose-Headers"] = "*";

            var content = await response.Content.ReadAsStringAsync();

            _logger.LogDebug($"Response status: {response.StatusCode}");

            if (response.Content.Headers.ContentType?.MediaType == "application/json" ||
                content.TrimStart().StartsWith("{") || content.TrimStart().StartsWith("["))
            {
                return Content(content, "application/json");
            }

            var bytes = Encoding.UTF8.GetBytes(content);
            var contentType = response.Content.Headers.ContentType?.MediaType ?? "application/octet-stream";
            return File(bytes, contentType);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"MOH proxy-api error for path: {path}");
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

    // ✅ NOW ACCEPTS token parameter — fixes "JWT_TOKEN is not defined"
    private string InjectScript(string content, string token)
    {
        var baseUrl = _config["MohApi:BaseUrl"] ?? "https://stemzclock.stemzglobal.com";
        var clientId = _config["MohApi:ClientId"] ?? "CID-5992CE1D6D51";
        var clientSecret = _config["MohApi:ClientSecretKey"] ?? "QnWYDw-h99kFaCfuhURWGEkwbzZmVvG1JsQOoR1JwAjHiOEtf5Js6g";

        // ✅ Dynamically set prefix based on RoutePrefix config
        var routePrefix = _config["AppSettings:RoutePrefix"] ?? "";
        var prefix = string.IsNullOrEmpty(routePrefix) ? "" : $"/{routePrefix}";

        // ✅ Works on both local (no prefix) and UAT (/api prefix)
        var assetEndpoint = $"{prefix}/moh/proxy-asset";
        var apiEndpoint = $"{prefix}/moh/proxy-api";


        // ✅ Get user data from cached login response
        var userId = "2";
        var userName = "Nandakumar R";
        var userEmail = "nandakumarr@stemzglobal.com";

        var loginResponse = MOHService.CachedLoginResponse;

        try
        {
            if (!string.IsNullOrEmpty(loginResponse))
            {
                var loginJson = JsonDocument.Parse(loginResponse);
                if (loginJson.RootElement.TryGetProperty("user", out var userEl))
                {
                    userId = userEl.TryGetProperty("id", out var id) ? id.ToString() : userId;
                    userName = userEl.TryGetProperty("name", out var name) ? name.GetString() ?? userName : userName;
                    userEmail = userEl.TryGetProperty("email", out var email) ? email.GetString() ?? userEmail : userEmail;
                }
            }
        }
        catch { /* use defaults */ }

        // ✅ Escape all values safe for JS string injection
        static string JsStr(string s) => s
            .Replace("\\", "\\\\")
            .Replace("'", "\\'")
            .Replace("\r", "\\r")
            .Replace("\n", "\\n")
            .Replace("</", "<\\/");

        var safeToken = JsStr(token);
        var safeBaseUrl = JsStr(baseUrl);
        var safeAsset = JsStr(assetEndpoint);
        var safeApi = JsStr(apiEndpoint);
        var safeId = JsStr(userId);
        var safeName = JsStr(userName);
        var safeEmail = JsStr(userEmail);

        var injectionScript = $@"
<script>
(function() {{
    // ✅ Clear stale session from any previous user
    try {{
    localStorage.setItem('access_token', JWT_TOKEN);
    localStorage.setItem('token', JWT_TOKEN);
    // ... rest of setItem calls
}} catch(e) {{}}

    var JWT_TOKEN      = '{safeToken}';
    var BASE_URL       = '{safeBaseUrl}';
    var CLIENT_ID      = '{clientId}';
    var CLIENT_SECRET  = '{clientSecret}';
    var ASSET_ENDPOINT = '{safeAsset}';
    var API_ENDPOINT   = '{safeApi}';
    var USER_DATA      = {{ id: {safeId}, name: '{safeName}', email: '{safeEmail}' }};

    console.log('🔐 MOH Proxy Initializing...');
    console.log('JWT_TOKEN length:', JWT_TOKEN ? JWT_TOKEN.length : 0);
    console.log('USER_DATA:', USER_DATA);

    // ✅ Seed localStorage with token under all possible keys the React app might check
    try {{
        localStorage.setItem('access_token', JWT_TOKEN);
        localStorage.setItem('token', JWT_TOKEN);
        localStorage.setItem('authToken', JWT_TOKEN);
        localStorage.setItem('auth_token', JWT_TOKEN);
        localStorage.setItem('jwt', JWT_TOKEN);
        localStorage.setItem('jwt_token', JWT_TOKEN);
        localStorage.setItem('user', JSON.stringify(USER_DATA));
        localStorage.setItem('user_data', JSON.stringify(USER_DATA));
        localStorage.setItem('userId', String(USER_DATA.id));
        localStorage.setItem('user_id', String(USER_DATA.id));
        console.log('✅ localStorage seeded');
    }} catch(e) {{
        console.warn('localStorage error:', e);
    }}

    function redirectToApproval() {{
        if (window.location.pathname !== '/approvalDashboard') {{
            console.log('🔄 Redirecting to approvalDashboard...');
            window.history.replaceState({{}}, '', '/approvalDashboard');
            window.dispatchEvent(new PopStateEvent('popstate', {{ state: {{}} }}));
        }}
    }}

    // Try immediately and also after a short delay for React to mount
    redirectToApproval();
    setTimeout(redirectToApproval, 500);
    setTimeout(redirectToApproval, 1500);

    // Make token available globally for XHR interceptor
    window.MOH_TOKEN = JWT_TOKEN;

    // ── Intercept fetch ──────────────────────────────────────
    var origFetch = window.fetch;
    window.fetch = function(url, opts) {{
        opts = opts || {{}};
        opts.headers = opts.headers || {{}};
        var urlStr = typeof url === 'string' ? url : (url && url.url ? url.url : '');

        var isAbsoluteMoh = urlStr.startsWith(BASE_URL);
        var isRelativeApi = urlStr.startsWith('/api/') && !urlStr.startsWith('/api/moh/');
        var isAsset = /\.(js|css|png|jpg|jpeg|ico|svg|woff|woff2|ttf|map)(\?|$)/.test(urlStr);

        if (isAbsoluteMoh || isRelativeApi) {{
            if (JWT_TOKEN) opts.headers['Authorization'] = 'Bearer ' + JWT_TOKEN;
            opts.headers['Client-ID'] = CLIENT_ID;
            opts.headers['Client-Secret-Key'] = CLIENT_SECRET;

            var path = isAbsoluteMoh ? urlStr.replace(BASE_URL, '') : urlStr;
            try {{
                var parsed = new URL(urlStr, BASE_URL);
                path = parsed.pathname + parsed.search;
            }} catch(e) {{}}

            url = API_ENDPOINT + '?path=' + encodeURIComponent(path);
            console.log('🔄 Proxying API:', urlStr, '→', url);
            return origFetch.call(this, url, opts);
        }}

        // Asset rewriting
        if (isAsset && urlStr.startsWith('/') && !urlStr.startsWith('/moh/')) {{
            url = ASSET_ENDPOINT + '?url=' + encodeURIComponent(BASE_URL + urlStr);
        }} else if (isAbsoluteMoh) {{
            url = ASSET_ENDPOINT + '?url=' + encodeURIComponent(urlStr);
        }}

        if (JWT_TOKEN && !opts.headers['Authorization'])
            opts.headers['Authorization'] = 'Bearer ' + JWT_TOKEN;

        return origFetch.call(this, url, opts);
    }};

    // ── Intercept XHR ────────────────────────────────────────
    var origOpen = XMLHttpRequest.prototype.open;
    var origSend = XMLHttpRequest.prototype.send;
    var origSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;

    XMLHttpRequest.prototype.open = function(method, url) {{
        var urlStr = typeof url === 'string' ? url : '';
        this._mohHeaders = {{}};

        var isAbsoluteMoh = urlStr.startsWith(BASE_URL);
        var isRelativeApi = urlStr.startsWith('/api/') && !urlStr.startsWith('/api/moh/');
        var isAsset = /\.(js|css|png|jpg|jpeg|ico|svg|woff|woff2|ttf|map)(\?|$)/.test(urlStr);

        if (isAbsoluteMoh || isRelativeApi) {{
            var path = isAbsoluteMoh ? urlStr.replace(BASE_URL, '') : urlStr;
            try {{
                var parsed = new URL(urlStr, BASE_URL);
                path = parsed.pathname + parsed.search;
            }} catch(e) {{}}
            url = API_ENDPOINT + '?path=' + encodeURIComponent(path);
            this._mohHeaders['Authorization'] = 'Bearer ' + JWT_TOKEN;
            this._mohHeaders['Client-ID'] = CLIENT_ID;
            this._mohHeaders['Client-Secret-Key'] = CLIENT_SECRET;
            console.log('🔄 XHR proxying:', urlStr, '→', url);
        }} else if (isAsset && urlStr.startsWith('/') && !urlStr.startsWith('/moh/')) {{
            url = ASSET_ENDPOINT + '?url=' + encodeURIComponent(BASE_URL + urlStr);
        }} else if (isAbsoluteMoh && isAsset) {{
            url = ASSET_ENDPOINT + '?url=' + encodeURIComponent(urlStr);
        }}

        return origOpen.apply(this, [method, url].concat(Array.prototype.slice.call(arguments, 2)));
    }};

    XMLHttpRequest.prototype.setRequestHeader = function(header, value) {{
        if (this._mohHeaders) this._mohHeaders[header] = value;
        return origSetRequestHeader.call(this, header, value);
    }};

    XMLHttpRequest.prototype.send = function(body) {{
        if (this._mohHeaders) {{
            for (var key in this._mohHeaders) {{
                try {{ origSetRequestHeader.call(this, key, this._mohHeaders[key]); }} catch(e) {{}}
            }}
        }}
        return origSend.call(this, body);
    }};

    console.log('✅ MOH Proxy initialized');

    // ─── TRIM/CLEANUP FUNCTIONS ─────────────────────────────────
    function trimHeaderSection() {{
        // Find and completely remove header containers
        var headerSelectors = [
            'header',
            '.MuiAppBar-root',
            '.MuiToolbar-root',
            '[class*=""header""]',
            '[class*=""Header""]',
            '[class*=""navbar""]',
            '[class*=""Navbar""]',
            '[class*=""topbar""]',
            '[class*=""TopBar""]',
            '[class*=""appbar""]',
            '[class*=""AppBar""]',
            '[class*=""toolbar""]',
            '[class*=""Toolbar""]'
        ];
        
        headerSelectors.forEach(function(selector) {{
            var elements = document.querySelectorAll(selector);
            elements.forEach(function(el) {{
                var text = (el.innerText || el.textContent || '').trim();
                if (text.includes('Stemz Clock') || text.includes('Nandakumar R') || text.includes('Approver')) {{
                    el.remove();
                    console.log('🗑️ Removed header element');
                }}
            }});
        }});

        // Find and remove any parent containers that might contain the header
        var allElements = document.querySelectorAll('div, section, nav, header');
        allElements.forEach(function(el) {{
            var text = (el.innerText || el.textContent || '').trim();
            if ((text.includes('Stemz Clock') || text.includes('Nandakumar R') || text.includes('Approver')) && 
                text.length < 200) {{
                el.remove();
                console.log('🗑️ Removed header container');
            }}
        }});

        // Remove the entire AppBar container
        var appBarContainers = document.querySelectorAll('.MuiAppBar-root, [class*=""AppBar""], [class*=""appbar""]');
        appBarContainers.forEach(function(el) {{
            el.remove();
            console.log('🗑️ Removed AppBar container');
        }});

        // Hide user info section
        var userElements = document.querySelectorAll('[class*=""user""], [class*=""User""], [class*=""profile""], [class*=""Profile""], [class*=""avatar""], [class*=""Avatar""]');
        userElements.forEach(function(el) {{
            var text = (el.innerText || el.textContent || '').trim();
            if (text.includes('Nandakumar R') || text.includes('Approver')) {{
                el.style.display = 'none';
                console.log('🙈 Hidden user/profile section');
            }}
        }});
    }}

    // ── Hide unwanted sections ────────────────────────────────
    var _mohCleanupDone = false;

    function hideUnwantedSections() {{
        // Find all section headings/cards and hide by text content
        var allElements = document.querySelectorAll('*');
        
        for (var i = 0; i < allElements.length; i++) {{
            var el = allElements[i];
            
            // Skip if already hidden or if it has many children (container)
            if (el.children.length > 10) continue;
            
            var text = el.innerText || el.textContent || '';
            var trimmed = text.trim();
            
            // Hide 'Recent Pending Requests' card
            if (trimmed === 'Recent Pending Requests') {{
                let card = el.closest('.MuiCard-root');
                if (card) {{
                    card.style.display = 'none';
                    console.log('🙈 Hidden entire Recent Pending Requests card');
                }}
            }}
            // Hide 'Platforms' card
            if (trimmed === 'Platforms') {{
                var card = el.closest('[class*=""card""], [class*=""Card""], [class*=""widget""], [class*=""Widget""], [class*=""section""], [class*=""col""], [class*=""grid""]');
                if (card) {{
                    card.style.display = 'none';
                    console.log('🙈 Hidden: Platforms');
                }}
            }}
        }}

        // Make Approval Status Overview take full width
        var approvalElements = document.querySelectorAll('*');
        for (var j = 0; j < approvalElements.length; j++) {{
            var el = approvalElements[j];
            var text = (el.innerText || el.textContent || '').trim();
            if (text === 'Approval Status Overview') {{
                var card = el.closest('[class*=""card""], [class*=""Card""], [class*=""widget""], [class*=""Widget""], [class*=""col""], [class*=""grid""]');
                if (card) {{
                    card.style.width = '100%';
                    card.style.flex = '1 1 100%';
                    card.style.maxWidth = '100%';
                    console.log('📐 Expanded: Approval Status Overview to full width');
                }}
            }}
        }}
    }}

    function expandApprovalStatusOverview() {{
        document.querySelectorAll('h6').forEach(function(el) {{
            var text = (el.innerText || el.textContent || '').trim();
            if (text === 'Approval Status Overview') {{
                var card = el.closest('.MuiCard-root');
                if (!card) return;
                var gridItem = card.parentElement;
                gridItem.style.flex = '0 0 100%';
                gridItem.style.maxWidth = '100%';
                gridItem.style.width = '100%';
                card.style.width = '100%';
                console.log('📐 Approval Status Overview expanded to full row');
            }}
        }});
    }}

    // ── Run all cleanup functions ────────────────────────────
function removeLeftDrawer() {{

    // Remove drawer completely
    document.querySelectorAll('.MuiDrawer-root').forEach(function(el){{
        el.remove();
    }});

    document.querySelectorAll('.MuiDrawer-paper').forEach(function(el){{
        el.remove();
    }});

    // Expand main content
    document.querySelectorAll('main').forEach(function(el){{
        el.style.marginLeft = '0px';
        el.style.paddingLeft = '0px';
        el.style.width = '100%';
        el.style.maxWidth = '100%';
    }});

    // Remove MUI left offset
    document.querySelectorAll('.MuiBox-root').forEach(function(el){{

        var style = getComputedStyle(el);

        if (
            style.marginLeft === '240px' ||
            style.paddingLeft === '240px'
        ) {{
            el.style.marginLeft = '0px';
            el.style.paddingLeft = '0px';
            el.style.width = '100%';
            el.style.maxWidth = '100%';
        }}
    }});

    console.log('✅ Left drawer removed');
}}
 function removeTopWhiteSpace() {{

    // Remove browser default margin
    document.documentElement.style.margin = '0';
    document.documentElement.style.padding = '0';

    document.body.style.margin = '0';
    document.body.style.padding = '0';

    // Remove MUI top spacing
    document.querySelectorAll('.MuiBox-root').forEach(function(el){{

        var style = getComputedStyle(el);

        if (
            parseInt(style.paddingTop) > 0 ||
            parseInt(style.marginTop) > 0
        ){{
            el.style.paddingTop = '0px';
            el.style.marginTop = '0px';
        }}
    }});

    console.log('✅ Top whitespace removed');
}}

    function runCleanup() {{
        trimHeaderSection();
        hideUnwantedSections();
        expandApprovalStatusOverview();
        removeTopWhiteSpace();
        removeLeftDrawer();
    }}

    // Run after React renders
    setTimeout(runCleanup, 500);
    setTimeout(runCleanup, 1500);
    setTimeout(runCleanup, 3000);
    setTimeout(runCleanup, 5000);

    // Run after DOM is ready
    if (document.readyState === 'loading') {{
        document.addEventListener('DOMContentLoaded', function() {{
            setTimeout(runCleanup, 500);
            setTimeout(runCleanup, 1500);
            setTimeout(runCleanup, 3000);
        }});
    }} else {{
        setTimeout(runCleanup, 500);
        setTimeout(runCleanup, 1500);
        setTimeout(runCleanup, 3000);
    }}

    // MutationObserver to catch React re-renders
    var observer = new MutationObserver(function(mutations) {{
        runCleanup();
    }});
    document.addEventListener('DOMContentLoaded', function() {{
        observer.observe(document.body, {{ childList: true, subtree: true }});
    }});

    console.log('✅ MOH Proxy initialized with cleanup');
}})();
</script>";
        //content = content
        //    .Replace("src=\"/assets/", $"src=\"{assetEndpoint}?url={baseUrl}/assets/")
        //    .Replace("href=\"/assets/", $"href=\"{assetEndpoint}?url={baseUrl}/assets/")
        //    .Replace("src=\"assets/", $"src=\"{assetEndpoint}?url={baseUrl}/assets/")
        //    .Replace("href=\"assets/", $"href=\"{assetEndpoint}?url={baseUrl}/assets/")
        //    .Replace("src=\"/_next/", $"src=\"{assetEndpoint}?url={baseUrl}/_next/")
        //    .Replace("href=\"/_next/", $"href=\"{assetEndpoint}?url={baseUrl}/_next/")
        //    .Replace("src='/_next/", $"src='{assetEndpoint}?url={baseUrl}/_next/")
        //    .Replace("href='/_next/", $"href='{assetEndpoint}?url={baseUrl}/_next/");
        content = content
    .Replace("src=\"/assets/", $"src=\"{prefix}/moh/proxy-asset?url={baseUrl}/assets/")
    .Replace("href=\"/assets/", $"href=\"{prefix}/moh/proxy-asset?url={baseUrl}/assets/")
    .Replace("src=\"assets/", $"src=\"{prefix}/moh/proxy-asset?url={baseUrl}/assets/")
    .Replace("href=\"assets/", $"href=\"{prefix}/moh/proxy-asset?url={baseUrl}/assets/")
    .Replace("src=\"/_next/", $"src=\"{prefix}/moh/proxy-asset?url={baseUrl}/_next/")
    .Replace("href=\"/_next/", $"href=\"{prefix}/moh/proxy-asset?url={baseUrl}/_next/")
    .Replace("src='/_next/", $"src='{prefix}/moh/proxy-asset?url={baseUrl}/_next/")
    .Replace("href='/_next/", $"href='{prefix}/moh/proxy-asset?url={baseUrl}/_next/");

        if (content.Contains("<head>", StringComparison.OrdinalIgnoreCase))
            return content.Replace("<head>", "<head>" + injectionScript, StringComparison.OrdinalIgnoreCase);

        return injectionScript + content;
    }
}