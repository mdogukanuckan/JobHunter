using JobHunter.Application.Todos.Dtos;

namespace JobHunter.Application.Todos.Interfaces;

/// <summary>Giris yapmis kullanicinin yapilacaklar listesi.</summary>
public interface ITodoService
{
    /// <summary>Filtreli liste. completed=null ise hepsi; dueBefore verilirse sadece o tarihten once bitmesi gerekenler.</summary>
    Task<IReadOnlyList<TodoResponse>> GetAllAsync(
        bool? completed, DateTimeOffset? dueBefore, Guid? jobApplicationId,
        CancellationToken cancellationToken = default);

    Task<TodoResponse> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<TodoResponse> CreateAsync(TodoRequest request, CancellationToken cancellationToken = default);
    Task<TodoResponse> UpdateAsync(Guid id, TodoRequest request, CancellationToken cancellationToken = default);
    Task<TodoResponse> SetCompletionAsync(Guid id, SetTodoCompletionRequest request, CancellationToken cancellationToken = default);
    Task DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
