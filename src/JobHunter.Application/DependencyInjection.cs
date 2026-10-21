using JobHunter.Application.Auth.Interfaces;
using JobHunter.Application.Automation.Interfaces;
using JobHunter.Application.Automation.Services;
using JobHunter.Application.Auth.Services;
using JobHunter.Application.Cvs.Interfaces;
using JobHunter.Application.Cvs.Services;
using JobHunter.Application.Interviews.Interfaces;
using JobHunter.Application.Interviews.Services;
using JobHunter.Application.JobApplications.Interfaces;
using JobHunter.Application.JobApplications.Services;
using JobHunter.Application.Profiles.Interfaces;
using JobHunter.Application.Profiles.Services;
using JobHunter.Application.Settings.Interfaces;
using JobHunter.Application.Settings.Services;
using JobHunter.Application.Todos.Interfaces;
using JobHunter.Application.Todos.Services;
using Microsoft.Extensions.DependencyInjection;

namespace JobHunter.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IJobApplicationService, JobApplicationService>();
        services.AddScoped<ICvService, CvService>();
        services.AddScoped<ICandidateProfileService, CandidateProfileService>();
        services.AddScoped<IInterviewService, InterviewService>();
        services.AddScoped<ITodoService, TodoService>();
        services.AddScoped<ISettingsService, SettingsService>();
        // Ayni sinif iki arayuzle sunulur: kullanici (JWT) yolu ve sistemin kullanici adina okudugu yol.
        services.AddScoped<UserSecretService>();
        services.AddScoped<IUserSecretService>(sp => sp.GetRequiredService<UserSecretService>());
        services.AddScoped<IUserSecretReader>(sp => sp.GetRequiredService<UserSecretService>());

        // Faz 8: otomasyon cekirdegi (IAutomationDispatcher + AutomationOptions Infrastructure'da kaydedilir)
        services.AddScoped<IAutomationPayloadBuilder, AutomationPayloadBuilder>();
        // Ayni sinif iki arayuzle sunulur: kullanici (JWT) yolu ve guvenilir kanal (Telegram) yolu.
        services.AddScoped<AutomationJobService>();
        services.AddScoped<IAutomationJobService>(sp => sp.GetRequiredService<AutomationJobService>());
        services.AddScoped<IAutomationChannelService>(sp => sp.GetRequiredService<AutomationJobService>());
        services.AddScoped<IAutomationCallbackService, AutomationCallbackService>();
        services.AddScoped<IFieldMappingService, FieldMappingService>();

        return services;
    }
}
