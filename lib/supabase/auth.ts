import "server-only";

import { createClient, type User } from "@supabase/supabase-js";
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

  return createClient(credentials.url, credentials.key, {
    auth: {
      flowType: "pkce",
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: true,
      storage: {
        getItem: (key) => cookieStore.get(key)?.value ?? null,
        setItem: (key, value) => {
          try {
            cookieStore.set(key, value, {
              httpOnly: true,
              sameSite: "lax",
              secure: process.env.NODE_ENV === "production",
              path: "/",
              maxAge: 60 * 60 * 24 * 30,
            });
          } catch {
            // Server Components can read cookies but cannot update them.
          }
        },
        removeItem: (key) => {
          try {
            cookieStore.delete(key);
          } catch {
            // Server Components can read cookies but cannot update them.
          }
        },
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
