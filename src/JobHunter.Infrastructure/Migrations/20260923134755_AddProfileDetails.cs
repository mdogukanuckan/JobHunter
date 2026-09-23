using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JobHunter.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddProfileDetails : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AddressLine",
                table: "CandidateProfiles",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "CanTravel",
                table: "CandidateProfiles",
                type: "boolean",
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "DateOfBirth",
                table: "CandidateProfiles",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "District",
                table: "CandidateProfiles",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<List<string>>(
                name: "DriverLicenseClasses",
                table: "CandidateProfiles",
                type: "text[]",
                nullable: false,
                // Elle eklendi: mevcut profil satirlari varsa NOT NULL kolon bos dizi ile doldurulur.
                defaultValue: new string[0]);

            migrationBuilder.AddColumn<int>(
                name: "DriverLicenseYear",
                table: "CandidateProfiles",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Gender",
                table: "CandidateProfiles",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "HasDisability",
                table: "CandidateProfiles",
                type: "boolean",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsSmoker",
                table: "CandidateProfiles",
                type: "boolean",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MaritalStatus",
                table: "CandidateProfiles",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "MilitaryPostponedUntil",
                table: "CandidateProfiles",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MilitaryServiceStatus",
                table: "CandidateProfiles",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Nationality",
                table: "CandidateProfiles",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PostalCode",
                table: "CandidateProfiles",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Certificates",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CandidateProfileId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Issuer = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    IssueDate = table.Column<DateOnly>(type: "date", nullable: true),
                    ExpiryDate = table.Column<DateOnly>(type: "date", nullable: true),
                    CredentialId = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    CredentialUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Certificates", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Certificates_CandidateProfiles_CandidateProfileId",
                        column: x => x.CandidateProfileId,
                        principalTable: "CandidateProfiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ProfileCustomFields",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CandidateProfileId = table.Column<Guid>(type: "uuid", nullable: false),
                    Label = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Value = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    Policy = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProfileCustomFields", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProfileCustomFields_CandidateProfiles_CandidateProfileId",
                        column: x => x.CandidateProfileId,
                        principalTable: "CandidateProfiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ProfileFieldPolicies",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CandidateProfileId = table.Column<Guid>(type: "uuid", nullable: false),
                    FieldKey = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Policy = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProfileFieldPolicies", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProfileFieldPolicies_CandidateProfiles_CandidateProfileId",
                        column: x => x.CandidateProfileId,
                        principalTable: "CandidateProfiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ProfileReferences",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CandidateProfileId = table.Column<Guid>(type: "uuid", nullable: false),
                    FullName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Company = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Relationship = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    PhoneNumber = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    Email = table.Column<string>(type: "character varying(254)", maxLength: 254, nullable: true),
                    Notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProfileReferences", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProfileReferences_CandidateProfiles_CandidateProfileId",
                        column: x => x.CandidateProfileId,
                        principalTable: "CandidateProfiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Certificates_CandidateProfileId",
                table: "Certificates",
                column: "CandidateProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_ProfileCustomFields_CandidateProfileId_Label",
                table: "ProfileCustomFields",
                columns: new[] { "CandidateProfileId", "Label" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProfileFieldPolicies_CandidateProfileId_FieldKey",
                table: "ProfileFieldPolicies",
                columns: new[] { "CandidateProfileId", "FieldKey" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProfileReferences_CandidateProfileId",
                table: "ProfileReferences",
                column: "CandidateProfileId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Certificates");

            migrationBuilder.DropTable(
                name: "ProfileCustomFields");

            migrationBuilder.DropTable(
                name: "ProfileFieldPolicies");

            migrationBuilder.DropTable(
                name: "ProfileReferences");

            migrationBuilder.DropColumn(
                name: "AddressLine",
                table: "CandidateProfiles");

            migrationBuilder.DropColumn(
                name: "CanTravel",
                table: "CandidateProfiles");

            migrationBuilder.DropColumn(
                name: "DateOfBirth",
                table: "CandidateProfiles");

            migrationBuilder.DropColumn(
                name: "District",
                table: "CandidateProfiles");

            migrationBuilder.DropColumn(
                name: "DriverLicenseClasses",
                table: "CandidateProfiles");

            migrationBuilder.DropColumn(
                name: "DriverLicenseYear",
                table: "CandidateProfiles");

            migrationBuilder.DropColumn(
                name: "Gender",
                table: "CandidateProfiles");

            migrationBuilder.DropColumn(
                name: "HasDisability",
                table: "CandidateProfiles");

            migrationBuilder.DropColumn(
                name: "IsSmoker",
                table: "CandidateProfiles");

            migrationBuilder.DropColumn(
                name: "MaritalStatus",
                table: "CandidateProfiles");

            migrationBuilder.DropColumn(
                name: "MilitaryPostponedUntil",
                table: "CandidateProfiles");

            migrationBuilder.DropColumn(
                name: "MilitaryServiceStatus",
                table: "CandidateProfiles");

            migrationBuilder.DropColumn(
                name: "Nationality",
                table: "CandidateProfiles");

            migrationBuilder.DropColumn(
                name: "PostalCode",
                table: "CandidateProfiles");
        }
    }
}
