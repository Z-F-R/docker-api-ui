#!/bin/sh
set -e

# The frontend bundle calls the API at http://localhost:3000 (VITE_API_URL), and the
# Vite dev server only answers to Host: localhost. Forwarding both ports makes the
# browser in this container see exactly what a developer's browser sees on the host.
API_HOST="${API_HOST:-app}"
FRONTEND_HOST="${FRONTEND_HOST:-frontend}"

socat TCP-LISTEN:3000,fork,reuseaddr TCP:"$API_HOST":3000 &
socat TCP-LISTEN:5173,fork,reuseaddr TCP:"$FRONTEND_HOST":5173 &

echo "Forwarding localhost:3000 -> $API_HOST:3000 and localhost:5173 -> $FRONTEND_HOST:5173"
exec "$@"
