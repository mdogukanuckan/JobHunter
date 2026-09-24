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

        // Faz 8: otomasyon cekirdegi (IAutomationDispatcher + AutomationOptions Infrastructure'da kaydedilir)
        services.AddScoped<IAutomationPayloadBuilder, AutomationPayloadBuilder>();
        services.AddScoped<IAutomationJobService, AutomationJobService>();
        services.AddScoped<IAutomationCallbackService, AutomationCallbackService>();

        return services;
    }
}
