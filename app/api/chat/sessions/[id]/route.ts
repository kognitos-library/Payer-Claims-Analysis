import { NextResponse } from "next/server";
import { requireSupabaseAdmin, TABLES } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const [sessionRes, messagesRes] = await Promise.all([
    requireSupabaseAdmin().from(TABLES.sessions).select("*").eq("id", id).single(),
    requireSupabaseAdmin()
      .from(TABLES.messages)
      .select("*")
      .eq("session_id", id)
      .order("created_at", { ascending: true }),
  ]);

  if (sessionRes.error) {
    return NextResponse.json(
      { error: sessionRes.error.message },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ...sessionRes.data,
    messages: messagesRes.data ?? [],
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const { error } = await requireSupabaseAdmin()
    .from(TABLES.sessions)
    .update({ title: body.title, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { error } = await requireSupabaseAdmin()
    .from(TABLES.sessions)
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
