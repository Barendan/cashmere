## Corrected security migration

Verified against the actual schema before writing this. The previous migration was sloppy in two places; this one fixes those and keeps everything else that was already correct.

### Verified facts about the current database

- `finance_transactions` is a real, separate table (receipt-level: customer_name, payment_method, tip, discount). RLS is **off**. 384 rows.
- `transactions` is a different real table (line-item-level: product_id, quantity, price). RLS is **on**. 1,067 rows.
- `products`, `sales` both have RLS **on** already.
- `profiles` already has `"Admins can do everything"` (ALL) and `"Users can view their own profile"` (SELECT) policies. Both survive untouched.

### What changes vs. last plan

1. **No silent gaps after drops.** Before dropping any `Allow authenticated …` catch-all policy, the migration confirms an admin-scoped and a role-scoped replacement exists for the same verb. If a verb would be left uncovered, the drop is skipped (or replaced) instead of executed blindly.
2. **Employee writes stay admin-only on `products` and `transactions`** (per your answer). Employees keep: read products, read+insert transactions, full sales access. Admins keep everything via the existing `"Admin users can do everything"` policy.
3. **Pre-flight assertion block.** The migration starts with a `DO $$ ... $$` block that fails loudly if either of these is missing:
   - `profiles` SELECT policy that lets a user read their own row (required because new policies do `SELECT role FROM profiles WHERE id = auth.uid()` under RLS).
   - `profiles` `"Admins can do everything"` ALL policy (required so admins can still assign roles after the self-update policy is tightened).
   If either is missing, migration aborts with a clear error before any DROP runs.
4. **`finance_transactions`** still gets RLS enabled + admin ALL + employee SELECT/INSERT/UPDATE (no DELETE for employees on financial records).
5. **`get_user_role()` rewrite** still reads from `profiles.role` instead of `auth.users.raw_user_meta_data` — this is the right fix and unchanged.
6. **`profiles` self-update policy** still tightened to forbid role changes via the self path — admins continue to assign roles via the untouched `"Admins can do everything"` policy.
7. **`search_path` pin** on `update_updated_at_column` — unchanged.
8. **EXECUTE revokes** from `anon` on SECURITY DEFINER functions — unchanged. `handle_new_user` revoke from `authenticated` is safe (triggers ignore EXECUTE).

### Final policy coverage after migration

```text
finance_transactions   admin: ALL    employee: SELECT, INSERT, UPDATE
transactions           admin: ALL    employee: SELECT, INSERT
products               admin: ALL    employee: SELECT
sales                  admin: ALL    employee: SELECT, INSERT, UPDATE, DELETE
profiles               admin: ALL    user: SELECT own + UPDATE own (role frozen)
```

### Where I was wrong last time (honest)

- I dropped `Allow authenticated …` policies as "duplicates" without proving each verb was still covered by a role-scoped policy. The drops happen to be safe given your existing role policies, but I didn't verify it — that was the right thing to call out.
- I should have explicitly stated that `"Admins can do everything"` on `profiles` is the surviving path for admin role assignment, and that the new restrictive policy only governs the self-update path. Not saying so made the change look more dangerous than it is.
- I relied on the `profiles` self-SELECT policy existing without asserting it. Adding a pre-flight check is cheap and removes the silent-deny failure mode.

### Where your critique was wrong (also honest)

- `finance_transactions` is a real table, not an invented name. It's the table the Critical "Financial transaction records with customer names" finding points at.
- The drops on `products`/`transactions`/`sales` do not leave them uncovered — `"Admin users can do everything"` and the role-scoped policies remain. Admins and employees keep working.
- Admin role assignment is not broken — `"Admins can do everything"` on `profiles` is untouched and overrides the tightened self-update policy for admins.

### Out of scope (cannot be fixed by SQL — manual)

- Enable Leaked Password Protection in Auth dashboard.
- Upgrade Postgres in Project Settings → Infrastructure.

### Files touched

- One migration file (SQL only). No application code changes.
