import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { mockStore } from "@/lib/mock-store";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const fallbackFollowUpCard = {
  cardType: "next-action",
  title: "Continue this conversation",
  description: "Ask a follow-up or organize this output into a board.",
  suggestedAction: "Add a follow-up",
};

const schema = z.object({
  title: z.string().min(1).default("Untitled ThinkFast Output"),
  originalPrompt: z.string().nullable().optional(),
  redactedPrompt: z.string().min(1),
  aiResponse: z.string().min(1),
  summary: z.string().default("No summary available."),
  selectedMode: z.string().default("auto"),
  privacyRisk: z.string().default("low"),
  ideaPromptNeeded: z.boolean().default(false),
  template: z.string().optional(),
  followUpCard: z
    .object({
      cardType: z.string().default(fallbackFollowUpCard.cardType),
      title: z.string().default(fallbackFollowUpCard.title),
      description: z.string().default(fallbackFollowUpCard.description),
      suggestedAction: z.string().default(fallbackFollowUpCard.suggestedAction),
    })
    .optional()
    .default(fallbackFollowUpCard),
});

function createMockConversation(payload: z.infer<typeof schema>) {
  const now = new Date().toISOString();
  const conversation = {
    id: randomUUID(),
    user_id: "mock-user",
    title: payload.title,
    original_prompt: payload.originalPrompt ?? null,
    redacted_prompt: payload.redactedPrompt,
    ai_response: payload.aiResponse,
    summary: payload.summary,
    selected_mode: payload.selectedMode,
    privacy_risk: payload.privacyRisk,
    idea_prompt_needed: payload.ideaPromptNeeded,
    created_at: now,
    updated_at: now,
  };

  mockStore.conversations.unshift(conversation);
  return conversation;
}

export async function POST(req: Request) {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON payload" }, { status: 400 });
  }

  const payload = schema.safeParse(body);
  if (!payload.success) {
    return NextResponse.json({ ok: false, error: "Invalid payload", details: payload.error.flatten() }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    const conversation = createMockConversation(payload.data);
    return NextResponse.json({ ok: true, conversationId: conversation.id, conversation, mode: "mock" });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    const conversation = createMockConversation(payload.data);
    return NextResponse.json({ ok: true, conversationId: conversation.id, conversation, mode: "mock", warning: "Not logged in, saved to mock store only." });
  }

  const now = new Date().toISOString();
  const conversation = {
    id: randomUUID(),
    user_id: userData.user.id,
    title: payload.data.title,
    original_prompt: payload.data.originalPrompt ?? null,
    redacted_prompt: payload.data.redactedPrompt,
    ai_response: payload.data.aiResponse,
    summary: payload.data.summary,
    selected_mode: payload.data.selectedMode,
    privacy_risk: payload.data.privacyRisk,
    idea_prompt_needed: payload.data.ideaPromptNeeded,
    created_at: now,
    updated_at: now,
  };

  const { error: conversationError } = await supabase.from("conversations").insert(conversation);

  if (conversationError) {
    console.error("Conversation insert failed:", conversationError.message);
    const mockConversation = createMockConversation(payload.data);
    return NextResponse.json({ ok: true, conversationId: mockConversation.id, conversation: mockConversation, mode: "mock", warning: conversationError.message });
  }

  const feedCard = {
    id: randomUUID(),
    user_id: userData.user.id,
    conversation_id: conversation.id,
    card_type: payload.data.followUpCard.cardType,
    title: payload.data.followUpCard.title,
    description: payload.data.followUpCard.description,
    suggested_action: payload.data.followUpCard.suggestedAction,
    created_at: now,
    dismissed: false,
  };

  const { error: feedError } = await supabase.from("feed_cards").insert(feedCard);
  if (feedError) console.error("Feed card insert failed:", feedError.message);

  return NextResponse.json({ ok: true, conversationId: conversation.id, conversation, mode: "supabase" });
}

export async function GET() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json(mockStore.conversations.slice(0, 25));

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json(mockStore.conversations.slice(0, 25));

  const { data, error } = await supabase
    .from("conversations")
    .select("id, title, summary, selected_mode, created_at")
    .eq("user_id", userData.user.id)
    .order("created_at", { ascending: false })
    .limit(25);

  if (error) {
    console.error("Conversation fetch failed:", error.message);
    return NextResponse.json(mockStore.conversations.slice(0, 25));
  }

  return NextResponse.json(data ?? []);
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    const idx = mockStore.conversations.findIndex((conversation) => conversation.id === id);
    if (idx >= 0) mockStore.conversations.splice(idx, 1);
    return NextResponse.json({ ok: true });
  }

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase.from("conversations").delete().eq("id", id).eq("user_id", userData.user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
