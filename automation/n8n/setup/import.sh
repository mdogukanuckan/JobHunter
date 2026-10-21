#!/bin/sh
# JobHunter credential'larini ve workflow'larini n8n'e yukler. Container ICINDE calisir:
#   docker compose exec n8n sh /setup/import.sh
# Tekrar calistirmak guvenlidir: ayni id'li kayitlarin uzerine yazar (anahtar degistiyse de kullanilir).
set -e

: "${JOBHUNTER_API_KEY:?.env dosyasinda JOBHUNTER_API_KEY bos}"
: "${JOBHUNTER_WEBHOOK_SECRET:?.env dosyasinda JOBHUNTER_WEBHOOK_SECRET bos}"
: "${BROWSER_WORKER_SECRET:?.env dosyasinda BROWSER_WORKER_SECRET bos (Faz 10)}"

for v in "$JOBHUNTER_API_KEY" "$JOBHUNTER_WEBHOOK_SECRET" "$BROWSER_WORKER_SECRET"; do
  case "$v" in
    *[!A-Za-z0-9_-]*) echo "HATA: anahtarlarda sadece harf, rakam, - ve _ olabilir." >&2; exit 1 ;;
  esac
done

# E-posta bildirimi (opsiyonel): SMTP bilgisi yoksa credential yine de yuklenir, boylece workflow
# calisir; e-posta dugumu hata verirse akis devam eder (onError), Telegram bildirimi etkilenmez.
SMTP_HOST="${SMTP_HOST:-localhost}"
SMTP_PORT="${SMTP_PORT:-587}"
SMTP_USER="${SMTP_USER:-}"
SMTP_PASSWORD="${SMTP_PASSWORD:-}"
SMTP_SECURE="${SMTP_SECURE:-false}"

for v in "$SMTP_HOST" "$SMTP_USER" "$SMTP_PASSWORD"; do
  case "$v" in
    *'"'*|*'\'*) echo "HATA: SMTP_* degerlerinde tirnak (\") veya ters bolu (\) olamaz." >&2; exit 1 ;;
  esac
done
case "$SMTP_PORT" in
  ""|*[!0-9]*) echo "HATA: SMTP_PORT sayi olmali." >&2; exit 1 ;;
esac
case "$SMTP_SECURE" in
  true|false) ;;
  *) echo "HATA: SMTP_SECURE true veya false olmali." >&2; exit 1 ;;
esac

TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

# Credential'lar duz metin verilir; n8n import sirasinda N8N_ENCRYPTION_KEY ile sifreler.
# Id'ler sabit: workflow JSON'u bu id'lere baglidir.
cat > "$TMP" <<JSON
[
  {
    "id": "jhApiKeyCred0001",
    "name": "JobHunter API Key",
    "type": "httpHeaderAuth",
    "data": { "name": "X-Automation-Key", "value": "$JOBHUNTER_API_KEY" }
  },
  {
    "id": "jhWebhookSecret1",
    "name": "JobHunter Webhook Secret",
    "type": "httpHeaderAuth",
    "data": { "name": "X-JobHunter-Secret", "value": "$JOBHUNTER_WEBHOOK_SECRET" }
  },
  {
    "id": "jhWorkerSecret01",
    "name": "JobHunter Worker Secret",
    "type": "httpHeaderAuth",
    "data": { "name": "X-Worker-Secret", "value": "$BROWSER_WORKER_SECRET" }
  },
  {
    "id": "jhSmtpCred000001",
    "name": "JobHunter SMTP",
    "type": "smtp",
    "data": { "host": "$SMTP_HOST", "port": $SMTP_PORT, "secure": $SMTP_SECURE, "user": "$SMTP_USER", "password": "$SMTP_PASSWORD" }
  }
]
JSON

echo ">> Credential'lar yukleniyor..."
n8n import:credentials --input="$TMP"

echo ">> Workflow'lar yukleniyor..."
n8n import:workflow --separate --input=/setup/workflows

echo ""
echo "Tamam. Simdi n8n arayuzunde 'JobHunter - Apply' workflow'unu ac ve aktif et (Active / Publish)."
echo "Not: import workflow'u pasif yapar; her import'tan sonra tekrar aktif etmelisin."
