import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseAuthClient } from "@/lib/supabase/auth";

export async function GET(request: NextRequest) {
  const supabase = createSupabaseAuthClient(await cookies());
  if (supabase) await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", request.nextUrl.origin));
}
