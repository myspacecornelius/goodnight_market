#!/bin/bash

set -euo pipefail

ROOT_ENV=".env"
FRONTEND_ENV="frontend/.env"

if [ ! -f "${ROOT_ENV}" ]; then
  echo "Root .env file not found. Please create one from .env.example."
  exit 1
fi

# Load everything from the root .env so we can template the frontend file.
set -o allexport
source "${ROOT_ENV}"
set +o allexport

cat << EOF > "${FRONTEND_ENV}"
VITE_API_URL=${VITE_API_URL:-}
VITE_WS_URL=${VITE_WS_URL:-}
VITE_ENV=${VITE_ENV:-}
EOF

echo "frontend/.env has been updated from ${ROOT_ENV}."
