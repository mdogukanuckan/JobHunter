using JobHunter.Application.Auth.Interfaces;
using JobHunter.Application.Auth.Services;
using JobHunter.Application.JobApplications.Interfaces;
using JobHunter.Application.JobApplications.Services;
using Microsoft.Extensions.DependencyInjection;

namespace JobHunter.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IJobApplicationService, JobApplicationService>();

        return services;
    }
}
