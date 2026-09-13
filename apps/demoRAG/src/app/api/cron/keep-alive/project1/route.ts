import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function createSupabase(url: string, key: string) {
  return createClient(url, key, {
    auth: {
      persistSession: false,
    },
  });
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET() {
  try {
    const supabase = createSupabase(SUPABASE_URL, SUPABASE_KEY);

    // lightweight keep-alive query
    const { error } = await supabase
      .from("documents")
      .select("id")
      .limit(1);

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      project: "project-1",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
