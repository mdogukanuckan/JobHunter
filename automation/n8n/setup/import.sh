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
