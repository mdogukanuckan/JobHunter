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

frontend/src/
├── api/                       Axios istemcisi (token yenileme), endpoint fonksiyonlari, DTO tipleri
├── components/                Ortak bilesenler (SchemaFormDialog, ConfirmDialog, Notify)
├── features/                  Sayfa modulleri: board, cvs, profile, interviews
├── auth/ layout/ i18n/        Oturum, uygulama iskeleti, TR/EN ceviriler
└── utils/                     Hata mesaji, tarih/saat bicimlendirme
```

## Gelistirme Fazlari

| Faz | Kapsam | Durum |
|---|---|---|
| Faz 0 | Mimari kararlar (n8n webhook push, WhatsApp n8n uzerinden, custom JWT, AutomationJob 1-N) | Tamamlandi |
| Faz 1 | Backend iskeleti: katmanlar, DbContext, PostgreSQL, Swagger, `/health` | Tamamlandi |
| Faz 2 | Authentication: User/RefreshToken, register/login, JWT middleware | Tamamlandi |
| Faz 3 | Kanban pipeline: JobApplication, durum gecmisi, surukle-birak siralama | Tamamlandi |
| Faz 4 | CV yonetimi: yukleme/indirme/yeniden adlandirma/soft delete, basvuru → CV iliskisi | Tamamlandi |
| Faz 5 | Aday profili: iletisim/tercihler, yetenekler, deneyim, egitim, diller, hazir cevap bankasi, varsayilan CV | Tamamlandi |
| Faz 5b | Profil detaylari: adres, dogum tarihi, cinsiyet, medeni durum, uyruk, askerlik, ehliyet, seyahat/sigara/engellilik; sertifikalar, referanslar, ek bilgiler (etiket-deger); alan bazli otomasyon politikalari (Auto / AskFirst / Never). TC kimlik no bilincli olarak saklanmaz | Tamamlandi |
| Faz 6 | Mulakatlar (takvim, sonuc, otomatik Interview sutunu) + yapilacaklar (basvuru/mulakat baglantili) | Tamamlandi |
| Faz 7 | Frontend (React + TypeScript + Vite + MUI + TanStack Query + i18n TR/EN) | Tamamlandi |
| 7a | Iskelet, login/register, refresh token (httpOnly cookie), korumali rotalar, TR/EN | Tamamlandi |
| 7b | Kanban panosu: surukle-birak (@dnd-kit, optimistic update), kart ekle/duzenle/sil, detay paneli | Tamamlandi |
| 7c | CV sayfasi (surukle-birak yukleme, PDF onizleme, varsayilan CV) + Profil sayfasi (9 sekme, alan yaninda otomasyon politikasi) | Tamamlandi |
| 7d | Mulakatlar sayfasi (Yaklasan / Gecmis / aylik Takvim, sonuc girme, karttan mulakat ekleme) | Tamamlandi |
| 7d | Yapilacaklar sayfasi (hizli ekleme, son tarihe gore gruplar, oncelik, basvuru filtresi, karttan gorev ekleme/tamamlama, menu rozeti) | Tamamlandi |
| 7e | Yeni tasarim: ust menulu yerlesim (mobilde alt menu), 6 renk paleti, Acik/Koyu/Sistem modu (varsayilan Okyanus + Acik), Ayarlar sayfasi; tercih hesapta saklanir | Tamamlandi |
| 7d | PWA (manifest, service worker, guncelleme bildirimi, cevrimdisi uyarisi) + mobil pano (durum sekmeleri) | Tamamlandi |
| Faz 8 | Otomasyon cekirdegi: AutomationJob (deneme) + AutomationJobEvent (gunluk), durum makinesi, n8n callback'leri (X-Automation-Key), politikaya uyan veri paketi, IAutomationDispatcher (simdilik log) | Tamamlandi |
| Faz 9 | n8n entegrasyonu (gercek webhook) | Sirada |

## API Endpoint'leri

| Metot | Yol | Aciklama |
|---|---|---|
| GET | `/health` | Saglik kontrolu |
| POST | `/api/auth/register` | Kayit |
| POST | `/api/auth/login` | Giris (access token body'de, refresh token httpOnly cookie'de) |
| POST | `/api/auth/refresh` | Cookie'deki refresh token ile yeni access token (rotasyonlu) |
| POST | `/api/auth/logout` | Refresh token'i iptal eder, cookie'yi siler |
| GET | `/api/auth/me` | Giris yapmis kullanici |
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
| POST | `/api/profile/certificates` | Sertifika ekle |
| PUT / DELETE | `/api/profile/certificates/{id}` | Sertifika guncelle / sil |
| POST | `/api/profile/references` | Referans ekle |
| PUT / DELETE | `/api/profile/references/{id}` | Referans guncelle / sil |
| POST | `/api/profile/custom-fields` | Ek bilgi (etiket-deger + politika) ekle |
| PUT / DELETE | `/api/profile/custom-fields/{id}` | Ek bilgi guncelle / sil |
| PUT | `/api/profile/field-policies` | Otomasyon politikalarini kismi guncelle (`{ "policies": { "Gender": "Never" } }`) |
| GET | `/api/interviews` | Mulakat listesi (`from`, `to`, `jobApplicationId`, `outcome` filtreleri) |
| GET | `/api/interviews/upcoming?days=14` | Yaklasan, sonucu bekleyen mulakatlar |
| GET | `/api/interviews/{id}` | Mulakat detayi |
| POST | `/api/interviews` | Mulakat ekle (kart Wishlist/Applied ise Interview sutununa tasinir) |
| PUT / DELETE | `/api/interviews/{id}` | Mulakat guncelle / sil |
| PATCH | `/api/interviews/{id}/outcome` | Mulakat sonucu (Pending/Passed/Failed/Cancelled) |
| GET | `/api/todos` | Gorev listesi (`completed`, `dueBefore`, `jobApplicationId` filtreleri) |
| GET | `/api/todos/{id}` | Gorev detayi |
| POST | `/api/todos` | Gorev ekle (opsiyonel basvuru/mulakat baglantisi) |
| PUT / DELETE | `/api/todos/{id}` | Gorev guncelle / sil |
| PATCH | `/api/todos/{id}/complete` | Gorevi tamamla / geri al |
| POST | `/api/job-applications/{id}/automation-jobs` | Otomasyon denemesi baslat (govde opsiyonel: `{ "mode": "HumanApproval" }` veya `Automatic`). 400: ilan linki yok, 409: devam eden deneme var |
| GET | `/api/automation-jobs` | Denemeler, en yeni ustte (`jobApplicationId`, `status` filtreleri) |
| GET | `/api/automation-jobs/{id}` | Deneme detayi + adim adim gunluk (`events`) |
| POST | `/api/automation-jobs/{id}/cancel` | Iptal (govde opsiyonel: `{ "reason": "..." }`). 409: is zaten bitmis |
| GET | `/api/automation-jobs/{id}/payload` | n8n'e verilecek veri paketinin onizlemesi |
| GET / PUT | `/api/settings/appearance` | Tema tercihi (`palette`: Forest, Midnight, Coral, Plum, Graphite, Ocean; `mode`: System, Light, Dark). Login/refresh cevabinda `appearance` olarak da doner |

### n8n callback endpoint'leri (JWT degil, `X-Automation-Key` header'i)

| Metot | Yol | Aciklama |
|---|---|---|
| GET | `/api/automation/n8n/jobs/{jobId}/payload` | Formu doldurmak icin veri paketi (profil, politikali alanlar, hazir cevaplar, CV linki) |
| GET | `/api/automation/n8n/jobs/{jobId}/cv` | Denemeye sabitlenmis CV dosyasi |
| PATCH | `/api/automation/n8n/jobs/{jobId}/status` | Durum bildir: `{ "status": "Running" }`, `{ "status": "Failed", "errorMessage": "..." }`, `{ "status": "Completed", "resultSummary": "..." }` |
| POST | `/api/automation/n8n/jobs/{jobId}/events` | Gunluge satir ekle: `{ "level": "Info", "step": "upload_cv", "message": "CV yuklendi", "data": { } }` |

Durum akisi: `Queued → Running ⇄ AwaitingApproval → Completed / Failed / Cancelled`. Bitmis bir ise (veya gecersiz gecise) **409** doner; n8n akisi bunu "dur" sinyali olarak kullanir. Ayni durumu tekrar gondermek hata degildir. Politikasi `Never` olan alanlar pakette `value: null` gelir, `Never` ek bilgiler hic gelmez. Anahtar ayarlanmamissa bu endpoint'ler 503 doner.

`/api/job-applications`, `/api/cvs`, `/api/profile`, `/api/interviews`, `/api/todos`, `/api/automation-jobs` ve `/api/settings` endpoint'leri JWT gerektirir. Zamanlar UTC saklanir; istekte saat dilimli (`+03:00`) veya `Z` ile gonderilmelidir. Her kullanicinin tek bir profili vardir; silinen CV varsayilan CV ise profilden otomatik kaldirilir. CV'ler sadece PDF/DOCX, en fazla 5 MB; dosyalar `Storage:RootPath` altinda (bos ise `%LOCALAPPDATA%\JobHunter\uploads`) saklanir ve public URL ile sunulmaz. Kanban durumlari: `Wishlist`, `Applied`, `Interview`, `Offer`, `Rejected`, `Withdrawn`.

## Calistirma

```
dotnet user-secrets set "Jwt:Key" "<en-az-32-karakter>" --project src/JobHunter.API
dotnet user-secrets set "Automation:ApiKey" "<uzun-rastgele-anahtar>" --project src/JobHunter.API
dotnet ef database update --project src/JobHunter.Infrastructure --startup-project src/JobHunter.API
dotnet run --project src/JobHunter.API
```

Frontend (ayri terminalde, API `http` profiliyle calisirken):

```
cd frontend
npm install
npm run dev
```

Uygulama: `http://localhost:5173` (Vite, `/api` isteklerini `localhost:5080`'e proxy'ler).

Swagger: `http://localhost:5080/swagger` (Development ortami `launchSettings.json` ile ayarlanir).

## Gereksinimler

- .NET 10 SDK
- PostgreSQL
- Node.js (frontend icin)
