using System.Net;
using System.Text.Json;
using System.Text;
using System.IO.Compression;

namespace ITDashboard.API.Services;

public class MOHService
{
    private readonly IConfiguration _config;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<MOHService> _logger;
    public static string? CachedLoginResponse = null;
    // Cache for token
    private static string? _cachedToken = null;
    private static DateTime _tokenExpiry = DateTime.MinValue;
    private static readonly object _lock = new object();

    public MOHService(
        IConfiguration config,
        IHttpClientFactory httpClientFactory,
        ILogger<MOHService> logger)
    {
        _config = config;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    private string BaseUrl => _config["MohApi:BaseUrl"] ?? "https://stemzclock.stemzglobal.com";
    private string ClientId => _config["MohApi:ClientId"] ?? "CID-5992CE1D6D51";
    private string ClientSecret => _config["MohApi:ClientSecretKey"] ?? "QnWYDw-h99kFaCfuhURWGEkwbzZmVvG1JsQOoR1JwAjHiOEtf5Js6g";
    private string Username => _config["MohApi:Username"] ?? "sridharang@stemzglobal.com";
    private string Password => _config["MohApi:Password"] ?? "Kodi260701!";

    public async Task<string?> GetTokenAsync()
    {
        lock (_lock)
        {
            if (!string.IsNullOrEmpty(_cachedToken) && DateTime.UtcNow < _tokenExpiry)
            {
                _logger.LogInformation("Using cached MOH token");
                return _cachedToken;
            }
        }

        try
        {
            var client = _httpClientFactory.CreateClient();
            client.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
            client.DefaultRequestHeaders.Add("Accept", "application/json, text/plain, */*");
            client.DefaultRequestHeaders.Add("Accept-Language", "en-US,en;q=0.9");
            client.DefaultRequestHeaders.Add("Connection", "keep-alive");
            client.DefaultRequestHeaders.Add("Client-ID", ClientId);
            client.DefaultRequestHeaders.Add("Client-Secret-Key", ClientSecret);

            var loginUrl = $"{BaseUrl}/api/login/";
            _logger.LogInformation($"Attempting MOH login at: {loginUrl}");

            var loginData = new { username = Username, password = Password };
            var json = JsonSerializer.Serialize(loginData);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await client.PostAsync(loginUrl, content);
            var responseText = await DecompressResponseContent(response);

            _logger.LogInformation($"MOH login response status: {response.StatusCode}");

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError($"MOH login failed: {responseText}");
                return null;
            }

            var tokenJson = JsonDocument.Parse(responseText);

            if (tokenJson.RootElement.TryGetProperty("access", out var accessToken))
            {
                var token = accessToken.GetString();
                if (!string.IsNullOrEmpty(token))
                {
                    lock (_lock)
                    {
                        _cachedToken = token;
                        _tokenExpiry = DateTime.UtcNow.AddMinutes(25);
                        CachedLoginResponse = responseText; // ✅ Cache full login response for user data
                    }
                    _logger.LogInformation("✅ MOH token obtained successfully");
                    return _cachedToken; // ✅ single return, after CachedLoginResponse is set
                }
            }

            _logger.LogError($"No 'access' field in MOH login response: {responseText}");
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "MOH token error");
            return null;
        }
    }
    public async Task<HttpResponseMessage> ProxyRequestAsync(string path, HttpMethod method, string? body = null)
    {
        var client = _httpClientFactory.CreateClient();
        client.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
        client.DefaultRequestHeaders.Add("Accept", "application/json, text/plain, */*");
        client.DefaultRequestHeaders.Add("Accept-Language", "en-US,en;q=0.9");
        client.DefaultRequestHeaders.Add("Accept-Encoding", "gzip, deflate, br");
        client.DefaultRequestHeaders.Add("Connection", "keep-alive");

        // Always add client credentials headers
        client.DefaultRequestHeaders.Add("Client-ID", ClientId);
        client.DefaultRequestHeaders.Add("Client-Secret-Key", ClientSecret);

        // IMPORTANT: Get token and add Authorization header
        var token = await GetTokenAsync();
        if (!string.IsNullOrEmpty(token))
        {
            if (token != "client_credentials_ok")
            {
                client.DefaultRequestHeaders.Authorization =
                    new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
                _logger.LogInformation("✅ Added Authorization header with token");
            }
            else
            {
                _logger.LogInformation("✅ Using client credentials (no token needed)");
            }
        }
        else
        {
            _logger.LogWarning("⚠️ No token available for request");
        }

        var targetUrl = $"{BaseUrl}{path}";
        _logger.LogInformation($"🔄 Proxying to: {targetUrl}");

        try
        {
            HttpResponseMessage response;
            if (method == HttpMethod.Post)
            {
                var stringContent = new StringContent(body ?? "", Encoding.UTF8, "application/json");
                response = await client.PostAsync(targetUrl, stringContent);
            }
            else if (method == HttpMethod.Put)
            {
                var stringContent = new StringContent(body ?? "", Encoding.UTF8, "application/json");
                response = await client.PutAsync(targetUrl, stringContent);
            }
            else if (method == HttpMethod.Delete)
            {
                response = await client.DeleteAsync(targetUrl);
            }
            else
            {
                response = await client.GetAsync(targetUrl);
            }

            _logger.LogInformation($"📡 Response status: {response.StatusCode}");

            // If we get a 401, log it clearly
            if (response.StatusCode == HttpStatusCode.Unauthorized)
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                _logger.LogError($"🔴 Authentication failed (401): {errorContent}");
            }

            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error proxying request to {targetUrl}");
            throw;
        }
    }

    public async Task<byte[]> ProxyAssetAsync(string url)
    {
        var client = _httpClientFactory.CreateClient();
        client.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
        client.DefaultRequestHeaders.Add("Accept", "*/*");
        client.DefaultRequestHeaders.Add("Accept-Encoding", "gzip, deflate, br");
        client.DefaultRequestHeaders.Add("Accept-Language", "en-US,en;q=0.9");
        client.DefaultRequestHeaders.Add("Connection", "keep-alive");

        // Always add client credentials headers
        client.DefaultRequestHeaders.Add("Client-ID", ClientId);
        client.DefaultRequestHeaders.Add("Client-Secret-Key", ClientSecret);

        var token = await GetTokenAsync();
        if (!string.IsNullOrEmpty(token) && token != "client_credentials_ok")
        {
            client.DefaultRequestHeaders.Authorization =
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
        }

        try
        {
            var response = await client.GetAsync(url);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning($"Asset request failed: {response.StatusCode} for {url}");
            }

            var bytes = await response.Content.ReadAsByteArrayAsync();

            // If content is compressed, decompress it
            if (response.Content.Headers.ContentEncoding.Contains("gzip"))
            {
                try
                {
                    using var memoryStream = new MemoryStream(bytes);
                    using var gzipStream = new GZipStream(memoryStream, CompressionMode.Decompress);
                    using var resultStream = new MemoryStream();
                    gzipStream.CopyTo(resultStream);
                    return resultStream.ToArray();
                }
                catch (Exception ex)
                {
                    _logger.LogWarning($"Failed to decompress gzip: {ex.Message}");
                    return bytes; // Return as is if decompression fails
                }
            }

            return bytes;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error fetching asset from {url}");
            throw;
        }
    }

    private async Task<string> DecompressResponseContent(HttpResponseMessage response)
    {
        var bytes = await response.Content.ReadAsByteArrayAsync();

        if (response.Content.Headers.ContentEncoding.Contains("gzip"))
        {
            try
            {
                using var memoryStream = new MemoryStream(bytes);
                using var gzipStream = new GZipStream(memoryStream, CompressionMode.Decompress);
                using var resultStream = new MemoryStream();
                gzipStream.CopyTo(resultStream);
                return Encoding.UTF8.GetString(resultStream.ToArray());
            }
            catch (Exception ex)
            {
                _logger.LogWarning($"Failed to decompress gzip: {ex.Message}");
                return Encoding.UTF8.GetString(bytes);
            }
        }
        else if (response.Content.Headers.ContentEncoding.Contains("br"))
        {
            try
            {
                // Brotli decompression
                using var memoryStream = new MemoryStream(bytes);
                using var brotliStream = new BrotliStream(memoryStream, CompressionMode.Decompress);
                using var resultStream = new MemoryStream();
                brotliStream.CopyTo(resultStream);
                return Encoding.UTF8.GetString(resultStream.ToArray());
            }
            catch (Exception ex)
            {
                _logger.LogWarning($"Failed to decompress brotli: {ex.Message}");
                return Encoding.UTF8.GetString(bytes);
            }
        }

        return Encoding.UTF8.GetString(bytes);
    }

    public async Task<string> GetDecompressedContentAsync(HttpResponseMessage response)
    {
        return await DecompressResponseContent(response);
    }

    public string GetContentType(string url, byte[] content)
    {
        if (url.EndsWith(".js") || url.Contains(".js?"))
            return "application/javascript";
        if (url.EndsWith(".css") || url.Contains(".css?"))
            return "text/css";
        if (url.EndsWith(".woff2"))
            return "font/woff2";
        if (url.EndsWith(".woff"))
            return "font/woff";
        if (url.EndsWith(".png"))
            return "image/png";
        if (url.EndsWith(".jpg") || url.EndsWith(".jpeg"))
            return "image/jpeg";
        if (url.EndsWith(".svg"))
            return "image/svg+xml";
        if (url.EndsWith(".json"))
            return "application/json";

        return "application/octet-stream";
    }

    public bool IsHtmlResponse(byte[] content)
    {
        if (content.Length < 100) return false;
        var sample = Encoding.UTF8.GetString(content.Take(100).ToArray());
        return sample.Contains("<html") || sample.Contains("<!DOCTYPE");
    }
}