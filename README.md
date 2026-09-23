# JobHunter

AI destekli is basvuru ve basvuru takip platformu.

## Mimari

- **Backend:** .NET 10, ASP.NET Core Web API, PostgreSQL, EF Core (Clean/Onion Architecture)
- **Frontend:** React + TypeScript + Vite + MUI
- **Automation:** n8n + Claude (browser automation) - Human Approval Mode / Automatic Mode
- **Notification:** WhatsApp Business Cloud API (n8n uzerinden)

## Proje Yapisi

```
src/
├── JobHunter.Domain          Entity'ler, enum'lar, domain interface'leri (framework bagimsiz)
├── JobHunter.Application     DTO'lar, servis interface'leri, validation
├── JobHunter.Infrastructure  EF Core, repository'ler, auth, storage, notification implementasyonlari
└── JobHunter.API              Controller'lar, middleware, DI, Swagger

tests/
├── JobHunter.Domain.Tests
├── JobHunter.Application.Tests
└── JobHunter.Integration.Tests

frontend/                      React + TypeScript + Vite (Faz 7'de eklenecek)
```

## Gelistirme Fazlari

| Faz | Kapsam | Durum |
|---|---|---|
| Faz 0 | Mimari kararlar (n8n webhook push, WhatsApp n8n uzerinden, custom JWT, AutomationJob 1-N) | Tamamlandi |
| Faz 1 | Backend iskeleti: katmanlar, DbContext, PostgreSQL, Swagger, `/health` | Tamamlandi |
| Faz 2 | Authentication: User/RefreshToken, register/login, JWT middleware | Tamamlandi |
| Faz 3 | Kanban pipeline: JobApplication, durum gecmisi, surukle-birak siralama | Tamamlandi |
| Faz 4 | CV yonetimi: yukleme/indirme/yeniden adlandirma/soft delete, basvuru → CV iliskisi | Tamamlandi |
| Faz 5 | Aday profili: iletisim/tercihler, yetenekler, deneyim, egitim, diller, hazir cevap bankasi, varsayilan CV | Devam ediyor |
| Faz 6 | Mulakatlar + ToDo'lar | Planlaniyor |
| Faz 7 | Frontend (React + TypeScript + Vite) | Planlaniyor |

## API Endpoint'leri

| Metot | Yol | Aciklama |
|---|---|---|
| GET | `/health` | Saglik kontrolu |
| POST | `/api/auth/register` | Kayit |
| POST | `/api/auth/login` | Giris (access + refresh token) |
| GET | `/api/job-applications` | Kanban panosu (tum kartlar) |
| GET | `/api/job-applications/{id}` | Kart detayi + durum gecmisi |
| POST | `/api/job-applications` | Yeni kart |
| PUT | `/api/job-applications/{id}` | Kart bilgilerini guncelle |
| PATCH | `/api/job-applications/{id}/move` | Karti sutun/sira degistirerek tasi |
| DELETE | `/api/job-applications/{id}` | Karti sil |
| GET | `/api/cvs` | CV listesi (silinmemisler) |
| POST | `/api/cvs` | CV yukle (multipart: `file`, `name`) |
| GET | `/api/cvs/{id}/download` | CV indir |
| PATCH | `/api/cvs/{id}` | CV'yi yeniden adlandir |
| DELETE | `/api/cvs/{id}` | CV'yi sil (soft delete) |
| GET | `/api/profile` | Profilin tamami (alt listelerle) |
| PUT | `/api/profile` | Profil ana alanlari (upsert) |
| POST | `/api/profile/experiences` | Is deneyimi ekle |
| PUT / DELETE | `/api/profile/experiences/{id}` | Is deneyimi guncelle / sil |
| POST | `/api/profile/educations` | Egitim ekle |
| PUT / DELETE | `/api/profile/educations/{id}` | Egitim guncelle / sil |
| POST | `/api/profile/languages` | Dil ekle |
| PUT / DELETE | `/api/profile/languages/{id}` | Dil guncelle / sil |
| POST | `/api/profile/screening-answers` | Hazir cevap ekle |
| PUT / DELETE | `/api/profile/screening-answers/{id}` | Hazir cevap guncelle / sil |

`/api/job-applications`, `/api/cvs` ve `/api/profile` endpoint'leri JWT gerektirir. Her kullanicinin tek bir profili vardir; silinen CV varsayilan CV ise profilden otomatik kaldirilir. CV'ler sadece PDF/DOCX, en fazla 5 MB; dosyalar `Storage:RootPath` altinda (bos ise `%LOCALAPPDATA%\JobHunter\uploads`) saklanir ve public URL ile sunulmaz. Kanban durumlari: `Wishlist`, `Applied`, `Interview`, `Offer`, `Rejected`, `Withdrawn`.

## Calistirma

```
dotnet user-secrets set "Jwt:Key" "<en-az-32-karakter>" --project src/JobHunter.API
dotnet ef database update --project src/JobHunter.Infrastructure --startup-project src/JobHunter.API
dotnet run --project src/JobHunter.API
```

Swagger: `http://localhost:5080/swagger` (Development ortami `launchSettings.json` ile ayarlanir).

## Gereksinimler

- .NET 10 SDK
- PostgreSQL
- Node.js (frontend icin)
