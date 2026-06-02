import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { mockStore } from "@/lib/mock-store";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  conversationId: z.string().min(1),
  boardId: z.string().min(1),
});

export async function POST(req: Request) {
  const payload = schema.safeParse(await req.json());
  if (!payload.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    mockStore.conversationBoards.unshift({
      id: randomUUID(),
      conversation_id: payload.data.conversationId,
      board_id: payload.data.boardId,
      created_at: new Date().toISOString(),
    });
    return NextResponse.json({ ok: true, message: "Mock mode: mapping stored." });
  }
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: board } = await supabase.from("boards").select("id").eq("id", payload.data.boardId).eq("user_id", userData.user.id).maybeSingle();
  if (!board) return NextResponse.json({ error: "Board not found" }, { status: 404 });

  const row = {
    id: randomUUID(),
    conversation_id: payload.data.conversationId,
    board_id: payload.data.boardId,
    created_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("conversation_boards").insert(row);
  if (error) return NextResponse.json({ ok: false, message: "Supabase table missing. Add schema first." });

  return NextResponse.json({ ok: true });
}
