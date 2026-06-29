// Models/EmailConfigModel.cs
namespace ITDashboard.API.Models;

public class EmailConfigModel
{
    public int Id { get; set; }
    public string SmtpHost { get; set; } = string.Empty;
    public int SmtpPort { get; set; } = 587;
    public string SmtpUsername { get; set; } = string.Empty;
    public string SmtpPassword { get; set; } = string.Empty;
    public string FromEmail { get; set; } = string.Empty;
    public string FromName { get; set; } = "IT Dashboard";
    public bool UseSsl { get; set; }
    public bool UseTls { get; set; } = true;
    public bool IsActive { get; set; } = true;
}

public class PasswordResetToken
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string Token { get; set; } = string.Empty;
    public DateTime CreatedDate { get; set; }
    public DateTime ExpiryDate { get; set; }
    public bool IsUsed { get; set; }
}