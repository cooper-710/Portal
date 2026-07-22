# Supabase migration adoption

`supabase/migrations` is now the ordered source of truth for new environments:

1. `20260721_production_baseline.sql` — the effective schema previously maintained in `schema.sql`, including the launch-critical safe grants.
2. `20260722_atomic_reviews.sql` — an exact copy of the already-existing migration in `migrations/`; its version and contents are preserved.
3. `20260722201038_lock_billing_fields.sql` — the forward-only security migration for existing databases.

The root `schema.sql` remains as a readable snapshot for compatibility, but future changes must be created with `supabase migration new <name>` and applied as forward migrations.

## Existing production project

Do not run the baseline against an existing populated database. It represents state that was historically applied through `schema.sql` rather than Supabase migration history.

Before the first `supabase db push`, compare the linked project's schema and migration list, take a backup, and mark only the baseline version as already applied:

```bash
supabase migration list --linked
supabase migration repair 20260721 --status applied --linked
supabase db push --dry-run --linked
```

The legacy `20260722` migration must already be present in remote history if it was previously applied. Do not repair it without verifying the remote migration table and function definitions. The new `20260722201038` migration is the only schema mutation intended for the existing project in this phase.

No command in this adoption procedure has been run against a remote project as part of the repository work.
