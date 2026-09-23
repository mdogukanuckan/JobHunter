using JobHunter.Application.Common.Exceptions;
using JobHunter.Application.Common.Interfaces;
using JobHunter.Application.Todos.Dtos;
using JobHunter.Application.Todos.Interfaces;
using JobHunter.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace JobHunter.Application.Todos.Services;

public class TodoService : ITodoService
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public TodoService(IApplicationDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<IReadOnlyList<TodoResponse>> GetAllAsync(
        bool? completed, DateTimeOffset? dueBefore, Guid? jobApplicationId,
        CancellationToken cancellationToken = default)
    {
        var query = OwnedTodos().AsNoTracking();

        if (completed is { } c) query = query.Where(t => t.IsCompleted == c);
        if (dueBefore is { } d) query = query.Where(t => t.DueAt != null && t.DueAt < d.UtcDateTime);
        if (jobApplicationId is { } appId) query = query.Where(t => t.JobApplicationId == appId);

        var items = await query.ToListAsync(cancellationToken);
        return TodoMappings.DefaultOrder(items).Select(TodoMappings.ToResponse).ToList();
    }

    public async Task<TodoResponse> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        => TodoMappings.ToResponse(await FindOwnedAsync(id, cancellationToken));

    public async Task<TodoResponse> CreateAsync(TodoRequest request, CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.GetRequiredUserId();
        var todo = new TodoItem { UserId = userId };

        await ApplyAsync(todo, request, userId, cancellationToken);

        _context.TodoItems.Add(todo);
        await _context.SaveChangesAsync(cancellationToken);
        return TodoMappings.ToResponse(todo);
    }

    public async Task<TodoResponse> UpdateAsync(Guid id, TodoRequest request, CancellationToken cancellationToken = default)
    {
        var todo = await FindOwnedAsync(id, cancellationToken);

        await ApplyAsync(todo, request, todo.UserId, cancellationToken);
        todo.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        return TodoMappings.ToResponse(todo);
    }

    public async Task<TodoResponse> SetCompletionAsync(Guid id, SetTodoCompletionRequest request, CancellationToken cancellationToken = default)
    {
        var todo = await FindOwnedAsync(id, cancellationToken);

        // Ayni duruma tekrar set edilirse CompletedAt degismesin (ilk tamamlanma zamani korunur).
        if (todo.IsCompleted != request.IsCompleted)
        {
            var now = DateTime.UtcNow;
            todo.IsCompleted = request.IsCompleted;
            todo.CompletedAt = request.IsCompleted ? now : null;
            todo.UpdatedAt = now;
            await _context.SaveChangesAsync(cancellationToken);
        }

        return TodoMappings.ToResponse(todo);
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var todo = await FindOwnedAsync(id, cancellationToken);

        _context.TodoItems.Remove(todo);
        await _context.SaveChangesAsync(cancellationToken);
    }

    // ---------- Yardimci metotlar ----------

    private IQueryable<TodoItem> OwnedTodos()
    {
        var userId = _currentUser.GetRequiredUserId();
        return _context.TodoItems
            .Include(t => t.JobApplication)
            .Where(t => t.UserId == userId);
    }

    private async Task<TodoItem> FindOwnedAsync(Guid id, CancellationToken cancellationToken)
        => await OwnedTodos().FirstOrDefaultAsync(t => t.Id == id, cancellationToken)
           ?? throw new KeyNotFoundException("Gorev bulunamadi.");

    /// <summary>
    /// Istek alanlarini entity'ye yazar ve baglantilari dogrular:
    /// - InterviewId verildiyse mulakat kullanicinin olmali; basvuru mulakattan alinir.
    /// - Ikisi birden verildiyse mulakat o basvuruya ait olmali.
    /// - Sadece JobApplicationId verildiyse basvuru kullanicinin olmali.
    /// Baskasina ait Id'ler "bulunamadi" olarak raporlanir (varlik bilgisi sizdirilmaz).
    /// </summary>
    private async Task ApplyAsync(TodoItem todo, TodoRequest request, Guid userId, CancellationToken cancellationToken)
    {
        JobApplication? application = null;
        Interview? interview = null;

        if (request.InterviewId is { } interviewId)
        {
            interview = await _context.Interviews
                .Include(i => i.JobApplication)
                .FirstOrDefaultAsync(i => i.Id == interviewId && i.JobApplication.UserId == userId, cancellationToken)
                ?? throw new BusinessValidationException("Mulakat bulunamadi.");

            if (request.JobApplicationId is { } appId && appId != interview.JobApplicationId)
                throw new BusinessValidationException("Secilen mulakat bu basvuruya ait degil.");

            application = interview.JobApplication;
        }
        else if (request.JobApplicationId is { } appId)
        {
            application = await _context.JobApplications
                .FirstOrDefaultAsync(ja => ja.Id == appId && ja.UserId == userId, cancellationToken)
                ?? throw new BusinessValidationException("Basvuru bulunamadi.");
        }

        todo.Title = request.Title.Trim();
        todo.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
        todo.DueAt = request.DueAt?.UtcDateTime;
        todo.Priority = request.Priority;

        // FK ve navigation birlikte set edilir ki cevapta sirket/pozisyon adi hemen gorunsun.
        todo.JobApplication = application;
        todo.JobApplicationId = application?.Id;
        todo.Interview = interview;
        todo.InterviewId = interview?.Id;
    }
}
