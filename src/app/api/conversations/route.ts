import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { mockStore } from "@/lib/mock-store";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const followUpSchema = z.object({
  cardType: z.string().default("follow-up"),
  title: z.string().default("Continue this output"),
  description: z.string().default("Open this again and refine it."),
  suggestedAction: z.string().default("Continue"),
});

const schema = z.object({
  title: z.string().min(1).default("ThinkFast Output"),
  originalPrompt: z.string().nullable().optional(),
  redactedPrompt: z.string().min(1),
  aiResponse: z.string().min(1),
  summary: z.string().default("Generated ThinkFast output."),
  selectedMode: z.string().default("auto"),
  privacyRisk: z.string().default("low"),
  ideaPromptNeeded: z.boolean().default(false),
  template: z.string().optional(),
  followUpCard: followUpSchema.default({
    cardType: "follow-up",
    title: "Continue this output",
    description: "Open this again and refine it.",
    suggestedAction: "Continue",
  }),
});

export async function POST(req: Request) {
  const payload = schema.safeParse(await req.json());
  if (!payload.success) {
    return NextResponse.json({ ok: false, error: "Invalid conversation payload" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const now = new Date().toISOString();

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
      created_at: now,
      updated_at: now,
    };
    mockStore.conversations.unshift(conversation);
    return NextResponse.json({ ok: true, conversationId: conversation.id, conversation, mode: "mock" });
  }

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

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

  const { error } = await supabase.from("conversations").insert(conversation);
  if (error) {
    console.error("Conversation insert error:", error.message);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
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
  if (feedError) console.error("Feed card insert error:", feedError.message);

  return NextResponse.json({ ok: true, conversationId: conversation.id, conversation });
}

export async function GET() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json(mockStore.conversations.slice(0, 25));

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json([]);

  const { data, error } = await supabase
    .from("conversations")
    .select("id, title, summary, ai_response, selected_mode, privacy_risk, idea_prompt_needed, created_at")
    .eq("user_id", userData.user.id)
    .order("created_at", { ascending: false })
    .limit(25);

  if (error) {
    console.error("Conversation fetch error:", error.message);
    return NextResponse.json([]);
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
