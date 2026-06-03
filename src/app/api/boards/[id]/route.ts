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
  const limited = checkRateLimit(req, "boards:id:get", {
    limit: 120,
    windowMs: 60_000,
  });

  if (limited.limited) return rateLimitResponse(limited.retryAfter);

  try {
    const { id } = await params;
    if (!isUuid(id)) return json(null, 400);

    const { supabase, user, response } = await requireUser();
    if (response) return response;

    if (!supabase) {
      const board = mockStore.boards.find((item) => item.id === id && item.user_id === "mock-user");
      return json(board ?? null, board ? 200 : 404);
    }

    const { data: board, error } = await supabase
      .from("boards")
      .select("id, name, description, created_at")
      .eq("id", id)
      .eq("user_id", user!.id)
      .maybeSingle();

    if (error) return json({ ok: false, error: safeErrorMessage(error, "Unable to load board.") }, 500);
    if (!board) return json(null, 404);

    return json(board);
  } catch (error) {
    console.error("Board detail GET error:", error);
    return json({ ok: false, error: safeErrorMessage(error, "Unable to load board.") }, 500);
  }
}
