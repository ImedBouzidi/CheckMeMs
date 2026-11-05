FROM quay.io/keycloak/keycloak:26.0
COPY docker/keycloak/realm-export.json /opt/keycloak/data/import/realm-export.json
ENV KC_BOOTSTRAP_ADMIN_USERNAME=admin
ENV KC_BOOTSTRAP_ADMIN_PASSWORD=admin
ENV KC_HTTP_PORT=10000
ENTRYPOINT ["/opt/keycloak/bin/kc.sh", "start-dev"]
