// Repositories/AuthRepository.cs
using Dapper;
using ITDashboard.API.Models;
using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;
using Npgsql;
using System.Data;
using System.Security.Cryptography;

namespace ITDashboard.API.Repositories;

public interface IAuthRepository
{
    Task<AuthUserModel?> GetUserByUsernameAsync(string username);
    Task<IEnumerable<RoleDto>> GetUserRolesAsync(int userId);
    Task<UserPermissions> GetUserPermissionsAsync(int userId);
    Task<bool> RequestPasswordResetAsync(string email);
    Task<bool> ResetPasswordAsync(string token, string newPassword);
}

public class AuthRepository : IAuthRepository
{
    private readonly string _connectionString;
    private readonly string _frontendUrl;

    public AuthRepository(IConfiguration config)
    {
        _connectionString = config.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Connection string not found.");
        _frontendUrl = config["AppSettings:FrontendUrl"] ?? "http://localhost:4200";
        // Dapper.DefaultTypeMap.MatchNamesWithUnderscores = true;

    }

    private IDbConnection CreateConnection() => new NpgsqlConnection(_connectionString);

    public async Task<AuthUserModel?> GetUserByUsernameAsync(string username)
    {
        using var conn = CreateConnection();
        const string sql = @"
            SELECT id, name, email, realname, password, is_active, is_superuser, is_staff
            FROM public.users
            WHERE (email = @Username OR name = @Username)
            AND is_active = true";

        return await conn.QueryFirstOrDefaultAsync<AuthUserModel>(sql, new { Username = username });
    }

    //public async Task<IEnumerable<RoleDto>> GetUserRolesAsync(int userId)
    //{
    //    using var conn = CreateConnection();
    //    const string sql = @"
    //        SELECT 
    //            tmc.id AS Id,
    //            tmc.field_name AS Name
    //        FROM public.user_role_mapping urm
    //        JOIN public.tickets_master_configuration tmc ON tmc.id = urm.role_id
    //        WHERE urm.user_id = @UserId
    //        AND tmc.field_type = 'Role'
    //        AND tmc.is_active = 'Y'
    //        ORDER BY tmc.field_name";

    //    return await conn.QueryAsync<RoleDto>(sql, new { UserId = userId });
    //}

    public async Task<IEnumerable<RoleDto>> GetUserRolesAsync(int userId)
    {
        try
        {
            using var conn = CreateConnection();
            Console.WriteLine($"🔍 Getting roles for user: {userId}");

            const string sql = @"
            SELECT 
                tmc.id AS Id,
                tmc.field_name AS Name
            FROM public.user_role_mapping urm
            JOIN public.tickets_master_configuration tmc ON tmc.id = urm.role_id
            WHERE urm.user_id = @UserId
            AND tmc.field_type = 'Role'
            AND tmc.is_active = 'Y'
            ORDER BY tmc.field_name";

            var result = await conn.QueryAsync<RoleDto>(sql, new { UserId = userId });
            Console.WriteLine($"✅ Found {result.Count()} roles");
            return result;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ GetUserRolesAsync error: {ex.Message}");
            throw;
        }
    }

    public async Task<UserPermissions> GetUserPermissionsAsync(int userId)
    {
        var roles = await GetUserRolesAsync(userId);
        var roleIds = roles.Select(r => r.Id).ToList();

        var permissions = new UserPermissions
        {
            CanView = true
        };

        if (roleIds.Contains(80))
        {
            permissions.CanEdit = true;
            permissions.CanDelete = true;
            permissions.CanAssignResource = true;
            permissions.CanCreate = true;
            permissions.CanManageUsers = true;
            return permissions;
        }

        if (roleIds.Contains(504))
        {
            permissions.CanEdit = true;
            permissions.CanDelete = true;
            permissions.CanAssignResource = true;
            permissions.CanCreate = true;
            permissions.CanManageUsers = false;
            return permissions;
        }

        return permissions;
    }

