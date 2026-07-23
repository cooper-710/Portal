#!/usr/bin/env bash
# Local production smoke: typecheck + unit tests + Next build with dummy env.
# Usage: ./scripts/verify-local.sh   OR   npm run verify
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export NEXT_PUBLIC_SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-https://example.supabase.co}"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ci-anon}"
export SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ci-service-role}"
export STRIPE_SECRET_KEY="${STRIPE_SECRET_KEY:-sk_test_ci_dummy_key_not_real}"
export STRIPE_WEBHOOK_SECRET="${STRIPE_WEBHOOK_SECRET:-whsec_ci_dummy_not_real}"
export STRIPE_SAAS_PRICE_ID="${STRIPE_SAAS_PRICE_ID:-price_ci_dummy}"
export NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:-pk_test_ci_dummy}"
export NEXT_PUBLIC_APP_URL="${NEXT_PUBLIC_APP_URL:-http://localhost:3001}"
export FINALIA_PRO_TRIAL_DAYS="${FINALIA_PRO_TRIAL_DAYS:-14}"
export STRIPE_PLATFORM_FEE_PERCENT="${STRIPE_PLATFORM_FEE_PERCENT:-1}"

echo "==> typecheck"
npx tsc --noEmit

echo "==> unit tests"
npm test

echo "==> build"
npm run build

echo "OK: typecheck, tests, and build passed."
