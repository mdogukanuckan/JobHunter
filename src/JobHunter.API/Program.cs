using System.Text;
using System.Text.Json.Serialization;
using JobHunter.API.Security;
using JobHunter.API.Services;
using JobHunter.Application.Automation;
using JobHunter.Application;
using JobHunter.Application.Common.Interfaces;
using JobHunter.Infrastructure;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();

// n8n callback'lerini koruyan API anahtari filtresi (bkz. AutomationCallbackController).
builder.Services.AddScoped<AutomationApiKeyFilter>();

var jwtSection = builder.Configuration.GetSection("Jwt");
var jwtKey = jwtSection["Key"] ?? throw new InvalidOperationException("Jwt:Key yapilandirilmamis.");

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtSection["Issuer"],
            ValidAudience = jwtSection["Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });

builder.Services.AddAuthorization();

builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "JWT access token'i 'Bearer {token}' formatinda gir."
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });

    // n8n callback endpoint'lerini Swagger'dan denemek icin: "Authorize" → AutomationKey kutusuna anahtari yaz.
    options.AddSecurityDefinition("AutomationKey", new OpenApiSecurityScheme
    {
        Name = AutomationCallbackPaths.HeaderName,
        Type = SecuritySchemeType.ApiKey,
        In = ParameterLocation.Header,
        Description = "n8n callback'leri icin API anahtari (Automation:ApiKey)."
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "AutomationKey"
                }
            },
            Array.Empty<string>()
        }
    });
});

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // Enum'lar JSON'da 0/1 yerine "Applied" gibi yazi olarak gider/gelir.
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/health", () => Results.Ok(new { status = "healthy" }))
    .WithName("HealthCheck");

app.MapControllers();

app.Run();
