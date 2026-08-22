# syntax=docker/dockerfile:1

# ---------- Etapa de build ----------
FROM node:22-alpine AS build
WORKDIR /src

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# VITE_API_URL queda vacío a propósito: el frontend llama a /api/v1 en su
# mismo origen y Nginx lo enruta al backend. Sin cross-origin, sin preflight.
RUN npm run build

# ---------- Etapa de runtime ----------
FROM nginx:1.27-alpine
COPY --from=build /src/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
