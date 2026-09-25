# JobHunter browser-worker
# Resmi Playwright imaji: Node + Chromium + gereken sistem kutuphaneleri hazir gelir.
# Etiketteki surum package.json'daki "playwright" surumuyle AYNI olmali (tarayici surumu buna bagli).
FROM mcr.microsoft.com/playwright:v1.63.0-noble

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json* ./
RUN npm install --include=dev --no-audit --no-fund

COPY tsconfig.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

# Ekran goruntuleri /data/screenshots altina yazilir (docker-compose'da klasore baglanir).
RUN mkdir -p /data/screenshots && chown -R pwuser:pwuser /data
USER pwuser

EXPOSE 3100
CMD ["node", "dist/server.js"]
