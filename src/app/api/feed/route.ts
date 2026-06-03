import { NextResponse } from "next/server";
import { mockStore } from "@/lib/mock-store";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type FeedItem = {
  id: string;
  title: string;
  description: string;
  suggested_action: string;
  href?: string;
  meta?: string;
  kind?: string;
};

const fallbackCards: FeedItem[] = [
  {
    id: "seed-workspace",
    title: "Start an idea-led workspace",
    description: "Use ThinkFast for a reflection, business idea, caption, or project plan. Broad prompts will ask for your idea first.",
    suggested_action: "Open workspace",
    href: "/workspace",
    meta: "Start",
    kind: "starter",
  },
  {
    id: "seed-board",
    title: "Create your first board",
    description: "Save generated conversations into boards so you can reopen and continue them later.",
    suggested_action: "Open boards",
    href: "/boards",
    meta: "Organize",
    kind: "board",
  },
  {
    id: "seed-reflection",
    title: "Try an Idea First prompt",
    description: "Ask for a reflection about AI, social media, or school. ThinkFast will help you add your own direction before generating.",
    suggested_action: "Try Reflection",
    href: "/workspace?template=Reflection",
    meta: "Try this",
    kind: "template",
  },
];

function fromMockStore(): FeedItem[] {
  const cards: FeedItem[] = [];

  for (const conversation of mockStore.conversations.slice(0, 5)) {
    cards.push({
      id: `mock-conversation-${conversation.id}`,
      title: `Continue: ${conversation.title}`,
      description: conversation.summary || "Continue refining this saved ThinkFast output.",
      suggested_action: "Continue in workspace",
      href: `/workspace?conversationId=${conversation.id}`,
      meta: conversation.selected_mode || "Recent",
      kind: "conversation",
    });
  }

  for (const board of mockStore.boards.slice(0, 4)) {
    const count = mockStore.conversationBoards.filter((row) => row.board_id === board.id).length;
    cards.push({
      id: `mock-board-${board.id}`,
      title: `Open board: ${board.name}`,
      description: count
        ? `${count} saved conversation${count === 1 ? "" : "s"} inside this board.`
        : board.description || "Add conversations to this board from the workspace.",
      suggested_action: "Open board",
      href: `/boards/${board.id}`,
      meta: "Board",
      kind: "board",
    });
  }

  for (const card of mockStore.feedCards.filter((item) => !item.dismissed).slice(0, 6)) {
    cards.push({
      id: card.id,
      title: card.title,
      description: card.description,
      suggested_action: card.suggested_action,
      href: card.conversation_id ? `/workspace?conversationId=${card.conversation_id}` : "/workspace",
      meta: card.card_type || "Suggested",
      kind: "stored-card",
    });
  }

  return cards.length ? cards.slice(0, 12) : fallbackCards;
}

function templateSuggestionFromMode(mode?: string | null) {
  if (mode === "study-coach") {
    return {
      title: "Turn your last output into a reviewer",
      description: "Since you used Study Coach recently, you can create a quiz or condensed reviewer next.",
      suggested_action: "Open Quiz Reviewer",
      href: "/workspace?template=Quiz%20Reviewer",
      meta: "Suggested",
      kind: "template",
    };
  }

  if (mode === "creative") {
    return {
      title: "Expand your last idea into options",
      description: "Your recent creative work can become three sharper directions or a stronger concept list.",
      suggested_action: "Open workspace",
      href: "/workspace?mode=creative",
      meta: "Suggested",
      kind: "template",
    };
  }

  return {
    title: "Create a stronger follow-up",
    description: "Use your most recent ThinkFast output as a starting point and ask for a deeper second version.",
    suggested_action: "Open workspace",
    href: "/workspace",
    meta: "Suggested",
    kind: "template",
  };
}

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    if (!supabase) {
      return NextResponse.json(fromMockStore());
    }

    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return NextResponse.json(fallbackCards);
    }

    const userId = userData.user.id;

    const [{ data: feedCards }, { data: recentConversations }, { data: boards }] = await Promise.all([
      supabase
        .from("feed_cards")
        .select("id, title, description, suggested_action, card_type, conversation_id, created_at")
        .eq("user_id", userId)
        .eq("dismissed", false)
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("conversations")
        .select("id, title, summary, selected_mode, privacy_risk, idea_prompt_needed, updated_at, created_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(6),
      supabase
        .from("boards")
        .select("id, name, description, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(4),
    ]);

    const boardIds = (boards ?? []).map((board) => board.id);
    let boardCounts = new Map<string, number>();

    if (boardIds.length) {
      const { data: mappings } = await supabase
        .from("conversation_boards")
        .select("board_id")
        .in("board_id", boardIds);

      boardCounts = new Map<string, number>();
      for (const row of mappings ?? []) {
        boardCounts.set(row.board_id, (boardCounts.get(row.board_id) ?? 0) + 1);
      }
    }

    const cards: FeedItem[] = [];

    for (const conversation of recentConversations ?? []) {
      cards.push({
        id: `continue-${conversation.id}`,
        title: `Continue: ${conversation.title || "Untitled conversation"}`,
        description:
          conversation.summary ||
          (conversation.idea_prompt_needed
            ? "This was an idea-led conversation. Continue sharpening it."
            : "Continue refining this saved ThinkFast output."),
        suggested_action: "Continue in workspace",
        href: `/workspace?conversationId=${conversation.id}`,
        meta: conversation.selected_mode || "Recent",
        kind: "conversation",
      });
    }

    for (const card of feedCards ?? []) {
      cards.push({
        id: card.id,
        title: card.title,
        description: card.description,
        suggested_action: card.suggested_action || "Open workspace",
        href: card.conversation_id ? `/workspace?conversationId=${card.conversation_id}` : "/workspace",
        meta: card.card_type || "Suggested",
        kind: "stored-card",
      });
    }

    for (const board of boards ?? []) {
      const count = boardCounts.get(board.id) ?? 0;
      cards.push({
        id: `board-${board.id}`,
        title: `Open board: ${board.name}`,
        description: count
          ? `${count} saved conversation${count === 1 ? "" : "s"} ready to continue.`
          : board.description || "This board is ready for saved ThinkFast conversations.",
        suggested_action: "Open board",
        href: `/boards/${board.id}`,
        meta: "Board",
        kind: "board",
      });
    }

    if (recentConversations?.[0]) {
      const suggestion = templateSuggestionFromMode(recentConversations[0].selected_mode);
      cards.push({
        id: "template-suggestion",
        ...suggestion,
      });
    }

    return NextResponse.json(cards.length ? cards.slice(0, 18) : fallbackCards);
  } catch (error) {
    console.error("Feed GET error:", error);
    return NextResponse.json(fallbackCards);
  }
}
