#!/usr/bin/env bash
# Controleert MCP-variabelen en herinnert aan de lokale dev-server workflow.
# Gebruik: source scripts/load-mcp-env.sh

set -euo pipefail

if [[ -n "${BASH_VERSION:-}" ]]; then
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
else
  SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
fi

ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${ROOT}/.env.local"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Geen .env.local gevonden. Kopieer .env.example naar .env.local en vul secrets in." >&2
  return 1 2>/dev/null || exit 1
fi

set -a
# shellcheck disable=SC1090
source "${ENV_FILE}"
set +a

missing=()
for var in SUPABASE_PROJECT_REF SUPABASE_ACCESS_TOKEN GITHUB_PERSONAL_ACCESS_TOKEN NEXT_PUBLIC_SUPABASE_URL SUPABASE_SECRET_KEY; do
  eval "value=\${$var:-}"
  if [[ -z "$value" ]]; then
    missing+=("$var")
  fi
done

if ((${#missing[@]} > 0)); then
  echo "Ontbrekende MCP-variabelen in .env.local: ${missing[*]}" >&2
  return 1 2>/dev/null || exit 1
fi

echo "MCP env OK (.env.local)"
echo ""
echo "Lokale MCP-servers draaien via Next.js — start eerst de dev-server:"
echo "  npm run dev"
echo ""
echo "Daarna in Cursor: MCP-panel → herstart 'supabase' en 'github'."
echo "Config staat in .cursor/mcp.json (project-lokaal, geen globale env nodig)."
echo ""
echo "Optioneel: zet MCP_ENABLED=true om MCP buiten development te testen."
echo "Optioneel: zet MCP_DEV_SECRET voor Bearer-auth op /api/mcp/* routes."
