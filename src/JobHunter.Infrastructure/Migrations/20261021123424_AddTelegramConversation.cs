using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JobHunter.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddTelegramConversation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "TelegramConversationJson",
                table: "AutomationJobs",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "TelegramConversationJson",
                table: "AutomationJobs");
        }
    }
}
