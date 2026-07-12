import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/db/supabaseServer";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (code) {
    const supabase = await createServerSupabase();
    await supabase.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(new URL("/journal", req.url));
}
