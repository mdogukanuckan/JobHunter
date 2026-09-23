using JobHunter.Application.Common.Exceptions;
using JobHunter.Application.Todos.Dtos;
using JobHunter.Application.Todos.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace JobHunter.API.Controllers;

/// <summary>Yapilacaklar listesi. Gorevler genel olabilir veya bir basvuruya/mulakata baglanabilir.</summary>
[ApiController]
[Authorize]
[Route("api/todos")]
public class TodosController : ControllerBase
{
    private readonly ITodoService _service;

    public TodosController(ITodoService service)
    {
        _service = service;
    }

    /// <summary>Ornek: ?completed=false (acik gorevler), ?dueBefore=2026-10-01T00:00:00Z (gecikenler/yaklasanlar)</summary>
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<TodoResponse>>> GetAll(
        [FromQuery] bool? completed,
        [FromQuery] DateTimeOffset? dueBefore,
        [FromQuery] Guid? jobApplicationId,
        CancellationToken ct)
        => Ok(await _service.GetAllAsync(completed, dueBefore, jobApplicationId, ct));

    [HttpGet("{id:guid}")]
    public Task<ActionResult<TodoResponse>> GetById(Guid id, CancellationToken ct)
        => Handle(() => _service.GetByIdAsync(id, ct));

    [HttpPost]
    public async Task<ActionResult<TodoResponse>> Create(TodoRequest request, CancellationToken ct)
    {
        try
        {
            var result = await _service.CreateAsync(request, ct);
            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }
        catch (BusinessValidationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}")]
    public Task<ActionResult<TodoResponse>> Update(Guid id, TodoRequest request, CancellationToken ct)
        => Handle(() => _service.UpdateAsync(id, request, ct));

    /// <summary>Tamamla ({"isCompleted": true}) veya geri al ({"isCompleted": false}).</summary>
    [HttpPatch("{id:guid}/complete")]
    public Task<ActionResult<TodoResponse>> SetCompletion(Guid id, SetTodoCompletionRequest request, CancellationToken ct)
        => Handle(() => _service.SetCompletionAsync(id, request, ct));

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        try
        {
            await _service.DeleteAsync(id, ct);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    private async Task<ActionResult<T>> Handle<T>(Func<Task<T>> action)
    {
        try
        {
            return Ok(await action());
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (BusinessValidationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
