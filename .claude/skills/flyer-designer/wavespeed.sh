#!/usr/bin/env bash
# ============================================================
# WaveSpeed AI helper — submit + poll, for image OR video generation.
# Verified against api.wavespeed.ai 2026-07-15 (live tested).
#
# SECURITY: reads the key from $WAVESPEED_KEY only. Never hardcode a key
# in this file or paste one into chat/commits. Set it once per session:
#   export WAVESPEED_KEY="wsk_live_..."
# (Claude Code: set it as a session env var. Claude.ai Skills upload:
#  set it in that environment's secrets/env config — see SKILL.md.)
#
# Usage:
#   ./wavespeed.sh submit <model-slug> '<json-body>'   -> prints request id
#   ./wavespeed.sh poll   <request-id>                 -> prints status json
#   ./wavespeed.sh wait    <request-id>                -> blocks until done, prints output URL(s)
#   ./wavespeed.sh generate <model-slug> '<json-body>'  -> submit + wait, one call
# ============================================================
set -euo pipefail
BASE="https://api.wavespeed.ai/api/v3"

if [ -z "${WAVESPEED_KEY:-}" ]; then
  echo "ERROR: WAVESPEED_KEY is not set. export WAVESPEED_KEY=\"wsk_live_...\" first." >&2
  exit 1
fi

cmd="${1:-}"

submit() {
  local model="$1" body="$2"
  curl -s -X POST "${BASE}/${model}" \
    -H "Authorization: Bearer ${WAVESPEED_KEY}" -H "Content-Type: application/json" \
    -d "${body}" | python3 -c "
import json,sys
d = json.load(sys.stdin)
if d.get('code') not in (0, 200):
    print('ERROR:', d.get('message', d), file=sys.stderr); sys.exit(1)
print(d['data']['id'])
"
}

poll() {
  local id="$1"
  curl -s "${BASE}/predictions/${id}/result" -H "Authorization: Bearer ${WAVESPEED_KEY}"
}

wait_for() {
  local id="$1" tries="${2:-90}" delay="${3:-3}"
  for _ in $(seq 1 "$tries"); do
    resp="$(poll "$id")"
    status="$(echo "$resp" | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['status'])" 2>/dev/null || echo "error")"
    case "$status" in
      completed)
        echo "$resp" | python3 -c "import json,sys; [print(u) for u in json.load(sys.stdin)['data']['outputs']]"
        return 0 ;;
      failed)
        echo "ERROR: generation failed: $resp" >&2; return 1 ;;
      *) sleep "$delay" ;;
    esac
  done
  echo "ERROR: timed out waiting for $id" >&2; return 1
}

case "$cmd" in
  submit)   submit "$2" "$3" ;;
  poll)     poll "$2" ;;
  wait)     wait_for "$2" ;;
  generate)
    id="$(submit "$2" "$3")"
    echo "submitted: $id" >&2
    wait_for "$id" ;;
  *)
    echo "Usage: $0 {submit|poll|wait|generate} ..." >&2; exit 1 ;;
esac
