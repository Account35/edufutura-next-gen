# Admin Onboarding + View-as-Candidate Mode

## What exists today (verified)

- `Index.tsx` already routes any signed-in user with `onboarding_completed = false` to `/onboarding`, including admins — but `AdminRoute` in `ProtectedRoute.tsx` is declared with `requireOnboarding={false}`, and `AdminLayout` performs its own access check with no onboarding gate. So an admin who navigates straight to `/admin` bypasses onboarding entirely.
- There is no "view as candidate" feature anywhere in the app (no matches for view-as / candidate mode outside unrelated audit-log text).
- `useAdminRole` reads roles fresh from `user_roles` on every auth change; `signOut` in `useAuth` clears user/session/profile state.

## What will be built

### 1. Admin onboarding is required
- Flip `AdminRoute` and `EducatorRoute` to require onboarding, so `/admin/*` redirects to `/onboarding` when the profile is not complete.
- Add the same guard inside `AdminLayout` (redirect to `/onboarding` when profile exists and onboarding is incomplete) so direct URL entry cannot bypass it.
- Onboarding steps themselves are unchanged; admins complete the identical wizard, then land on `/admin`.

### 2. View-as-candidate mode (session only)
- New `ViewModeProvider` context storing a single boolean in `sessionStorage` (`sessionStorage` is cleared per browser session and will be explicitly wiped on logout). No database writes, no role changes.
- Admin dashboard sidebar/header gets a "View as Candidate" button. Activating it sets the flag and navigates to `/dashboard`.
- While active, a persistent top banner renders on all candidate-facing pages: "Viewing as Candidate — you are an admin" with an "Exit Candidate View" button that clears the flag and returns to `/admin`.
- While the flag is on, `useAdminRole` consumers used purely for *routing* treat the user as a student, so `Index`, `Dashboard`, and the student navigation behave exactly as they do for a candidate. The raw `isAdmin` value stays available for anything that must know the true role.

### 3. Session isolation and logout reset
- `signOut` in `useAuth` clears the view-mode flag (plus its sessionStorage key) before/alongside clearing auth state.
- The provider also clears the flag whenever the authenticated user id changes or becomes null, so a fresh login never inherits it.
- On login, role resolution continues to come from the `user_roles` table (already the case) and the view flag starts false, so admins always land on `/admin`.

## Technical notes

- Files touched (added-to, not removed): `src/hooks/useAuth.tsx` (clear flag on sign out), `src/components/auth/ProtectedRoute.tsx` (`requireOnboarding` on admin/educator wrappers), `src/components/admin/AdminLayout.tsx` (onboarding guard + toggle button), `src/pages/Index.tsx` and `src/pages/Onboarding.tsx` (respect view mode when choosing `/admin` vs `/dashboard`), `src/components/dashboard/DashboardLayout.tsx` (banner slot), `src/App.tsx` (mount provider).
- New files: `src/hooks/useViewMode.tsx`, `src/components/admin/CandidateViewBanner.tsx`.
- No schema changes, no RLS changes, no deletions of existing logic — all guards are additive conditions.
- Note: admins in candidate view still hold the admin role at the database level, so RLS-protected admin data remains reachable; the mode is a UI/navigation simulation, not a permissions downgrade. Call this out in the banner copy.
