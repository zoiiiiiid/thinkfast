import { mockStore } from "@/lib/mock-store";
import {
  checkRateLimit,
  isUuid,
  json,
  rateLimitResponse,
  requireUser,
  safeErrorMessage,
} from "@/lib/server-security";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Params) {
  const limited = checkRateLimit(req, "boards:id:conversations:get", {
    limit: 120,
    windowMs: 60_000,
  });

  if (limited.limited) return rateLimitResponse(limited.retryAfter);

  try {
    const { id } = await params;
    if (!isUuid(id)) return json({ ok: false, error: "Invalid board id.", conversations: [] }, 400);

    const { supabase, user, response } = await requireUser();
    if (response) return response;

    if (!supabase) {
      const board = mockStore.boards.find((item) => item.id === id && item.user_id === "mock-user");
      if (!board) return json([]);

      const conversationIds = mockStore.conversationBoards
        .filter((row) => row.board_id === id)
        .map((row) => row.conversation_id);

      const conversations = mockStore.conversations.filter((conversation) =>
        conversationIds.includes(conversation.id),
      );

      return json(conversations);
    }

    const { data: board, error: boardError } = await supabase
      .from("boards")
      .select("id")
      .eq("id", id)
      .eq("user_id", user!.id)
      .maybeSingle();

    if (boardError) return json({ error: safeErrorMessage(boardError, "Unable to load board."), conversations: [] }, 500);
    if (!board) return json([]);

    const { data: mappings, error: mappingError } = await supabase
      .from("conversation_boards")
      .select("conversation_id, created_at")
      .eq("board_id", id)
      .order("created_at", { ascending: false });

    if (mappingError) {
      return json({ error: safeErrorMessage(mappingError, "Unable to load saved conversations."), conversations: [] }, 500);
    }

    const ids = [...new Set((mappings ?? []).map((item) => item.conversation_id).filter(Boolean))];
    if (!ids.length) return json([]);

    const { data: conversations, error } = await supabase
      .from("conversations")
      .select("id, title, summary, ai_response, selected_mode, privacy_risk, idea_prompt_needed, created_at, updated_at")
      .eq("user_id", user!.id)
      .in("id", ids);

    if (error) return json({ error: safeErrorMessage(error, "Unable to load conversations."), conversations: [] }, 500);

    const order = new Map(ids.map((conversationId, index) => [conversationId, index]));
    const sorted = [...(conversations ?? [])].sort(
      (a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0),
    );

    return json(sorted);
  } catch (error) {
    console.error("Board conversations GET error:", error);
    return json({ ok: false, error: safeErrorMessage(error, "Unable to load saved conversations."), conversations: [] }, 500);
  }
}
