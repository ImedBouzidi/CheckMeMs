# imedbennington/keycloak — Keycloak 21.1.1 with the chess-platform realm baked in.
#
# The realm export is copied into the image, so deployments need no host-side
# import directory. The compose service still runs `start-dev --import-realm`.
#
# Compose builds it from the repo root (docker-compose.yml -> keycloak service).
# Standalone:
#   docker build -t imedbennington/keycloak:latest -f docker/keycloak/Dockerfile .
#   docker push imedbennington/keycloak:latest
FROM quay.io/keycloak/keycloak:21.1.1
COPY docker/keycloak/realm-export.json /opt/keycloak/data/import/realm-export.json
