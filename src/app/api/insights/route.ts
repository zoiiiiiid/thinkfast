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

export async function POST(req: Request) {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON payload" }, { status: 400 });
  }

  const payload = schema.safeParse(body);
  if (!payload.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid payload", details: payload.error.flatten() },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    const conversation = {
      id: randomUUID(),
      user_id: "mock-user",
      title: payload.data.title,
      original_prompt: payload.data.originalPrompt ?? null,
      redacted_prompt: payload.data.redactedPrompt,
      ai_response: payload.data.aiResponse,
      summary: payload.data.summary,
      selected_mode: payload.data.selectedMode,
      privacy_risk: payload.data.privacyRisk,
      idea_prompt_needed: payload.data.ideaPromptNeeded,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    mockStore.conversations.unshift(conversation);
    return NextResponse.json({ ok: true, conversationId: conversation.id, conversation, mode: "mock" });
  }

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

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
    return NextResponse.json({ ok: false, error: conversationError.message }, { status: 500 });
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

  if (payload.data.template) {
    try {
      const followUpRes = await fetch(`${new URL(req.url).origin}/api/generate-feed-cards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template: payload.data.template, title: payload.data.title }),
      });

      if (followUpRes.ok) {
        const generated = await followUpRes.json();
        feedCard.card_type = generated.cardType ?? feedCard.card_type;
        feedCard.title = generated.title ?? feedCard.title;
        feedCard.description = generated.description ?? feedCard.description;
        feedCard.suggested_action = generated.suggestedAction ?? feedCard.suggested_action;
      }
    } catch (error) {
      console.error("Feed card generation failed:", error);
    }
  }

  const { error: feedError } = await supabase.from("feed_cards").insert(feedCard);
  if (feedError) console.error("Feed card insert failed:", feedError.message);

  return NextResponse.json({ ok: true, conversationId: conversation.id, conversation });
}

export async function GET() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json(mockStore.conversations.slice(0, 25));

  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return NextResponse.json([]);

  const { data, error } = await supabase
    .from("conversations")
    .select("id, title, summary, selected_mode, created_at")
    .eq("user_id", user.user.id)
    .order("created_at", { ascending: false })
    .limit(25);

  if (error) {
    return NextResponse.json(mockStore.conversations.filter((c) => c.user_id === user.user?.id).slice(0, 25));
  }

  return NextResponse.json(data ?? []);
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    const idx = mockStore.conversations.findIndex((c) => c.id === id);
    if (idx >= 0) mockStore.conversations.splice(idx, 1);
    return NextResponse.json({ ok: true });
  }

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase.from("conversations").delete().eq("id", id).eq("user_id", userData.user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
