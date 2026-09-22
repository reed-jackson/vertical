import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { ALLOWED_EMAIL, createSupabaseAuthClient } from "@/lib/supabase/auth";

export async function GET(request: NextRequest) {
  const destination = new URL("/", request.nextUrl.origin);
  const code = request.nextUrl.searchParams.get("code");
  const supabase = createSupabaseAuthClient(await cookies());

  if (!code || !supabase) {
    destination.searchParams.set("auth_error", "callback");
    return NextResponse.redirect(destination);
  }

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    destination.searchParams.set("auth_error", "callback");
    return NextResponse.redirect(destination);
  }

  if (data.user.email?.trim().toLowerCase() !== ALLOWED_EMAIL) {
    await supabase.auth.signOut();
    destination.searchParams.set("auth_error", "account");
  }

  return NextResponse.redirect(destination);
}
