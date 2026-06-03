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
  try {
    const payload = schema.safeParse(await req.json());
    if (!payload.success) {
      return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      const exists = mockStore.conversationBoards.some(
        (row) =>
          row.conversation_id === payload.data.conversationId &&
          row.board_id === payload.data.boardId,
      );

      if (!exists) {
        mockStore.conversationBoards.unshift({
          id: randomUUID(),
          conversation_id: payload.data.conversationId,
          board_id: payload.data.boardId,
          created_at: new Date().toISOString(),
        });
      }

      return NextResponse.json({ ok: true, message: "Mock mode: mapping stored." });
    }

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const { data: board } = await supabase
      .from("boards")
      .select("id")
      .eq("id", payload.data.boardId)
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (!board) return NextResponse.json({ ok: false, error: "Board not found" }, { status: 404 });

    const { data: conversation } = await supabase
      .from("conversations")
      .select("id")
      .eq("id", payload.data.conversationId)
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (!conversation) {
      return NextResponse.json({ ok: false, error: "Conversation not found" }, { status: 404 });
    }

    const { data: existing } = await supabase
      .from("conversation_boards")
      .select("id")
      .eq("conversation_id", payload.data.conversationId)
      .eq("board_id", payload.data.boardId)
      .maybeSingle();

    if (existing) return NextResponse.json({ ok: true, message: "Already saved to this board." });

    const row = {
      id: randomUUID(),
      conversation_id: payload.data.conversationId,
      board_id: payload.data.boardId,
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("conversation_boards").insert(row);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("conversation-boards POST error:", error);
    return NextResponse.json({ ok: false, error: "Conversation could not be saved to board." }, { status: 200 });
  }
}
