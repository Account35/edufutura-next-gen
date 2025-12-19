# Admin password reset script

This folder contains a safe helper script to update a user's password using the Supabase Admin API (requires the Service Role key).

> WARNING: The Service Role key is powerful. Do NOT commit it. Run this script only on a trusted machine and rotate keys if they are exposed.

Files:
- `set-user-password.ts` — TypeScript script to set a user's password by email.
- `.env.example` — Example env file showing required variables.

Quick usage (recommended - run locally):

1. Install dev dependency if you plan to run TypeScript directly (optional):
   - `npm install -D ts-node typescript` (or use `npx ts-node`)

2. Create a local `.env` file (gitignored). Example:

```
SUPABASE_URL=https://xyzcompany.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sr.your_service_role_key_here
```

3. Run the script (examples):

- Using `ts-node` (no build step):
  ```bash
  SUPABASE_URL=$SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY npx ts-node scripts/set-user-password.ts admin_edufutura@gmail.com 'Admin@123'
  ```

- Using the included npm script (convenience helper that uses `npx ts-node`):
  ```bash
  # Pass email and password as args:
  npm run set-user-password -- admin_edufutura@gmail.com 'Admin@123'

  # Or pass only email to be prompted for the password (input is hidden):
  npm run set-user-password -- admin_edufutura@gmail.com
  ```

- Using Node (after building TS to JS):
  ```bash
  # build (if you have a build step)
  node dist/scripts/set-user-password.js admin_edufutura@gmail.com 'Admin@123'
  ```

4. After testing: Have the user log in and change password via app settings. Remove the temporary password and/or rotate keys as needed.

Security notes:
- The script uses `supabase.auth.admin` endpoints and requires the service role key.
- Do NOT store secret keys in source control.
- Prefer sending password reset emails for production users. Use this script only for test accounts or recovery.

If you'd like, I can add a small package.json script to simplify running this locally.
