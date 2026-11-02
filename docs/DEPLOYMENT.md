# Deployment Guide — House No 14 Admin

## 1. Supabase

1. Use the **same Supabase project** as the [House No 14 member PWA](https://github.com/arkwaretechnologies/houseno14).
2. Apply any additive admin migrations your project still needs (audit logs, TV displays, promo codes, `admin_role` on `profiles`, court/inventory extras, wallet approval, etc.). Do **not** recreate member PWA tables.
3. Confirm Realtime is enabled for:
   - `open_play_queue`
   - `rfid_scan_logs`
   - `attendance_logs` / attendance records
   - `bookings` / reservations
   - `wallet_transactions`
   - `open_play_matches`
   - `tv_displays`
   - `notification_campaigns`
   - `courts`
4. Create Storage buckets (optional): `avatars`, `court-images`, `branding`.
5. Create a staff user in Supabase Auth, then ensure a matching `profiles` row (same `id` as the auth user):

```sql
-- After signing up the user in Auth (or creating via dashboard), e.g. branch from House No 14 seed:
insert into public.profiles (
  id,
  full_name,
  role,
  admin_role,
  branch_id,
  status
)
values (
  '<auth-user-uuid>',
  'Alex Rivera',
  'admin',
  'super_admin',
  '39ff10ae-f2c4-42e8-9548-54c25a8af434',
  'active'
)
on conflict (id) do update set
  role = excluded.role,
  admin_role = excluded.admin_role,
  branch_id = excluded.branch_id,
  status = excluded.status;
```

Staff sign-in requires `profiles.role` in (`staff`, `admin`) and a non-null `admin_role` for permission mapping.

## 2. Vercel

1. Connect the GitHub repo.
2. Framework preset: **Next.js**.
3. Environment variables:

| Name | Value |
|------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon/publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role (server only) |
| `NEXT_PUBLIC_APP_URL` | `https://your-admin.vercel.app` |

4. Deploy Production.
5. Add a custom admin domain if needed (e.g. `admin.yourdomain.com`).

## 3. Post-deploy checklist

- [ ] Login with staff account
- [ ] Role permissions hide unauthorized nav items
- [ ] Dashboard widgets load
- [ ] Queue + RFID realtime updates
- [ ] TV display `/tv/display/[id]` opens fullscreen
- [ ] Wallet approve/reject writes audit trail
- [ ] Branch filter ready for multi-site rollout

## 4. Multi-branch rollout

1. Insert additional rows in `branches`.
2. Assign `profiles.branch_id` for staff accounts.
3. Scope module queries by `branch_id` (schema + RLS).
4. Add consolidated reporting views that union branches for Super Admin.

## 5. Observability

- Enable Vercel Analytics
- Forward edge logs
- Optionally add Sentry via `SENTRY_DSN`
