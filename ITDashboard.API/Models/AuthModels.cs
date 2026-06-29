// Models/AuthModels.cs
namespace ITDashboard.API.Models;

public class LoginRequest
{
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class LoginResponse
{
    public string Token { get; set; } = string.Empty;
    public UserDto User { get; set; } = new();
}

public class UserDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Realname { get; set; }
    public List<RoleDto> Roles { get; set; } = new();
    public UserPermissions Permissions { get; set; } = new();
}

public class RoleDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
}

public class UserPermissions
{
    public bool CanView { get; set; } = true;
    public bool CanEdit { get; set; } = false;
    public bool CanDelete { get; set; } = false;
    public bool CanAssignResource { get; set; } = false;
    public bool CanCreate { get; set; } = false;
    public bool CanManageUsers { get; set; } = false;
}

// ✅ DEDICATED USER MODEL FOR AUTH
public class AuthUserModel
{
    public int Id { get; set; }
    public string? Name { get; set; }
    public string? Email { get; set; }
    public string? Realname { get; set; }
    public string? Password { get; set; }
    public bool IsActive { get; set; }
    public bool IsSuperuser { get; set; }
    public bool IsStaff { get; set; }
    public string? PasswordForgetToken { get; set; }     
    public DateTime? PasswordForgetTokenDate { get; set; } 
}