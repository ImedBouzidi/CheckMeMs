# chess-web — Angular SPA served by nginx (host port 4200).
# The app config in src/app/core/config/app-config.ts points the browser at
# http://localhost:8081 (gateway) — the same URL the redirect URIs in the realm use.
FROM node:20-alpine AS build
ARG NG_BUILD_CONFIG=production
WORKDIR /web
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx ng build --configuration ${NG_BUILD_CONFIG}

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /web/dist/chess-web/browser/ /usr/share/nginx/html/
EXPOSE 80
ENTRYPOINT ["nginx", "-g", "daemon off;"]
