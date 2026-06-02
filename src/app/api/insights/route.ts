import { NextResponse } from "next/server";
import { mockStore } from "@/lib/mock-store";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function makeInsights(conversations: any[], boards: any[]) {
  const safeConversations = Array.isArray(conversations) ? conversations : [];
  const safeBoards = Array.isArray(boards) ? boards : [];

  const privacyWarnings = safeConversations.filter((c) => (c.privacy_risk ?? "low") !== "low").length;
  const ideaPromptsTriggered = safeConversations.filter((c) => Boolean(c.idea_prompt_needed)).length;
  const recentModes = [...new Set(safeConversations.slice(0, 5).map((c) => c.selected_mode).filter(Boolean))];
  const commonTopics = [
    ...new Set(
      safeConversations
        .flatMap((c) => String(c.title ?? "").split(/\s+/).slice(0, 2))
        .map((word) => word.trim())
        .filter((word) => word.length > 2),
    ),
  ].slice(0, 5);

  return {
    outputsGenerated: safeConversations.length,
    commonTopics,
    privacyWarnings,
    ideaPromptsTriggered,
    recentModes,
    boardsCreated: safeBoards.length,
  };
}

export async function GET() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json(makeInsights(mockStore.conversations, mockStore.boards));
  }

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json(makeInsights([], []));

  const { data: conversations } = await supabase
    .from("conversations")
    .select("title, selected_mode, privacy_risk, idea_prompt_needed, created_at")
    .eq("user_id", userData.user.id)
    .order("created_at", { ascending: false });

  const { data: boards } = await supabase
    .from("boards")
    .select("id")
    .eq("user_id", userData.user.id);

  return NextResponse.json(makeInsights(conversations ?? [], boards ?? []));
}