    private async Task<EmailConfigModel?> GetEmailConfigAsync()
    {
        using var conn = CreateConnection();
        const string sql = @"
        SELECT id, smtp_host, smtp_port, smtp_username, smtp_password,
               from_email, from_name, use_ssl, use_tls, is_active
        FROM public.email_config
        WHERE is_active = true
        LIMIT 1";

        var result = await conn.QueryFirstOrDefaultAsync<EmailConfigModel>(sql);
        Console.WriteLine($"📧 Config loaded: host={result?.SmtpHost}, user={result?.SmtpUsername}");
        return result;
    }

    private async Task SendEmailAsync(string toEmail, string subject, string body)
    {
        var config = await GetEmailConfigAsync();
        if (config == null)
        {
            Console.WriteLine("❌ Email configuration not found");
            return;
        }

        try
        {
            Console.WriteLine($"📧 Sending to: {toEmail}");
            Console.WriteLine($"📧 SMTP: {config.SmtpHost}:{config.SmtpPort}");
            Console.WriteLine($"📧 User: {config.SmtpUsername}");

            var email = new MimeMessage();
            email.From.Add(new MailboxAddress(config.FromName, config.FromEmail));
            email.To.Add(new MailboxAddress("", toEmail));
            email.Subject = subject;

            var bodyBuilder = new BodyBuilder { HtmlBody = body };
            email.Body = bodyBuilder.ToMessageBody();

            using var smtp = new SmtpClient();

            // Port 587 = STARTTLS
            await smtp.ConnectAsync(config.SmtpHost, config.SmtpPort, SecureSocketOptions.StartTls);

            Console.WriteLine("📧 Connected!");

            Console.WriteLine($"📧 Authenticating with username: '{config.SmtpUsername}'");
            Console.WriteLine($"📧 Password length: {config.SmtpPassword?.Length}");

            await smtp.AuthenticateAsync(config.SmtpUsername, config.SmtpPassword);

            Console.WriteLine("📧 Authenticated successfully");

            await smtp.SendAsync(email);
            await smtp.DisconnectAsync(true);

            Console.WriteLine($"✅ Email sent successfully to {toEmail}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Email failed: {ex.Message}");
            Console.WriteLine($"❌ Inner: {ex.InnerException?.Message}");
            throw;
        }
    }

