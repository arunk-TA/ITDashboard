using ITDashboard.API.Repositories;
using ITDashboard.API.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Text.Json;

Environment.SetEnvironmentVariable("ASPNETCORE_HOSTINGSTARTUPASSEMBLIES", "");

Dapper.DefaultTypeMap.MatchNamesWithUnderscores = true;
var builder = WebApplication.CreateBuilder(args);


// ✅ Disable BrowserLink completely
builder.Services.Configure<Microsoft.AspNetCore.Mvc.RazorPages.RazorPagesOptions>(options =>
{
    // Disable browser refresh
});

// Remove BrowserLink from the pipeline
builder.WebHost.UseSetting("UseBrowserLink", "false");

builder.Services.AddControllers();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// JWT Authentication
var key = Encoding.ASCII.GetBytes(builder.Configuration["Jwt:Key"] ?? "YourSuperSecretKeyHere12345678901234567890");

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "ITDashboard",
        ValidateAudience = true,
        ValidAudience = builder.Configuration["Jwt:Audience"] ?? "ITDashboardUsers",
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero
    };
});

builder.Services.AddAuthorization();

builder.Services.AddScoped<IAuthRepository, AuthRepository>();
builder.Services.AddScoped<IDashboardRepository, DashboardRepository>();
builder.Services.AddHttpClient();
builder.Services.AddScoped<MOHService>();
builder.Services.AddSingleton<HelpdeskTokenService>();

// ✅ Update CORS to be more specific
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngular", policy =>
        policy.WithOrigins(
                "http://localhost:4200",
                "https://uatitdashboard.stemzglobal.com" , // ✅ add UAT,
                "http://20.0.2.215:8080"
              )
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());
});
var app = builder.Build();

var routePrefix = builder.Configuration["AppSettings:RoutePrefix"] ?? "";
if (!string.IsNullOrEmpty(routePrefix))
{
    app.UsePathBase($"/{routePrefix}");
}

app.UseSwagger();
app.UseSwaggerUI();

app.UseDefaultFiles();
app.UseStaticFiles();

app.Use(async (context, next) =>
{
    try { await next(); }
    catch (Exception ex)
    {
        var logPath = Path.Combine(Directory.GetCurrentDirectory(), "dashboard-error.log");
        var errorMessage = $"[{DateTime.Now}] CRASH: {context.Request.Path}\n{ex.Message}\n{ex.StackTrace}\n";
        await System.IO.File.AppendAllTextAsync(logPath, errorMessage);
        throw;
    }
});

app.UseRouting();
app.UseCors("AllowAngular");
app.UseAuthentication();
app.UseAuthorization();

 
app.MapControllers();
app.MapFallbackToFile("index.html");


Console.WriteLine("✅ Application started!");
app.Run();