# browser-worker (Faz 10)

n8n'in çağırdığı küçük bir Node + TypeScript servisi. **Playwright** ile ilan sayfasını açar, başvuru
formunu okur, profil verisiyle eşleştirip doldurur; moda göre gönderir ya da "Gönder"den önce durur.

```
Backend ──webhook──▶ n8n ──POST /apply (X-Worker-Secret)──▶ browser-worker ──▶ ilan sitesi (Chromium)
   ▲                  │                                       │
   │   PATCH status   │        GET payload / GET cv           │
   └──────────────────┴──────── POST events (canlı günlük) ◀──┘   (X-Automation-Key)
```

- **n8n** orkestratör: işi alır, worker'ı çağırır, sonuca göre işin son durumunu yazar.
- **worker** tarayıcıyı sürer ve her adımı **doğrudan backend'e** günlük olarak yazar (arayüzde canlı görünür).
- Kişisel veri n8n → worker isteğinde **yok**: worker paketi ve CV'yi backend'den API anahtarıyla kendisi çeker.

## Dosyalar

| Dosya | Görevi |
|---|---|
| `src/server.ts` | HTTP servisi: `GET /health`, `POST /apply` |
| `src/apply.ts` | Akış: sayfayı aç → formu oku → doldur → (gönder) → sonuç |
| `src/form.ts` | Sayfadaki formu okur (alanlar, etiketler, butonlar) ve alan doldurur. Siteye özel kod yok. |
| `src/mapping.ts` | **Kural tabanlı eşleştirme** (Faz 10a): "bu alan profildeki hangi bilgi?" Faz 10b'de Claude API bu kararı verecek. |
| `src/text.ts` | Türkçe karakter / büyük-küçük harf bağımsız metin karşılaştırma |
| `src/backend.ts` | Backend callback uçları (payload, cv, events); 409 → iş iptal edildi |
| `src/cli.ts` | n8n ve backend **olmadan** deneme komutu |

## Sonuçlar (outcome)

| Worker sonucu | Anlamı | n8n'in yazdığı durum |
|---|---|---|
| `Submitted` | Gönderildi, onay sayfası görüldü (başvuru no alındıysa sonuçta yazar) | Completed |
| `ReadyForApproval` | İnsan onaylı mod: form dolu, "Gönder"e basılmadı | AwaitingApproval |
| `NeedsInput` | Zorunlu alan doldurulamadı (profilde yok, AskFirst, Never, CV yok) | AwaitingApproval |
| `Closed` | İlan başvuruya kapalı | Failed |
| `Failed` | Form yok, gönderim reddedildi (ör. mükerrer başvuru), zaman aşımı… | Failed |
| `Cancelled` | Kullanıcı iptal etti (backend 409) | — |

## Eşleştirme kuralları (Faz 10a)

Sırayla denenir:
1. **CV alanı** → denemeye sabitlenmiş CV.
2. **Onay kutusu** (KVKK / aydınlatma metni) → işaretlenir, günlüğe **uyarı** olarak yazılır.
3. **Serbest metin** (textarea) → hazır cevap bankasında benzer soru varsa o cevap.
4. **Sabit kurallar**: ad-soyad, e-posta, telefon, şehir, LinkedIn/GitHub, deneyim yılı, işe başlama süresi,
   İngilizce seviyesi, doğum tarihi, cinsiyet, askerlik, sürücü belgesi, maaş, uyruk, medeni durum…
   Politikalı alanlarda (Faz 5b): **Auto** → doldur, **AskFirst** → doldurma ("önce sorulmalı"), **Never** → doldurma.
   TC kimlik no hiçbir zaman doldurulmaz.
5. **Ek bilgiler** (label-value) → etiketi benzeyen.
6. **Hazır cevaplar** → soru metni benzeyen (ör. "Hibrit çalışmaya uygun musunuz?" ≈ "Denizli'de hibrit çalışmaya uygun musunuz?").
7. Hiçbiri değilse boş bırakılır; zorunluysa sonuç `NeedsInput` olur.

## Güvenlik

- `ALLOWED_HOSTS`: sadece bu sunuculardaki ilanlar açılır. **Faz 12'ye kadar sadece yerel test sitesi**
  (`localhost`, `127.0.0.1`, `host.docker.internal`). Başka bir adres gelirse iş Failed olur.
- `X-Worker-Secret`: n8n → worker isteği; yanlışsa 403.
- Port sadece `127.0.0.1:3100`'e açık (bilgisayar dışından erişilemez).
- İlan linkindeki `localhost`, container içinde `host.docker.internal`'a çevrilir (bilgisayardaki test sitesine gider).

## Çalıştırma

Docker ile (normal kullanım) — `automation/n8n` klasöründe:
```
docker compose up -d --build browser-worker
docker compose logs -f browser-worker
curl http://localhost:3100/health
```
Ekran görüntüleri: `automation/browser-worker/data/screenshots/` (git'e girmez).

### Docker'sız deneme (n8n ve backend olmadan)

Bilgisayarında (Node 22+), bu klasörde bir kez:
```
npm install
npx playwright install chromium
npm run build
```
Sonra mock-careers açıkken (`cd automation/mock-careers; node server.js`):
```
npm run try -- http://localhost:8088/ilan/junior-net-developer
npm run try -- http://localhost:8088/ilan/full-stack-developer-react-net --mode Automatic --headed
```
`--headed` tarayıcıyı görünür açar, formun dolduğunu izleyebilirsin. Veri: `samples/payload.sample.json`
(istersen `--payload` ile kendi dosyanı ver). CV verilmezse küçük bir test PDF'i üretilir.
