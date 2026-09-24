using JobHunter.Application.Auth.Interfaces;
using JobHunter.Application.Automation;
using JobHunter.Application.Automation.Interfaces;
using JobHunter.Application.Common.Interfaces;
using JobHunter.Application.Cvs;
using JobHunter.Infrastructure.Auth;
using JobHunter.Infrastructure.Automation;
using JobHunter.Infrastructure.Persistence;
using JobHunter.Infrastructure.Storage;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace JobHunter.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<JobHunterDbContext>(options =>
                options.UseNpgsql(configuration.GetConnectionString("DefaultConnection")));

        services.AddScoped<IApplicationDbContext>(provider => provider.GetRequiredService<JobHunterDbContext>());

        services.AddScoped<IPasswordHasher, PasswordHasher>();
        services.AddScoped<IJwtTokenGenerator, JwtTokenGenerator>();

        // Durumsuz (stateless) oldugu icin tek instance yeterli.
        services.AddSingleton<IFileStorage, LocalFileStorage>();

        var maxCvSize = long.TryParse(configuration["Storage:MaxCvSizeBytes"], out var parsed) && parsed > 0
            ? parsed
            : CvUploadSettings.DefaultMaxSizeBytes;
        services.AddSingleton(new CvUploadSettings(maxCvSize));

        // Otomasyon ayarlari (appsettings "Automation" bolumu; ApiKey ve N8nWebhookSecret user-secrets'ta).
        var automationOptions = new AutomationOptions
        {
            ApiKey = configuration["Automation:ApiKey"],
            N8nWebhookUrl = configuration["Automation:N8nWebhookUrl"],
            N8nWebhookSecret = configuration["Automation:N8nWebhookSecret"],
            PublicBaseUrl = configuration["Automation:PublicBaseUrl"]
        };
        services.AddSingleton(automationOptions);

        // Faz 9: n8n adresi ayarliysa gercek webhook, degilse sadece log (n8n kapaliyken de backend calissin).
        // AddHttpClient: HttpClient'i fabrikadan alir (soket tukenmesi / DNS onbellegi sorunlari olmaz).
        if (!string.IsNullOrWhiteSpace(automationOptions.N8nWebhookUrl))
        {
            services.AddHttpClient<IAutomationDispatcher, N8nWebhookDispatcher>(client =>
            {
                // n8n webhook'u "hemen yanit ver" modunda: normalde milisaniyeler surer.
                client.Timeout = TimeSpan.FromSeconds(10);
            });
        }
        else
        {
            services.AddScoped<IAutomationDispatcher, LoggingAutomationDispatcher>();
        }

        return services;
    }
}
