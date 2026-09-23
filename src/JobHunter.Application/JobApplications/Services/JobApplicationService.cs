using JobHunter.Application.Common.Interfaces;
using JobHunter.Application.JobApplications.Dtos;
using JobHunter.Application.JobApplications.Interfaces;
using JobHunter.Domain.Entities;
using JobHunter.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace JobHunter.Application.JobApplications.Services;

public class JobApplicationService : IJobApplicationService
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public JobApplicationService(IApplicationDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<IReadOnlyList<JobApplicationSummaryResponse>> GetBoardAsync(CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.GetRequiredUserId();

        var items = await _context.JobApplications
            .AsNoTracking()
            .Where(ja => ja.UserId == userId)
            .ToListAsync(cancellationToken);

        // Siralama bellekte yapilir: Status DB'de string oldugu icin SQL'de alfabetik siralanirdi.
        return items
            .OrderBy(ja => ja.Status)
            .ThenBy(ja => ja.Position)
            .Select(ToSummary)
            .ToList();
    }

    public async Task<JobApplicationDetailResponse> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var application = await FindOwnedAsync(id, includeHistory: true, cancellationToken);
        return ToDetail(application);
    }

    public async Task<JobApplicationDetailResponse> CreateAsync(CreateJobApplicationRequest request, CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.GetRequiredUserId();

        // Yeni kart hedef sutunun en altina eklenir.
        var position = await _context.JobApplications
            .CountAsync(ja => ja.UserId == userId && ja.Status == request.Status, cancellationToken);

        var application = new JobApplication
        {
            UserId = userId,
            CompanyName = request.CompanyName.Trim(),
            JobTitle = request.JobTitle.Trim(),
            JobUrl = request.JobUrl,
            Location = request.Location,
            Source = request.Source,
            JobDescription = request.JobDescription,
            Notes = request.Notes,
            Status = request.Status,
            Position = position
        };

        MarkAppliedIfNeeded(application);

        application.StatusHistory.Add(new ApplicationStatusHistory
        {
            FromStatus = null,
            ToStatus = request.Status
        });

        _context.JobApplications.Add(application);
        await _context.SaveChangesAsync(cancellationToken);

        return ToDetail(application);
    }

    public async Task<JobApplicationDetailResponse> UpdateAsync(Guid id, UpdateJobApplicationRequest request, CancellationToken cancellationToken = default)
    {
        var application = await FindOwnedAsync(id, includeHistory: true, cancellationToken);

        application.CompanyName = request.CompanyName.Trim();
        application.JobTitle = request.JobTitle.Trim();
        application.JobUrl = request.JobUrl;
        application.Location = request.Location;
        application.Source = request.Source;
        application.JobDescription = request.JobDescription;
        application.Notes = request.Notes;
        application.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        return ToDetail(application);
    }

    public async Task<JobApplicationSummaryResponse> MoveAsync(Guid id, MoveJobApplicationRequest request, CancellationToken cancellationToken = default)
    {
        var application = await FindOwnedAsync(id, includeHistory: false, cancellationToken);
        var userId = application.UserId;
        var fromStatus = application.Status;
        var toStatus = request.Status;
        var now = DateTime.UtcNow;

        // Hedef sutundaki diger kartlar (tasinan kart haric), mevcut sirasiyla.
        var targetColumn = await _context.JobApplications
            .Where(ja => ja.UserId == userId && ja.Status == toStatus && ja.Id != application.Id)
            .OrderBy(ja => ja.Position)
            .ToListAsync(cancellationToken);

        // Istenen sira sutun boyutunu asarsa en alta koy.
        var targetIndex = Math.Min(request.Position, targetColumn.Count);
        targetColumn.Insert(targetIndex, application);
        Renumber(targetColumn, now);

        if (fromStatus != toStatus)
        {
            // Kaynak sutundaki bosluk kapatilir.
            var sourceColumn = await _context.JobApplications
                .Where(ja => ja.UserId == userId && ja.Status == fromStatus && ja.Id != application.Id)
                .OrderBy(ja => ja.Position)
                .ToListAsync(cancellationToken);
            Renumber(sourceColumn, now);

            application.Status = toStatus;
            application.UpdatedAt = now;
            MarkAppliedIfNeeded(application);

            _context.ApplicationStatusHistories.Add(new ApplicationStatusHistory
            {
                JobApplicationId = application.Id,
                FromStatus = fromStatus,
                ToStatus = toStatus,
                ChangedAt = now
            });
        }

        await _context.SaveChangesAsync(cancellationToken);

        return ToSummary(application);
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var application = await FindOwnedAsync(id, includeHistory: false, cancellationToken);

        _context.JobApplications.Remove(application);

        // Silinen kartin sutunundaki bosluk kapatilir.
        var column = await _context.JobApplications
            .Where(ja => ja.UserId == application.UserId && ja.Status == application.Status && ja.Id != application.Id)
            .OrderBy(ja => ja.Position)
            .ToListAsync(cancellationToken);
        Renumber(column, DateTime.UtcNow);

        await _context.SaveChangesAsync(cancellationToken);
    }

    // ---------- Yardimci metotlar ----------

    private async Task<JobApplication> FindOwnedAsync(Guid id, bool includeHistory, CancellationToken cancellationToken)
    {
        var userId = _currentUser.GetRequiredUserId();

        IQueryable<JobApplication> query = _context.JobApplications;
        if (includeHistory)
        {
            query = query.Include(ja => ja.StatusHistory);
        }

        // Baskasinin kaydi da "bulunamadi" doner; kaydin varligi disari sizdirilmaz.
        return await query.FirstOrDefaultAsync(ja => ja.Id == id && ja.UserId == userId, cancellationToken)
               ?? throw new KeyNotFoundException("Basvuru bulunamadi.");
    }

    /// <summary>Sutundaki kartlara 0'dan baslayarak ardisik sira verir; sadece degisenler guncellenir.</summary>
    private static void Renumber(List<JobApplication> column, DateTime now)
    {
        for (var i = 0; i < column.Count; i++)
        {
            if (column[i].Position != i)
            {
                column[i].Position = i;
                column[i].UpdatedAt = now;
            }
        }
    }

    /// <summary>Kart Wishlist disinda bir sutuna ilk kez girdiginde basvuru tarihini isaretler.</summary>
    private static void MarkAppliedIfNeeded(JobApplication application)
    {
        if (application.Status != ApplicationStatus.Wishlist && application.AppliedAt is null)
        {
            application.AppliedAt = DateTime.UtcNow;
        }
    }

    private static JobApplicationSummaryResponse ToSummary(JobApplication ja) => new(
        ja.Id, ja.CompanyName, ja.JobTitle, ja.Location, ja.Source,
        ja.Status, ja.Position, ja.AppliedAt, ja.CreatedAt, ja.UpdatedAt);

    private static JobApplicationDetailResponse ToDetail(JobApplication ja) => new(
        ja.Id, ja.CompanyName, ja.JobTitle, ja.JobUrl, ja.Location, ja.Source,
        ja.JobDescription, ja.Notes, ja.Status, ja.Position, ja.AppliedAt,
        ja.CreatedAt, ja.UpdatedAt,
        ja.StatusHistory
            .OrderBy(h => h.ChangedAt)
            .Select(h => new StatusHistoryResponse(h.FromStatus, h.ToStatus, h.ChangedAt))
            .ToList());
}
