# chess-web — Angular SPA served by nginx (host port 4200).
# The production app config points the browser at http://localhost:8081
# (gateway). For a same-origin hosted build, pass NG_BUILD_CONFIG=demo:
# app-config.demo.ts uses /api and nginx proxies it to API_UPSTREAM.
FROM node:20-alpine AS build
ARG NG_BUILD_CONFIG=production
WORKDIR /web
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx ng build --configuration ${NG_BUILD_CONFIG}
# Pre-compress the ~95 MB Stockfish WASM once at build time. nginx serves the
# .gz via gzip_static, cutting the first-load download to roughly 75 MB.
RUN node -e "const fs=require('fs'),z=require('zlib');const p='dist/chess-web/browser/assets/stockfish/stockfish-19-single.wasm';fs.writeFileSync(p+'.gz',z.gzipSync(fs.readFileSync(p),{level:9}))"

FROM nginx:1.27-alpine

# Default for docker-compose deployments. Standalone deployments (Render etc.)
# override this with the gateway's public or private origin.
ENV API_UPSTREAM=http://gateway:8081

# The wrapper normalizes API_UPSTREAM, then runs the official entrypoint,
# which renders the template with the current environment before starting nginx.
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY docker-entrypoint-wrapper.sh /usr/local/bin/docker-entrypoint-wrapper.sh
RUN chmod +x /usr/local/bin/docker-entrypoint-wrapper.sh
ENTRYPOINT ["/usr/local/bin/docker-entrypoint-wrapper.sh"]
CMD ["nginx", "-g", "daemon off;"]

COPY --from=build /web/dist/chess-web/browser/ /usr/share/nginx/html/
EXPOSE 80
