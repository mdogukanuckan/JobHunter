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

Faz 0 (Architecture) tamamlandi. Siradaki: Faz 1 - Backend Foundation.

## Gereksinimler

- .NET 10 SDK
- PostgreSQL
- Node.js (frontend icin)
