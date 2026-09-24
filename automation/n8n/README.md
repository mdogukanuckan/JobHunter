# n8n (JobHunter otomasyon motoru)

Backend bir basvuru icin otomasyon baslatinca n8n'e haber verir; n8n isi adim adim yurutur ve her adimi
backend'e geri bildirir. Faz 9'da workflow bir **iskelet**: veriyi ceker, CV'yi indirir, gunluge yazar
ama formu henuz doldurmaz (o is Faz 10).

```
Backend ──POST (X-JobHunter-Secret)──▶ n8n Webhook
   ▲                                      │
   └──── PATCH status / POST events ──────┘  (X-Automation-Key)
         GET payload / GET cv
```

## Ilk kurulum (bir kez)

1. **Anahtarlar.** `automation/n8n/.env.example` dosyasini `.env` olarak kopyala, uc degeri doldur:
   - `N8N_ENCRYPTION_KEY`: yeni uret
   - `JOBHUNTER_API_KEY`: backend'deki `Automation:ApiKey` ile ayni (`dotnet user-secrets list --project src/JobHunter.API`)
   - `JOBHUNTER_WEBHOOK_SECRET`: yeni uret, ayni degeri backend'e de yaz:
     ```
     dotnet user-secrets set "Automation:N8nWebhookSecret" "<ayni-deger>" --project src/JobHunter.API
     ```
2. **n8n'i baslat** (Docker Desktop acik olmali):
   ```
   cd automation/n8n
   docker compose up -d
   ```
   `http://localhost:5678` → ilk acilista sahip (owner) hesabi olustur.
3. **Credential + workflow yukle:**
   ```
   docker compose exec n8n sh /setup/import.sh
   ```
4. n8n'de sayfayi yenile → **JobHunter - Apply** workflow'unu ac → sag ustten **aktif et** (Active / Publish).
   Aktif olmayan workflow'un webhook'u kapalidir; backend 404 alir ve is Failed olur.

## Temel kavramlar

| Kavram | Bizde ne |
|---|---|
| **Workflow** | Bir otomasyon akisi. Bizde `JobHunter - Apply`. |
| **Node** | Akistaki tek adim (Webhook, HTTP Request, Code, IF...). |
| **Trigger** | Akisi baslatan node. Bizde `Webhook`: backend POST atinca calisir. |
| **Item / $json** | Node'lar arasinda akan veri. `$json` = onceki node'un ciktisi. |
| **Expression** | `{{ ... }}` icindeki JavaScript. Ornek: `{{ $('İş bilgisi').first().json.statusUrl }}` → baska bir node'un ciktisina adiyla ulasir. |
| **Credential** | Sifreli saklanan gizli bilgi. Workflow JSON'unda anahtar yok, sadece credential'in id'si var. Iki tane: `JobHunter API Key` (n8n → backend) ve `JobHunter Webhook Secret` (backend → n8n). |
| **Execution** | Workflow'un bir calismasi. Sol menu → Executions: her node'un girdi/ciktisini gorursun. Hata ayiklamanin ana araci. |
| **Error output** | Node ayari "On Error → Continue (using error output)". Node hata verirse akis kirmizi cikistan devam eder. Bizde butun hata cikislari `Hatayı hazırla` → `Durum: Failed` dalina gider (try/catch gibi). |

### Test URL ve Production URL
Webhook node'unun iki adresi vardir:
- `.../webhook-test/jobhunter-apply`: editorde **"Listen for test event"** a basinca bir kez dinler; calisma ekranda canli gorunur. Denemek icin backend'deki `Automation:N8nWebhookUrl`'i gecici olarak buna cevirebilirsin.
- `.../webhook/jobhunter-apply`: workflow **aktifken** her zaman dinler. Backend varsayilan olarak bunu kullanir.

## Akis

`Webhook` → `İş bilgisi` → `Durum: Running` → `Veri paketini çek` → `Paketi özetle` → `Günlük: paket alındı`
→ `CV var mı?` → (`CV indir` → `CV kontrol` → `Günlük: CV indirildi`) veya `Günlük: CV yok`
→ `Faz 10: tarayıcı otomasyonu` (simdilik bos) → `Sonuç durumu`

- **Sonuç:** `HumanApproval` modunda is `AwaitingApproval`'a duser (Faz 11 onay ekrani burada devreye girecek),
  `Automatic` modunda "Simulasyon" notuyla `Completed` olur. Kanban karti hareket etmez.
- **Iptal:** Kullanici isi iptal ederse n8n'in sonraki istegi 409 alir → hata dali calisir → `Durum: Failed` da 409 alir
  ve sessizce biter. Yani iptal, akisi bir sonraki adimda durdurur.
- **Kisisel veri:** Execution kayitlari veri paketini (profil) icerir; 14 gunden eskileri otomatik silinir (`docker-compose.yml`).

## Workflow'u degistirince

n8n arayuzunde yaptigin degisiklikler n8n'in veritabaninda kalir. Repoya da islemek icin:
workflow → `...` menusu → **Download** → `automation/n8n/setup/workflows/jobhunter-apply.json` uzerine kaydet.

## Sorun giderme

| Belirti | Neden / Cozum |
|---|---|
| Is hemen Failed: "n8n webhook 404" | Workflow aktif degil. |
| Is hemen Failed: "403" | `JOBHUNTER_WEBHOOK_SECRET` ile backend'deki `N8nWebhookSecret` farkli. Degistirdiysen `import.sh`'i tekrar calistir. |
| Is Failed: "baglanamadi / 10 saniye" | n8n calismiyor (`docker compose ps`). |
| Is Running'de kaldi, n8n'de `Durum: Running` 401 | `JOBHUNTER_API_KEY`, backend'deki `Automation:ApiKey` ile ayni degil. |
| n8n backend'e ulasamiyor (ECONNREFUSED) | Backend calismiyor, ya da `PublicBaseUrl` `http://host.docker.internal:5080` degil (bkz. `appsettings.Development.json`). |
| `import.sh`: "credentials import failed" | Credential'lari arayuzden ayni isimlerle elle olustur (tip: Header Auth), sonra workflow'daki HTTP node'larinda sec. |
