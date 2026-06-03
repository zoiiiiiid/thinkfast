import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { mockStore } from "@/lib/mock-store";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const boardSchema = z.object({
  name: z.string().min(1, "Board name is required."),
  description: z.string().optional().nullable(),
});

function mockBoards() {
  return mockStore.boards.map((board) => ({
    ...board,
    conversation_count: mockStore.conversationBoards.filter((row) => row.board_id === board.id).length,
  }));
}

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    if (!supabase) {
      return NextResponse.json({
        ok: true,
        boards: mockBoards(),
        mode: "mock",
      });
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({
        ok: false,
        boards: [],
        error: "Not authenticated.",
      });
    }

    const { data, error } = await supabase
      .from("boards")
      .select("id, name, description, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Boards GET error:", error);

      return NextResponse.json({
        ok: false,
        boards: [],
        error: error.message,
      });
    }

    const boardIds = (data ?? []).map((board) => board.id);
    let counts = new Map<string, number>();

    if (boardIds.length) {
      const { data: mappings } = await supabase
        .from("conversation_boards")
        .select("board_id")
        .in("board_id", boardIds);

      counts = new Map<string, number>();
      for (const row of mappings ?? []) {
        counts.set(row.board_id, (counts.get(row.board_id) ?? 0) + 1);
      }
    }

    return NextResponse.json({
      ok: true,
      boards: (data ?? []).map((board) => ({
        ...board,
        conversation_count: counts.get(board.id) ?? 0,
      })),
    });
  } catch (error) {
    console.error("Boards GET route error:", error);

    return NextResponse.json({
      ok: false,
      boards: [],
      error: error instanceof Error ? error.message : "Unable to load boards.",
    });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = boardSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({
        ok: false,
        error: "Invalid board data.",
        issues: parsed.error.flatten(),
      });
    }

    const supabase = await createSupabaseServerClient();
    const now = new Date().toISOString();
    const { name, description } = parsed.data;

    if (!supabase) {
      const board = {
        id: randomUUID(),
        user_id: "mock-user",
        name: name.trim(),
        description: description?.trim() || "",
        created_at: now,
        conversation_count: 0,
      };

      mockStore.boards.unshift(board);

      return NextResponse.json({
        ok: true,
        board,
        mode: "mock",
      });
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({
        ok: false,
        error: "Not authenticated.",
      });
    }

    const { data, error } = await supabase
      .from("boards")
      .insert({
        user_id: user.id,
        name: name.trim(),
        description: description?.trim() || null,
      })
      .select("id, name, description, created_at")
      .single();

    if (error) {
      console.error("Boards POST error:", error);

      return NextResponse.json({
        ok: false,
        error: error.message,
      });
    }

    return NextResponse.json({
      ok: true,
      board: {
        ...data,
        conversation_count: 0,
      },
    });
  } catch (error) {
    console.error("Boards POST route error:", error);

    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Unable to create board.",
    });
  }
}
