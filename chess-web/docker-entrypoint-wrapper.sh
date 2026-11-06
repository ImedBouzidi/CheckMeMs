#!/bin/sh
# Normalize API_UPSTREAM before handing control to the official nginx
# entrypoint. That entrypoint renders /etc/nginx/templates/*.template with
# envsubst, so the value must be fixed up in this parent process (a script in
# /docker-entrypoint.d runs as a child and cannot export back to the parent).
#
# API_UPSTREAM must be an origin only (no /api suffix). A trailing slash would
# make nginx treat it as a URI prefix and rewrite /api/... incorrectly, so it
# is stripped below.
set -eu

if [ -z "${API_UPSTREAM:-}" ]; then
  API_UPSTREAM=http://gateway:8081
fi

while [ "${API_UPSTREAM%/}" != "$API_UPSTREAM" ]; do
  API_UPSTREAM="${API_UPSTREAM%/}"
done

# nginx needs an explicit resolver when proxy_pass contains a variable. Prefer
# the first IPv4 nameserver in the container's resolv.conf so this works both
# in Compose and on platforms with their own DNS.
DNS_RESOLVER=$(awk '$1 == "nameserver" && $2 ~ /^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$/ { print $2; exit }' /etc/resolv.conf)
if [ -z "${DNS_RESOLVER:-}" ]; then
  DNS_RESOLVER=127.0.0.11
fi

export API_UPSTREAM DNS_RESOLVER
exec /docker-entrypoint.sh "$@"
