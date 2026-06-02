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

  if (!supabase) {
    return NextResponse.json(
      mockStore.boards.map((board) => ({
        ...board,
        conversation_count: mockStore.conversationBoards.filter((row) => row.board_id === board.id).length,
      })),
    );
  }

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json([]);

  const { data: boards, error } = await supabase
    .from("boards")
    .select("id, name, description, created_at")
    .eq("user_id", userData.user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const boardIds = (boards ?? []).map((board) => board.id);
  if (!boardIds.length) return NextResponse.json([]);

  const { data: mappings } = await supabase
    .from("conversation_boards")
    .select("board_id")
    .in("board_id", boardIds);

  const counts = new Map<string, number>();
  (mappings ?? []).forEach((row) => counts.set(row.board_id, (counts.get(row.board_id) ?? 0) + 1));

  return NextResponse.json((boards ?? []).map((board) => ({ ...board, conversation_count: counts.get(board.id) ?? 0 })));
}

export async function POST(req: Request) {
  const payload = schema.safeParse(await req.json());
  if (!payload.success) return NextResponse.json({ error: "Invalid board payload" }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  const now = new Date().toISOString();

  if (!supabase) {
    const board = {
      id: randomUUID(),
      user_id: "mock-user",
      name: payload.data.name,
      description: payload.data.description,
      created_at: now,
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
    created_at: now,
  };

  const { error } = await supabase.from("boards").insert(board);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ...board, conversation_count: 0 });
}
