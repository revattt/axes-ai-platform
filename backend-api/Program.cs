using Axes.AiService.Hubs;
using Axes.Api.Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;

AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

var builder = WebApplication.CreateBuilder(args);

var dbProvider = builder.Configuration["DatabaseProvider"] ?? "Postgres";
builder.Services.AddDbContext<AppDbContext>(options =>
{
    if (dbProvider.Equals("Postgres", StringComparison.OrdinalIgnoreCase))
    {
        var connectionString = Environment.GetEnvironmentVariable("SUPABASE_DB_CONNECTION")
            ?? builder.Configuration.GetConnectionString("SupabaseConnection")
            ?? throw new InvalidOperationException("SUPABASE_DB_CONNECTION env var is not set.");

        options.UseNpgsql(connectionString)
               .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning));
    }
    else
    {
        throw new InvalidOperationException($"Unsupported DatabaseProvider: {dbProvider}");
    }
});

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8
            .GetBytes(builder.Configuration.GetSection("AppSettings:Token").Value!)),
        ValidateIssuer = false, // Set to true in production
        ValidateAudience = false // Set to true in production
    };
});

// Add services to the container.

builder.Services.AddControllers();

builder.Services.AddSignalR();

// --- CORS CONFIGURATION ---
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngular", policy =>
    {
        var allowedOriginsFromEnv = Environment.GetEnvironmentVariable("ALLOWED_ORIGINS");
        var allowedOrigins = !string.IsNullOrWhiteSpace(allowedOriginsFromEnv)
            ? allowedOriginsFromEnv.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
            : builder.Configuration.GetSection("AllowedOrigins").Get<string[]>() ?? Array.Empty<string>();

        if (allowedOrigins.Length == 0)
        {
            throw new InvalidOperationException("AllowedOrigins must contain at least one origin.");
        }

        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials(); // <-- THIS IS THE MAGIC KEY FOR SIGNALR
    });
});
// --------------------------

// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
}


// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.Use(async (ctx, next) =>
{
    Console.WriteLine($"[REQ] {ctx.Request.Method} {ctx.Request.Path}");
    await next();
    Console.WriteLine($"[RES] {ctx.Response.StatusCode}");
});

app.MapGet("/api/ping", () => "pong");

app.UseCors("AllowAngular");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHub<ProjectHub>("/projectHub");

app.Run();
