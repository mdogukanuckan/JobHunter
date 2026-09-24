# Sahte kariyer sitesi (mock-careers)

JobHunter otomasyonunu (Faz 10+) gerçek bir şirkete istek atmadan test etmek için yerel, kurgusal bir kariyer sitesi.
Bağımlılık yok; yalnızca Node.js 18+ gerekir (`npm install` gerekmez).

## Çalıştırma

```powershell
cd automation/mock-careers
node server.js          # veya: npm start
```

| Adres | Ne işe yarar |
|---|---|
| http://localhost:8088 | İlan listesi |
| http://localhost:8088/admin | Gelen başvurular (tablo, CV linki, tüm alanlar) |
| http://localhost:8088/api/submissions | Başvurular JSON (`?job=<slug>` ile filtre) |
| `DELETE /api/submissions` | Tüm başvuruları siler (admin sayfasında "Tümünü sil" düğmesi de var) |
| http://host.docker.internal:8088 | n8n container'ı içinden erişim adresi |

Port değiştirmek için: `$env:PORT=9000; node server.js` (PowerShell).
Windows Güvenlik Duvarı ilk çalıştırmada izin sorabilir — n8n (Docker) erişebilsin diye "Özel ağ" için izin verin.

## Test senaryoları

| İlan | URL | Senaryo |
|---|---|---|
| Junior .NET Developer | `/ilan/junior-net-developer` | Tek sayfalık form (kişisel bilgiler, CV, 2 soru, KVKK) |
| Full Stack Developer (React / .NET) | `/ilan/full-stack-developer-react-net` | 3 adımlı sihirbaz: Kişisel → Deneyim ve CV → Ön değerlendirme (askerlik, ehliyet, İngilizce seviyesi, maaş beklentisi…) |
| Dijital Pazarlama Uzmanı | `/ilan/dijital-pazarlama-uzmani` | Başvurusu **kapanmış** ilan (form yok; POST → 410) |

Sunucunun verdiği yanıtlar:

| Durum | HTTP | Sayfada |
|---|---|---|
| Başarılı | 303 → `/basvuru/<no>` | `#application-confirmation`, `#reference-number` (ör. `BSV-20260924-A59F2C`) |
| Eksik/hatalı alan | 422 | `#form-errors` özeti + her alanın altında `.field-error` |
| Aynı e-postayla aynı ilana ikinci başvuru | 409 | "daha önce başvuru yapılmış" hatası |
| Kapalı ilan | 410 | `#job-closed` |

Sunucu tarafı kontroller: zorunlu alanlar, e-posta/telefon/URL biçimi, sayı aralığı, listede olmayan seçenek, CV yalnızca PDF (`%PDF` imzası) ve en fazla 5 MB.

**Tarayıcı doğrulamasını kapatmak:** ilan adresine `?novalidate=1` eklenirse (`/ilan/junior-net-developer?novalidate=1`) HTML `required` kontrolleri devre dışı kalır; böylece sunucu hatalarının (422) otomasyonda nasıl yakalandığı test edilebilir.

## Otomasyon için ipuçları

- Form: `#application-form`; her alanın `id` ve `name` değeri aynıdır (`fullName`, `email`, `phone`, `city`, `cv`, `kvkkConsent`…) ve `<label for>` ile bağlıdır.
- Sihirbazda adımlar `[data-step="0..2"]`, gezinme düğmeleri `[data-step-nav=next|prev]`, gönder düğmesi `#submit-application`.
- İlan sayfasında schema.org `JobPosting` JSON-LD bulunur (başlık, şirket, konum, son başvuru tarihi).
- Terminalde her istek loglanır: `BAŞVURU ALINDI`, `DOĞRULAMA HATASI`, `REDDEDİLDİ (mükerrer)`…

## Hızlı curl testi

```bash
curl -i -F "fullName=Test Aday" -F email=test@example.com -F "phone=0532 123 45 67" \
     -F city=Denizli -F cv=@ornek.pdf -F yearsExperience=2 -F relocate=Evet -F kvkkConsent=on \
     http://localhost:8088/ilan/junior-net-developer/basvur
```

## Veriler

Başvurular `data/submissions/<başvuru-no>/` altında (`application.json` + `cv.pdf`) tutulur; klasör `.gitignore`'dadır.
Yeni ilan eklemek için `jobs.js` içindeki `jobs` dizisine bir kayıt eklemek yeterli — form ve doğrulama bu tanımlardan otomatik üretilir.
