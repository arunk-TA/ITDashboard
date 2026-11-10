using System.Security.Cryptography;
using System.Text;

namespace ITDashboard.API.Services;

public class DownloadTokenService
{
    private readonly byte[] _key;
    private readonly TimeSpan _lifetime;

    public DownloadTokenService(IConfiguration config)
    {
        var secret = config["DownloadTokens:Secret"];
        if (string.IsNullOrWhiteSpace(secret))
            secret = config["Jwt:Key"] ?? "YourSuperSecretKeyHere12345678901234567890";

        _key = Encoding.UTF8.GetBytes(secret);

        var minutes = config.GetValue<int?>("DownloadTokens:LifetimeMinutes") ?? 15;
        _lifetime = TimeSpan.FromMinutes(minutes);
    }

    public string CreateToken(string resource)
    {
        var expires = DateTimeOffset.UtcNow.Add(_lifetime).ToUnixTimeSeconds();
        var payloadBytes = Encoding.UTF8.GetBytes($"{resource}|{expires}");
        var signature = Sign(payloadBytes);
        return $"{Base64UrlEncode(payloadBytes)}.{Base64UrlEncode(signature)}";
    }

    public bool ValidateToken(string resource, string? token)
    {
        if (string.IsNullOrWhiteSpace(token))
            return false;

        var parts = token.Split('.');
        if (parts.Length != 2)
            return false;

        try
        {
            var payloadBytes = Base64UrlDecode(parts[0]);
            var providedSignature = Base64UrlDecode(parts[1]);
            var expectedSignature = Sign(payloadBytes);

            if (!CryptographicOperations.FixedTimeEquals(providedSignature, expectedSignature))
                return false;

            var payload = Encoding.UTF8.GetString(payloadBytes);
            var separator = payload.LastIndexOf('|');
            if (separator < 0)
                return false;

            if (!string.Equals(payload[..separator], resource, StringComparison.Ordinal))
                return false;

            if (!long.TryParse(payload[(separator + 1)..], out var expires))
                return false;

            return DateTimeOffset.UtcNow.ToUnixTimeSeconds() <= expires;
        }
        catch
        {
            return false;
        }
    }

    private byte[] Sign(byte[] data)
    {
        using var hmac = new HMACSHA256(_key);
        return hmac.ComputeHash(data);
    }

    private static string Base64UrlEncode(byte[] data) =>
        Convert.ToBase64String(data).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    private static byte[] Base64UrlDecode(string input)
    {
        var value = input.Replace('-', '+').Replace('_', '/');
        value += (value.Length % 4) switch
        {
            2 => "==",
            3 => "=",
            _ => ""
        };
        return Convert.FromBase64String(value);
    }
}
