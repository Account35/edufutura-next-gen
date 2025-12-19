/*
  scripts/set-user-password.ts
  Safe helper to update a user's password using the Supabase Admin API (service role key required).

  Security: Do NOT commit your SUPABASE_SERVICE_ROLE_KEY. Use a local .env or CI secrets only on trusted machines.

  Usage (local dev):
    1) Create a local `.env` with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
    2) Run: `SUPABASE_URL=https://... SUPABASE_SERVICE_ROLE_KEY=sr.xxxx node dist/scripts/set-user-password.js email@example.com 'NewP@ssw0rd'`
    3) Or with ts-node: `SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx ts-node scripts/set-user-password.ts email@example.com 'NewP@ssw0rd'`
*/

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import readline from 'readline';

async function promptHidden(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const stdin = process.stdin;

    const onDataHandler = (char: any) => {
      char = char + '';
      switch (char) {
        case '\n':
        case '\r':
        case '\u0004':
          stdin.pause();
          break;
        default:
          process.stdout.clearLine(0);
          process.stdout.cursorTo(0);
          process.stdout.write(prompt + Array(rl.line.length + 1).join('*'));
          break;
      }
    };

    process.stdout.write(prompt);
    stdin.on('data', onDataHandler);

    rl.question('', (value) => {
      stdin.removeListener('data', onDataHandler);
      rl.close();
      process.stdout.write('\n');
      resolve(value);
    });
  });
}

async function main() {
  const argEmail = process.argv[2];
  let argPassword = process.argv[3];

  // Load from environment if present
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment. See scripts/README.md for instructions.');
    process.exit(1);
  }

  if (!argEmail) {
    console.error('Usage: npx ts-node scripts/set-user-password.ts email@example.com [NewP@ssw0rd]');
    process.exit(1);
  }

  if (!argPassword) {
    // Prompt for hidden password
    argPassword = await promptHidden('New password (input hidden): ');
    if (!argPassword) {
      console.error('Password is required');
      process.exit(1);
    }
  }

  const email = argEmail;
  const newPassword = argPassword;

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });

  try {
    // Find user by email (admin route)
    const listRes = await supabase.auth.admin.listUsers({ query: email });

    if (!listRes.data || listRes.data.length === 0) {
      console.error('User not found');
      process.exit(1);
    }

    const user = listRes.data.find(u => u.email === email);
    if (!user) {
      console.error('User not found');
      process.exit(1);
    }

    // Update the password securely
    const updRes = await supabase.auth.admin.updateUserById(user.id, { password: newPassword });

    if (updRes.error) {
      console.error('Failed to update password:', updRes.error.message || updRes.error);
      process.exit(1);
    }

    console.log(`Password updated for user ${email} (id: ${user.id}).`);
    console.log('Please have the user change their password on next login. Consider rotating the supabase service key if it was exposed.');
  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
