import { NextResponse } from "next/server";
import { requireSupabaseAdmin, TABLES } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await requireSupabaseAdmin()
    .from(TABLES.sessions)
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ sessions: data });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const title = body.title || "New conversation";

  const { data, error } = await requireSupabaseAdmin()
    .from(TABLES.sessions)
    .insert({ title })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
