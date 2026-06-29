using System.Text;
using System.Text.Json;

namespace ITDashboard.API.Services;

public class HelpdeskTokenService
{
    private readonly IConfiguration _config;
    private readonly IHttpClientFactory _httpClientFactory;
    private string _cachedToken = "";
    private DateTime _tokenExpiry = DateTime.MinValue;
    private readonly SemaphoreSlim _lock = new SemaphoreSlim(1, 1);

    public HelpdeskTokenService(IConfiguration config, IHttpClientFactory httpClientFactory)
    {
        _config = config;
        _httpClientFactory = httpClientFactory;
    }

    public async Task<string> GetValidTokenAsync()
    {
        if (!string.IsNullOrEmpty(_cachedToken) && DateTime.UtcNow < _tokenExpiry.AddMinutes(-5))
        {
            Console.WriteLine("✅ Using cached helpdesk token");
            return _cachedToken;
        }

        await _lock.WaitAsync();
        try
        {
            if (!string.IsNullOrEmpty(_cachedToken) && DateTime.UtcNow < _tokenExpiry.AddMinutes(-5))
                return _cachedToken;

            return await RefreshTokenAsync();
        }
        finally
        {
            _lock.Release();
        }
    }

    private async Task<string> RefreshTokenAsync()
    {
        try
        {
            var baseUrl = _config["HelpdeskApi:BaseUrl"];
            var username = _config["HelpdeskApi:Username"];
            var password = _config["HelpdeskApi:Password"];

            Console.WriteLine($"🔄 Logging into helpdesk as {username}...");

            var client = _httpClientFactory.CreateClient();
            var loginPayload = new { username, password };
            var json = JsonSerializer.Serialize(loginPayload);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var loginUrl = $"{baseUrl}/api/token/";
            Console.WriteLine($"🔵 POST {loginUrl}");

            var response = await client.PostAsync(loginUrl, content);
            var responseStr = await response.Content.ReadAsStringAsync();

            Console.WriteLine($"🔵 Status: {response.StatusCode}");
            Console.WriteLine($"🔵 Response: {responseStr}");

            if (response.IsSuccessStatusCode)
            {
                var tokenData = JsonSerializer.Deserialize<JsonElement>(responseStr);

                if (tokenData.TryGetProperty("access", out var access))
                {
                    _cachedToken = access.GetString() ?? "";
                    _tokenExpiry = GetTokenExpiry(_cachedToken);
                    Console.WriteLine($"✅ Token obtained! Expires: {_tokenExpiry}");
                    return _cachedToken;
                }
            }

            Console.WriteLine($"❌ Login failed: {responseStr}");
            return _config["HelpdeskApi:Token"] ?? "";
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ RefreshToken error: {ex.Message}");
            return _config["HelpdeskApi:Token"] ?? "";
        }
    }

    private DateTime GetTokenExpiry(string token)
    {
        try
        {
            var parts = token.Split('.');
            if (parts.Length < 2) return DateTime.UtcNow.AddHours(1);

            var payload = parts[1];
            payload = payload.PadRight(payload.Length + (4 - payload.Length % 4) % 4, '=');
            var decoded = Convert.FromBase64String(payload);
            var json = Encoding.UTF8.GetString(decoded);
            var data = JsonSerializer.Deserialize<JsonElement>(json);

            if (data.TryGetProperty("exp", out var exp))
                return DateTimeOffset.FromUnixTimeSeconds(exp.GetInt64()).UtcDateTime;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"⚠️ Could not parse token expiry: {ex.Message}");
        }
        return DateTime.UtcNow.AddHours(1);
    }
}