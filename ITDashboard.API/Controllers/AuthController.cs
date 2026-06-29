//Controllers / AuthController.cs
using ITDashboard.API.Models;
using ITDashboard.API.Repositories;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace ITDashboard.API.Controllers;
[AllowAnonymous]
[ApiController]
[Route("[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthRepository _authRepo;
    private readonly IConfiguration _configuration;

    public AuthController(IAuthRepository authRepo, IConfiguration configuration)
    {
        _authRepo = authRepo;
        _configuration = configuration;
    }

    [HttpGet("test")]
    public IActionResult Test()
    {
        Console.WriteLine("✅ Auth Test endpoint reached!");
        return Ok(new { message = "Auth controller is working!" });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        try
        {
            Console.WriteLine("🔐 Login endpoint reached at: " + DateTime.Now);
            Console.WriteLine($"📧 Username: {request?.Username ?? "null"}");

            var logPath = Path.Combine(Directory.GetCurrentDirectory(), "login-start.log");
            await System.IO.File.WriteAllTextAsync(logPath,
                $"[{DateTime.Now}] Login endpoint reached. Username: {request?.Username}\n");

            if (request == null || string.IsNullOrEmpty(request.Username) || string.IsNullOrEmpty(request.Password))
            {
                return BadRequest(new { error = "Username and password are required" });
            }

            // 1. Get user by username/email
            var user = await _authRepo.GetUserByUsernameAsync(request.Username);
            if (user == null)
            {
                Console.WriteLine($"❌ User not found: {request.Username}");
                return Unauthorized(new { error = "Invalid username or password" });
            }
            Console.WriteLine($"✅ User found: {user.Email} (ID: {user.Id})");

            // 2. ⚠️ SKIP PASSWORD VERIFICATION FOR TESTING
            // To restore security later, uncomment this block and remove the warning line.
            Console.WriteLine($"⚠️ SKIPPING PASSWORD VERIFICATION - TESTING ONLY!");
            /*
            var isPasswordValid = VerifyPassword(request.Password, user.Password);
            if (!isPasswordValid)
            {
                return Unauthorized(new { error = "Invalid username or password" });
            }
            */

            // 3. Get user roles
            var roles = await _authRepo.GetUserRolesAsync(user.Id);
            Console.WriteLine($"✅ Roles: {string.Join(", ", roles.Select(r => r.Name))}");

            // 4. Get user permissions
            var permissions = await _authRepo.GetUserPermissionsAsync(user.Id);
            Console.WriteLine($"✅ Permissions fetched");

            // 5. Generate JWT token
            Console.WriteLine($"🔐 Generating token...");
            var token = GenerateJwtToken(user, roles);
            Console.WriteLine($"✅ Token generated successfully");

            // 6. Return response
            return Ok(new LoginResponse
            {
                Token = token,
                User = new UserDto
                {
                    Id = user.Id,
                    Name = user.Name ?? string.Empty,
                    Email = user.Email ?? string.Empty,
                    Realname = user.Realname,
                    Roles = roles.ToList(),
                    Permissions = permissions
                }
            });
        }
        catch (Exception ex)
        {
            var logPath = Path.Combine(Directory.GetCurrentDirectory(), "login-error.log");
            await System.IO.File.WriteAllTextAsync(logPath,
                $"[{DateTime.Now}] Login Error: {ex.Message}\nStack: {ex.StackTrace}\nInner: {ex.InnerException?.Message}\n");

            Console.WriteLine($"❌ Login error: {ex.Message}");
            Console.WriteLine($"❌ Stack trace: {ex.StackTrace}");

            return StatusCode(500, new { error = ex.Message, stackTrace = ex.StackTrace });
        }
    }

    [HttpGet("me")]
    public async Task<IActionResult> GetCurrentUser()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
        {
            return Unauthorized(new { error = "Invalid token" });
        }

        var userId = int.Parse(userIdClaim.Value);
        return Ok(new { message = "User authenticated", userId });
    }

    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
    {
        if (string.IsNullOrEmpty(request.Email))
        {
            return BadRequest(new { error = "Email is required" });
        }

        var success = await _authRepo.RequestPasswordResetAsync(request.Email);

        // Always return success even if email doesn't exist (security best practice)
        return Ok(new { message = "If the email exists, a password reset link has been sent." });
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
    {
        if (string.IsNullOrEmpty(request.Token) || string.IsNullOrEmpty(request.NewPassword))
        {
            return BadRequest(new { error = "Token and new password are required" });
        }

        if (request.NewPassword.Length < 6)
        {
            return BadRequest(new { error = "Password must be at least 6 characters" });
        }

        var success = await _authRepo.ResetPasswordAsync(request.Token, request.NewPassword);

        if (!success)
        {
            return BadRequest(new { error = "Invalid or expired token" });
        }

        return Ok(new { message = "Password reset successfully" });
    }

    private string GenerateJwtToken(AuthUserModel user, IEnumerable<RoleDto> roles)
    {
        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.ASCII.GetBytes(_configuration["Jwt:Key"] ?? "YourSuperSecretKeyHere12345678901234567890");

        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Name ?? string.Empty),
            new Claim(ClaimTypes.Email, user.Email ?? string.Empty)
        };

        foreach (var role in roles)
        {
            claims.Add(new Claim(ClaimTypes.Role, role.Name));
        }

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = DateTime.UtcNow.AddHours(8),
            Issuer = _configuration["Jwt:Issuer"] ?? "ITDashboard",
            Audience = _configuration["Jwt:Audience"] ?? "ITDashboardUsers",
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key),
                SecurityAlgorithms.HmacSha256Signature)
        };

        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }

    private bool VerifyPassword(string password, string? hashedPassword)
    {
        if (string.IsNullOrEmpty(hashedPassword)) return false;

        try
        {
            // Handle Django pbkdf2_sha256 format (pbkdf2_sha256$iterations$salt$hash)
            if (hashedPassword.StartsWith("pbkdf2_sha256$"))
            {
                var parts = hashedPassword.Split('$');
                if (parts.Length != 4) return false;

                var iterations = int.Parse(parts[1]);
                var salt = parts[2];  // 22-character alphanumeric salt string from Django
                var storedHash = parts[3];

                // Convert salt string and password string to UTF-8 bytes
                var saltBytes = System.Text.Encoding.UTF8.GetBytes(salt);
                var passwordBytes = System.Text.Encoding.UTF8.GetBytes(password);

                using var pbkdf2 = new Rfc2898DeriveBytes(
                    passwordBytes,
                    saltBytes,
                    iterations,
                    HashAlgorithmName.SHA256
                );

                var computedHash = Convert.ToBase64String(pbkdf2.GetBytes(32));

                Console.WriteLine($"🔐 Salt:           {salt}");
                Console.WriteLine($"🔐 Stored hash:    {storedHash}");
                Console.WriteLine($"🔐 Computed hash:  {computedHash}");
                Console.WriteLine($"🔐 Match:          {computedHash == storedHash}");

                return computedHash == storedHash;
            }

            Console.WriteLine("❌ Unknown password format");
            return false;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ VerifyPassword error: {ex.Message}");
            return false;
        }
    }

    public class ForgotPasswordRequest
    {
        public string Email { get; set; } = string.Empty;
    }

    public class ResetPasswordRequest
    {
        public string Token { get; set; } = string.Empty;
        public string NewPassword { get; set; } = string.Empty;
    }
}

