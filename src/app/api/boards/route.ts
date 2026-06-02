import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { mockStore } from "@/lib/mock-store";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  name: z.string().min(1),
  description: z.string().default(""),
});

export async function GET() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json(mockStore.boards);
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json([], { status: 200 });

  const { data, error } = await supabase
    .from("boards")
    .select("*")
    .eq("user_id", userData.user.id)
    .order("created_at", { ascending: false });
  if (error) {
    return NextResponse.json(mockStore.boards.filter((b) => b.user_id === userData.user?.id));
  }

  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const payload = schema.safeParse(await req.json());
  if (!payload.success) return NextResponse.json({ error: "Invalid board payload" }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    const board = {
      id: randomUUID(),
      user_id: "mock-user",
      name: payload.data.name,
      description: payload.data.description,
      created_at: new Date().toISOString(),
    };
    mockStore.boards.unshift(board);
    return NextResponse.json(board);
  }
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const board = {
    id: randomUUID(),
    user_id: userData.user.id,
    name: payload.data.name,
    description: payload.data.description,
    created_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("boards").insert(board);
  if (error) mockStore.boards.unshift(board);

  return NextResponse.json(board);
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    const idx = mockStore.boards.findIndex((b) => b.id === id);
    if (idx >= 0) mockStore.boards.splice(idx, 1);
    return NextResponse.json({ ok: true });
  }
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { error } = await supabase.from("boards").delete().eq("id", id).eq("user_id", userData.user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
