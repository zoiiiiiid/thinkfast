import { NextResponse } from "next/server";
import { mockStore } from "@/lib/mock-store";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    const conversationIds = mockStore.conversationBoards
      .filter((row) => row.board_id === id)
      .map((row) => row.conversation_id);

    const conversations = mockStore.conversations.filter((conversation) => conversationIds.includes(conversation.id));
    return NextResponse.json(conversations);
  }

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json([]);

  const { data: board, error: boardError } = await supabase
    .from("boards")
    .select("id")
    .eq("id", id)
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (boardError) return NextResponse.json({ error: boardError.message }, { status: 500 });
  if (!board) return NextResponse.json([]);

  const { data: mappings, error: mappingError } = await supabase
    .from("conversation_boards")
    .select("conversation_id, created_at")
    .eq("board_id", id)
    .order("created_at", { ascending: false });

  if (mappingError) return NextResponse.json({ error: mappingError.message }, { status: 500 });

  const ids = [...new Set((mappings ?? []).map((item) => item.conversation_id).filter(Boolean))];
  if (!ids.length) return NextResponse.json([]);

  const { data: conversations, error } = await supabase
    .from("conversations")
    .select("id, title, summary, ai_response, selected_mode, privacy_risk, idea_prompt_needed, created_at")
    .eq("user_id", userData.user.id)
    .in("id", ids);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const order = new Map(ids.map((conversationId, index) => [conversationId, index]));
  const sorted = [...(conversations ?? [])].sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));

  return NextResponse.json(sorted);
}