    // ✅ ADD THIS METHOD - Professional email template
    private string BuildResetEmailBody(string userName, string toEmail, string resetLink)
    {
        return $@"<!DOCTYPE html>
<html>
<head>
    <meta charset=""UTF-8"">
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
</head>
<body style=""font-family:'Segoe UI', Arial, sans-serif;background:#f4f5f7;margin:0;padding:30px;"">
<div style=""max-width:540px;margin:0 auto;background:#ffffff;border-radius:10px;
            overflow:hidden;border:1px solid #e3e3e3;box-shadow:0 4px 12px rgba(0,0,0,0.05);"">

    <!-- HEADER -->
    <div style=""background:#8b2020;padding:28px 34px;text-align:left;"">
        <table style=""margin:0;"" cellpadding=""0"" cellspacing=""0"">
            <tr>
                <td style=""vertical-align:middle;padding-right:14px;"">
                    <img src=""https://uaterp.stemzglobal.com/Content/images/StemzLogo.png""
                         alt=""Stemz Healthcare""
                         width=""100""
                         style=""display:block;background:#fff;border-radius:4px;padding:4px;"" />
                </td>
                <td style=""vertical-align:middle;"">
                    <div style=""color:#ffffff;font-size:20px;font-weight:700;"">
                        Password Reset Request
                    </div>
                    <div style=""color:rgba(255,255,255,0.8);font-size:13px;margin-top:4px;"">
                        Stemz Healthcare – IT Dashboard
                    </div>
                </td>
            </tr>
        </table>
    </div>

    <!-- BODY -->
    <div style=""padding:30px 34px;"">
        <p style=""color:#333333;font-size:15px;margin:0 0 16px;"">
            Dear <strong>{userName}</strong>,
        </p>
        <p style=""color:#555555;font-size:14px;line-height:1.7;margin:0 0 24px;"">
            We received a request to reset the password for your IT Dashboard account
            associated with <strong>{toEmail}</strong>.
            Click the button below to set a new password.
        </p>

        <div style=""text-align:center;margin-bottom:26px;"">
            <a href=""{resetLink}""
               style=""display:inline-block;background:#8b2020;
                      color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:6px;
                      font-size:15px;font-weight:600;letter-spacing:0.5px;"">
                Reset My Password
            </a>
        </div>

        <div style=""background:#fff8e1;border-left:4px solid #ffc107;padding:12px 16px;
                    border-radius:0 6px 6px 0;margin-bottom:20px;"">
            <p style=""margin:0;font-size:13px;color:#555555;"">
                ⚠️ This link will expire in <strong>24 hours</strong>.
            </p>
            <p style=""margin:6px 0 0;font-size:13px;color:#555555;"">
                If you did not request this, please ignore this email.
            </p>
        </div>

        <div style=""background:#f0f0f0;padding:10px 14px;border-radius:6px;word-break:break-all;"">
            <p style=""margin:0;font-size:12px;color:#777777;"">
                Or copy this link into your browser:<br/>
                <a href=""{resetLink}"" style=""color:#8b2020;font-size:12px;"">{resetLink}</a>
            </p>
        </div>
    </div>

    <!-- FOOTER -->
    <div style=""background:#fafafa;border-top:1px solid #ececec;padding:16px 34px;
                text-align:center;"">
        <p style=""margin:0;font-size:12px;color:#999999;"">
            © {DateTime.Now.Year} Stemz Healthcare. All Rights Reserved.
        </p>
        <p style=""margin:4px 0 0;font-size:11px;color:#bbbbbb;"">
            This is an auto-generated email. Please do not reply.
        </p>
    </div>

</div>
</body>
</html>";
    }

