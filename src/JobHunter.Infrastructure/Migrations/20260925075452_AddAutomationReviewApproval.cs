using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JobHunter.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddAutomationReviewApproval : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ApprovalAnswersJson",
                table: "AutomationJobs",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "KvkkAccepted",
                table: "AutomationJobs",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "ReviewReportJson",
                table: "AutomationJobs",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReviewScreenshotKey",
                table: "AutomationJobs",
                type: "character varying(260)",
                maxLength: 260,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ApprovalAnswersJson",
                table: "AutomationJobs");

            migrationBuilder.DropColumn(
                name: "KvkkAccepted",
                table: "AutomationJobs");

            migrationBuilder.DropColumn(
                name: "ReviewReportJson",
                table: "AutomationJobs");

            migrationBuilder.DropColumn(
                name: "ReviewScreenshotKey",
                table: "AutomationJobs");
        }
    }
}
