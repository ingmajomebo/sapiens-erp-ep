# syntax=docker/dockerfile:1

# ---------- Etapa de build ----------
FROM node:22-alpine AS build
WORKDIR /src

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# VITE_API_URL queda vacío a propósito: la tienda llama a /api en su mismo
# origen y Nginx lo enruta al backend. Así el bundle no lleva ninguna URL
# compilada y la misma imagen sirve para dev y para producción.
ENV VITE_DATA_SOURCE=api
ENV VITE_API_URL=""
RUN npm run build

# ---------- Etapa de runtime ----------
FROM nginx:1.27-alpine
COPY --from=build /src/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