    public async Task<bool> RequestPasswordResetAsync(string email)
    {
        using var conn = CreateConnection();

        // Find user
        const string findUserSql = @"
        SELECT id, name, email, realname
        FROM public.users
        WHERE email = @Email AND is_active = true";

        var user = await conn.QueryFirstOrDefaultAsync<dynamic>(findUserSql, new { Email = email });

        if (user == null)
            return false;

        // Generate token
        var token = Convert.ToBase64String(Guid.NewGuid().ToByteArray())
            .Replace("+", "-")
            .Replace("/", "_")
            .TrimEnd('=');

        // ✅ Use UTC for expiry
        var expiryDate = DateTime.UtcNow.AddHours(24);
        Console.WriteLine($"📅 Token expiry (UTC): {expiryDate}");

        // Update users table
        const string updateTokenSql = @"
        UPDATE public.users 
        SET password_forget_token = @Token,
            password_forget_token_date = @ExpiryDate
        WHERE id = @UserId";

        await conn.ExecuteAsync(updateTokenSql, new
        {
            UserId = user.id,
            Token = token,
            ExpiryDate = expiryDate
        });

        // Get email template
        var template = await GetEmailTemplateAsync("PASSWORD_RESET");
        if (string.IsNullOrEmpty(template))
        {
            Console.WriteLine("❌ Email template not found for PASSWORD_RESET");
            return false;
        }

        // Build reset link
        var resetLink = $"{_frontendUrl}/forgot-password?token={token}";
        Console.WriteLine($"🔗 Reset link: {resetLink}");

        // Replace placeholders
        var placeholders = new Dictionary<string, string>
    {
        { "UserName", user.realname ?? user.name },
        { "UserEmail", user.email },
        { "ResetLink", resetLink },
        { "CurrentYear", DateTime.Now.Year.ToString() }
    };

        var body = RenderTemplate(template, placeholders);
        var subject = "Password Reset Request - IT Dashboard";

        await SendEmailAsync(email, subject, body);
        Console.WriteLine($"✅ Email sent to {email}");

        return true;
    }
    public async Task<bool> ResetPasswordAsync(string token, string newPassword)
    {
        using var conn = CreateConnection();

        Console.WriteLine($"🔑 ResetPassword called");
        Console.WriteLine($"🔑 Token received: '{token}'");

        // ✅ Use CURRENT_TIMESTAMP (respects session timezone)
        const string validateTokenSql = @"
        SELECT id, email, realname, name, password_forget_token_date
        FROM public.users
        WHERE password_forget_token = @Token 
          AND password_forget_token_date > CURRENT_TIMESTAMP
          AND is_active = true";

        var user = await conn.QueryFirstOrDefaultAsync<dynamic>(validateTokenSql, new { Token = token });

        if (user == null)
        {
            Console.WriteLine("❌ Token invalid or expired");
            return false;
        }

        Console.WriteLine($"✅ Token valid for: {user.email}");
        Console.WriteLine($"📅 Token expiry: {user.password_forget_token_date}");
        Console.WriteLine($"🕐 Current time: {DateTime.Now}");

        // Hash the new password
        var hashedPassword = HashPassword(newPassword);

        const string updatePasswordSql = @"
        UPDATE public.users 
        SET password = @Password,
            password_forget_token = NULL,
            password_forget_token_date = NULL
        WHERE id = @UserId";

        await conn.ExecuteAsync(updatePasswordSql, new
        {
            Password = hashedPassword,
            UserId = user.id
        });

        Console.WriteLine($"✅ Password updated for user: {user.email}");

        // Send confirmation email
        try
        {
            var template = await GetEmailTemplateAsync("PASSWORD_RESET_CONFIRMATION");
            if (!string.IsNullOrEmpty(template))
            {
                var placeholders = new Dictionary<string, string>
            {
                { "UserName", user.realname ?? user.name },
                { "CurrentYear", DateTime.Now.Year.ToString() }
            };

                var body = RenderTemplate(template, placeholders);
                var subject = "Password Reset Successful - IT Dashboard";

                await SendEmailAsync(user.email, subject, body);
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"⚠️ Failed to send confirmation email: {ex.Message}");
        }

        return true;
    }
    private string HashPassword(string password)
    {
        // Match Django 5.x - uses 1,000,000 iterations
        const int iterations = 1000000;
        const int hashBytes = 32;

        // Generate random salt (Django uses 22-char alphanumeric salt)
        const string chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        var saltChars = new char[22];
        using var rng = RandomNumberGenerator.Create();
        var bytes = new byte[22];
        rng.GetBytes(bytes);
        for (int i = 0; i < 22; i++)
            saltChars[i] = chars[bytes[i] % chars.Length];
        var salt = new string(saltChars);

        var passwordBytes = System.Text.Encoding.UTF8.GetBytes(password);
        var saltBytesUtf8 = System.Text.Encoding.UTF8.GetBytes(salt);

        using var pbkdf2 = new Rfc2898DeriveBytes(
            passwordBytes,
            saltBytesUtf8,
            iterations,
            HashAlgorithmName.SHA256
        );

        var hash = pbkdf2.GetBytes(hashBytes);
        var hashBase64 = Convert.ToBase64String(hash);

        // Django format: algorithm$iterations$salt$hash
        return $"pbkdf2_sha256${iterations}${salt}${hashBase64}";
    }
    private async Task<string?> GetEmailTemplateAsync(string eventName)
    {
        using var conn = CreateConnection();
        const string sql = @"
        SELECT email_template
        FROM public.ticket_email_templates
        WHERE email_event = @EventName AND is_active = 'Y'";

        return await conn.QueryFirstOrDefaultAsync<string>(sql, new { EventName = eventName });
    }

    private string RenderTemplate(string template, Dictionary<string, string> placeholders)
    {
        var result = template;
        foreach (var placeholder in placeholders)
        {
            result = result.Replace($"{{{{{placeholder.Key}}}}}", placeholder.Value);
        }
        return result;
    }


}
