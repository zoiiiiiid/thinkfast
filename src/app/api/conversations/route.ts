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

const messageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1),
  title: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
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
  messages: z.array(messageSchema).optional(),
  followUpCard: followUpSchema.default({
    cardType: "follow-up",
    title: "Continue this output",
    description: "Open this again and refine it.",
    suggestedAction: "Continue",
  }),
});

async function replaceConversationMessages(
  supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>,
  conversationId: string,
  userId: string,
  messages: z.infer<typeof messageSchema>[] | undefined,
) {
  if (!messages?.length) return;

  const { error: deleteError } = await supabase
    .from("conversation_messages")
    .delete()
    .eq("conversation_id", conversationId);

  if (deleteError) {
    console.warn("conversation_messages delete skipped:", deleteError.message);
    return;
  }

  const rows = messages.map((message) => ({
    id: randomUUID(),
    conversation_id: conversationId,
    user_id: userId,
    role: message.role,
    content: message.content,
    title: message.title ?? null,
    summary: message.summary ?? null,
    tags: message.tags ?? [],
    created_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from("conversation_messages").insert(rows);
  if (error) console.warn("conversation_messages insert skipped:", error.message);
}

export async function POST(req: Request) {
  try {
    const payload = schema.safeParse(await req.json());
    if (!payload.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid conversation payload", issues: payload.error.flatten() },
        { status: 400 },
      );
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
      mockStore.conversationMessages[conversation.id] = (payload.data.messages ?? []).map((message) => ({
        id: randomUUID(),
        conversation_id: conversation.id,
        user_id: "mock-user",
        role: message.role,
        content: message.content,
        title: message.title ?? null,
        summary: message.summary ?? null,
        tags: message.tags ?? [],
        created_at: now,
      }));

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

    await replaceConversationMessages(supabase, conversation.id, userData.user.id, payload.data.messages);

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
  } catch (error) {
    console.error("Conversation POST error:", error);
    return NextResponse.json({ ok: false, error: "Conversation could not be saved." }, { status: 200 });
  }
}

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return NextResponse.json(mockStore.conversations.slice(0, 25));

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return NextResponse.json([]);

    const { data, error } = await supabase
      .from("conversations")
      .select("id, title, summary, ai_response, selected_mode, privacy_risk, idea_prompt_needed, created_at, updated_at")
      .eq("user_id", userData.user.id)
      .order("updated_at", { ascending: false })
      .limit(25);

    if (error) {
      console.error("Conversation fetch error:", error.message);
      return NextResponse.json([]);
    }

    return NextResponse.json(data ?? []);
  } catch (error) {
    console.error("Conversation GET error:", error);
    return NextResponse.json([]);
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      const idx = mockStore.conversations.findIndex((conversation) => conversation.id === id);
      if (idx >= 0) mockStore.conversations.splice(idx, 1);
      delete mockStore.conversationMessages[id];
      return NextResponse.json({ ok: true });
    }

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { error } = await supabase.from("conversations").delete().eq("id", id).eq("user_id", userData.user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Conversation DELETE error:", error);
    return NextResponse.json({ ok: false, error: "Conversation could not be deleted." }, { status: 200 });
  }
}
