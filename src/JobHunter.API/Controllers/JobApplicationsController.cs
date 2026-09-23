using JobHunter.Application.Cvs.Exceptions;
using JobHunter.Application.JobApplications.Dtos;
using JobHunter.Application.JobApplications.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace JobHunter.API.Controllers;

/// <summary>
/// Kanban basvuru endpoint'leri. Tum endpoint'ler gecerli bir JWT gerektirir.
/// </summary>
[ApiController]
[Authorize]
[Route("api/job-applications")]
public class JobApplicationsController : ControllerBase
{
    private readonly IJobApplicationService _service;

    public JobApplicationsController(IJobApplicationService service)
    {
        _service = service;
    }

    /// <summary>Kanban panosu: kullanicinin tum kartlari (sutun + sira bazinda sirali).</summary>
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<JobApplicationSummaryResponse>>> GetBoard(CancellationToken cancellationToken)
        => Ok(await _service.GetBoardAsync(cancellationToken));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<JobApplicationDetailResponse>> GetById(Guid id, CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _service.GetByIdAsync(id, cancellationToken));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpPost]
    public async Task<ActionResult<JobApplicationDetailResponse>> Create(CreateJobApplicationRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var result = await _service.CreateAsync(request, cancellationToken);
            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }
        catch (CvValidationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<JobApplicationDetailResponse>> Update(Guid id, UpdateJobApplicationRequest request, CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _service.UpdateAsync(id, request, cancellationToken));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (CvValidationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>Surukle-birak: karti hedef sutuna ve siraya tasir.</summary>
    [HttpPatch("{id:guid}/move")]
    public async Task<ActionResult<JobApplicationSummaryResponse>> Move(Guid id, MoveJobApplicationRequest request, CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _service.MoveAsync(id, request, cancellationToken));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        try
        {
            await _service.DeleteAsync(id, cancellationToken);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }
}
