import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseAuthClient } from "@/lib/supabase/auth";

export async function GET(request: NextRequest) {
  const supabase = createSupabaseAuthClient(await cookies());
  if (!supabase) return NextResponse.redirect(new URL("/?auth_error=not_configured", request.url));

  const callback = new URL("/auth/callback", request.nextUrl.origin);
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callback.toString(),
      skipBrowserRedirect: true,
      queryParams: { access_type: "offline", prompt: "select_account" },
    },
  });

  if (error || !data.url) return NextResponse.redirect(new URL("/?auth_error=oauth", request.url));
  return NextResponse.redirect(data.url);
}
