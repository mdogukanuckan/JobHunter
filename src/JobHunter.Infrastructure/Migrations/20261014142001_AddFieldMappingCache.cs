using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JobHunter.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddFieldMappingCache : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "FieldMappingCaches",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CandidateProfileId = table.Column<Guid>(type: "uuid", nullable: false),
                    NormalizedLabel = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    FieldType = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    TargetKind = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    TargetKey = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FieldMappingCaches", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FieldMappingCaches_CandidateProfiles_CandidateProfileId",
                        column: x => x.CandidateProfileId,
                        principalTable: "CandidateProfiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_FieldMappingCaches_CandidateProfileId_NormalizedLabel_Field~",
                table: "FieldMappingCaches",
                columns: new[] { "CandidateProfileId", "NormalizedLabel", "FieldType" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "FieldMappingCaches");
        }
    }
}
