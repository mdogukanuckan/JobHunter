using JobHunter.Application.Common.Exceptions;
using JobHunter.Application.Interviews.Dtos;
using JobHunter.Application.Interviews.Interfaces;
using JobHunter.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace JobHunter.API.Controllers;

/// <summary>Mulakatlar. Sadece kullanicinin kendi basvurularina ait mulakatlar gorunur.</summary>
[ApiController]
[Authorize]
[Route("api/interviews")]
public class InterviewsController : ControllerBase
{
    private readonly IInterviewService _service;

    public InterviewsController(IInterviewService service)
    {
        _service = service;
    }

    /// <summary>Filtreli liste (takvim gorunumu icin from/to). Ornek: ?from=2026-10-01T00:00:00Z&amp;to=2026-11-01T00:00:00Z</summary>
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<InterviewResponse>>> GetAll(
        [FromQuery] DateTimeOffset? from,
        [FromQuery] DateTimeOffset? to,
        [FromQuery] Guid? jobApplicationId,
        [FromQuery] InterviewOutcome? outcome,
        CancellationToken ct)
        => Ok(await _service.GetAllAsync(from, to, jobApplicationId, outcome, ct));

    /// <summary>Onumuzdeki 'days' gun (varsayilan 14, en fazla 90) icindeki, sonucu bekleyen mulakatlar.</summary>
    [HttpGet("upcoming")]
    public async Task<ActionResult<IReadOnlyList<InterviewResponse>>> GetUpcoming([FromQuery] int days = 14, CancellationToken ct = default)
        => Ok(await _service.GetUpcomingAsync(days, ct));

    [HttpGet("{id:guid}")]
    public Task<ActionResult<InterviewResponse>> GetById(Guid id, CancellationToken ct)
        => Handle(() => _service.GetByIdAsync(id, ct));

    /// <summary>Yeni mulakat. Basvuru Wishlist/Applied sutunundaysa kart otomatik Interview sutununa tasinir.</summary>
    [HttpPost]
    public async Task<ActionResult<InterviewResponse>> Create(CreateInterviewRequest request, CancellationToken ct)
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
    public Task<ActionResult<InterviewResponse>> Update(Guid id, UpdateInterviewRequest request, CancellationToken ct)
        => Handle(() => _service.UpdateAsync(id, request, ct));

    [HttpPatch("{id:guid}/outcome")]
    public Task<ActionResult<InterviewResponse>> SetOutcome(Guid id, SetInterviewOutcomeRequest request, CancellationToken ct)
        => Handle(() => _service.SetOutcomeAsync(id, request, ct));

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
