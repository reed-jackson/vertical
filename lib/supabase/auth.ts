import "server-only";

import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export const ALLOWED_EMAIL = "reed.a.jackson@gmail.com";

type CookieStore = Awaited<ReturnType<typeof cookies>>;

function authCredentials() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY
    ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    ?? process.env.SUPABASE_ANON_KEY
    ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return { url, key };
}

export function isSupabaseAuthConfigured() {
  return Boolean(authCredentials());
}

export function createSupabaseAuthClient(cookieStore: CookieStore) {
  const credentials = authCredentials();
  if (!credentials) return null;

  return createServerClient(credentials.url, credentials.key, {
    auth: {
      flowType: "pkce",
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: true,
    },
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          try {
            cookieStore.set(name, value, options);
          } catch {
            // Server Components can read cookies but cannot update them.
          }
        });
      },
    },
  });
}

export async function getSupabaseUser(): Promise<User | null> {
  const client = createSupabaseAuthClient(await cookies());
  if (!client) return null;
  const { data, error } = await client.auth.getUser();
  return error ? null : data.user;
}

export async function getAuthorizedUser(): Promise<User | null> {
  const user = await getSupabaseUser();
  return user?.email?.trim().toLowerCase() === ALLOWED_EMAIL ? user : null;
}
