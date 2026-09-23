using JobHunter.Application.Auth.Interfaces;
using JobHunter.Application.Common.Interfaces;
using JobHunter.Application.Cvs;
using JobHunter.Infrastructure.Auth;
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

        return services;
    }
}
