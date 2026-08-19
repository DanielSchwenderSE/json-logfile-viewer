# syntax=docker/dockerfile:1

# --- Frontend bauen ---
FROM node:20-alpine AS web
WORKDIR /app/web
COPY apps/web/package*.json ./
RUN npm ci
COPY apps/web/ ./
RUN npm run build

# --- Backend bauen ---
FROM node:20-alpine AS api
WORKDIR /app/api
COPY apps/api/package*.json ./
RUN npm ci
COPY apps/api/ ./
RUN npm run build

# --- Laufzeit-Image ---
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
# Nur Produktions-Abhängigkeiten der API installieren.
COPY apps/api/package*.json ./
RUN npm ci --omit=dev
COPY --from=api /app/api/dist ./dist
COPY --from=web /app/web/dist ./web
ENV WEB_DIR=/app/web
ENV DATA_DIR=/app/data
EXPOSE 3001
CMD ["node", "dist/index.js"]
