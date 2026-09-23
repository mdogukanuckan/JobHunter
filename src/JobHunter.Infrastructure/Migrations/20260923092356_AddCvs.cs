using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JobHunter.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCvs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "CvId",
                table: "JobApplications",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Cvs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    OriginalFileName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    StorageKey = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ContentType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    SizeBytes = table.Column<long>(type: "bigint", nullable: false),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Cvs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Cvs_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_JobApplications_CvId",
                table: "JobApplications",
                column: "CvId");

            migrationBuilder.CreateIndex(
                name: "IX_Cvs_StorageKey",
                table: "Cvs",
                column: "StorageKey",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Cvs_UserId_IsDeleted",
                table: "Cvs",
                columns: new[] { "UserId", "IsDeleted" });

            migrationBuilder.AddForeignKey(
                name: "FK_JobApplications_Cvs_CvId",
                table: "JobApplications",
                column: "CvId",
                principalTable: "Cvs",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_JobApplications_Cvs_CvId",
                table: "JobApplications");

            migrationBuilder.DropTable(
                name: "Cvs");

            migrationBuilder.DropIndex(
                name: "IX_JobApplications_CvId",
                table: "JobApplications");

            migrationBuilder.DropColumn(
                name: "CvId",
                table: "JobApplications");
        }
    }
}
