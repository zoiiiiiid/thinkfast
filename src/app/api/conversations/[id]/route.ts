import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { mockStore } from "@/lib/mock-store";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const messageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1),
  title: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
});

const patchSchema = z.object({
  title: z.string().min(1).optional(),
  originalPrompt: z.string().nullable().optional(),
  redactedPrompt: z.string().min(1).optional(),
  aiResponse: z.string().min(1).optional(),
  summary: z.string().optional(),
  selectedMode: z.string().optional(),
  privacyRisk: z.string().optional(),
  ideaPromptNeeded: z.boolean().optional(),
  messages: z.array(messageSchema).optional(),
});

type Params = { params: Promise<{ id: string }> };

function messagesFromConversation(conversation: Record<string, unknown>) {
  const messages = [];
  const prompt = conversation.redacted_prompt || conversation.original_prompt;

  if (typeof prompt === "string" && prompt.trim()) {
    messages.push({
      id: randomUUID(),
      role: "user",
      content: prompt,
    });
  }

  if (typeof conversation.ai_response === "string" && conversation.ai_response.trim()) {
    messages.push({
      id: randomUUID(),
      role: "assistant",
      title: typeof conversation.title === "string" ? conversation.title : undefined,
      summary: typeof conversation.summary === "string" ? conversation.summary : undefined,
      content: conversation.ai_response,
      tags: [],
    });
  }

  return messages;
}

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

export async function GET(_req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();

    if (!supabase) {
      const conversation = mockStore.conversations.find((item) => item.id === id);
      if (!conversation) return NextResponse.json({ ok: false, conversation: null, messages: [] });

      const storedMessages = mockStore.conversationMessages[id]?.length
        ? mockStore.conversationMessages[id]
        : messagesFromConversation(conversation);

      return NextResponse.json({ ok: true, conversation, messages: storedMessages });
    }

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const { data: conversation, error } = await supabase
      .from("conversations")
      .select("id, title, original_prompt, redacted_prompt, ai_response, summary, selected_mode, privacy_risk, idea_prompt_needed, created_at, updated_at")
      .eq("id", id)
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    if (!conversation) return NextResponse.json({ ok: false, conversation: null, messages: [] });

    const { data: rawMessages, error: messagesError } = await supabase
      .from("conversation_messages")
      .select("id, role, content, title, summary, tags, created_at")
      .eq("conversation_id", id)
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: true });

    if (messagesError) {
      console.warn("conversation_messages fetch skipped:", messagesError.message);
    }

    const messages = rawMessages?.length
      ? rawMessages.map((message) => ({
          id: message.id,
          role: message.role,
          content: message.content,
          title: message.title ?? undefined,
          summary: message.summary ?? undefined,
          tags: message.tags ?? [],
        }))
      : messagesFromConversation(conversation);

    return NextResponse.json({ ok: true, conversation, messages });
  } catch (error) {
    console.error("Conversation detail GET error:", error);
    return NextResponse.json({ ok: false, error: "Conversation could not be loaded.", messages: [] }, { status: 200 });
  }
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const parsed = patchSchema.safeParse(await req.json());

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid conversation update payload", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const supabase = await createSupabaseServerClient();
    const now = new Date().toISOString();

    if (!supabase) {
      const conversation = mockStore.conversations.find((item) => item.id === id);
      if (!conversation) return NextResponse.json({ ok: false, error: "Conversation not found" }, { status: 404 });

      conversation.title = parsed.data.title ?? conversation.title;
      conversation.original_prompt = parsed.data.originalPrompt ?? conversation.original_prompt;
      conversation.redacted_prompt = parsed.data.redactedPrompt ?? conversation.redacted_prompt;
      conversation.ai_response = parsed.data.aiResponse ?? conversation.ai_response;
      conversation.summary = parsed.data.summary ?? conversation.summary;
      conversation.selected_mode = parsed.data.selectedMode ?? conversation.selected_mode;
      conversation.privacy_risk = parsed.data.privacyRisk ?? conversation.privacy_risk;
      conversation.idea_prompt_needed = parsed.data.ideaPromptNeeded ?? conversation.idea_prompt_needed;
      conversation.updated_at = now;

      if (parsed.data.messages?.length) {
        mockStore.conversationMessages[id] = parsed.data.messages.map((message) => ({
          id: randomUUID(),
          conversation_id: id,
          user_id: "mock-user",
          role: message.role,
          content: message.content,
          title: message.title ?? null,
          summary: message.summary ?? null,
          tags: message.tags ?? [],
          created_at: now,
        }));
      }

      return NextResponse.json({ ok: true, conversationId: id, conversation, mode: "mock" });
    }

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const updateRow = {
      ...(parsed.data.title ? { title: parsed.data.title } : {}),
      ...(parsed.data.originalPrompt !== undefined ? { original_prompt: parsed.data.originalPrompt } : {}),
      ...(parsed.data.redactedPrompt ? { redacted_prompt: parsed.data.redactedPrompt } : {}),
      ...(parsed.data.aiResponse ? { ai_response: parsed.data.aiResponse } : {}),
      ...(parsed.data.summary ? { summary: parsed.data.summary } : {}),
      ...(parsed.data.selectedMode ? { selected_mode: parsed.data.selectedMode } : {}),
      ...(parsed.data.privacyRisk ? { privacy_risk: parsed.data.privacyRisk } : {}),
      ...(parsed.data.ideaPromptNeeded !== undefined ? { idea_prompt_needed: parsed.data.ideaPromptNeeded } : {}),
      updated_at: now,
    };

    const { data: conversation, error } = await supabase
      .from("conversations")
      .update(updateRow)
      .eq("id", id)
      .eq("user_id", userData.user.id)
      .select("id, title, original_prompt, redacted_prompt, ai_response, summary, selected_mode, privacy_risk, idea_prompt_needed, created_at, updated_at")
      .maybeSingle();

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    if (!conversation) return NextResponse.json({ ok: false, error: "Conversation not found" }, { status: 404 });

    await replaceConversationMessages(supabase, id, userData.user.id, parsed.data.messages);

    return NextResponse.json({ ok: true, conversationId: id, conversation });
  } catch (error) {
    console.error("Conversation detail PATCH error:", error);
    return NextResponse.json({ ok: false, error: "Conversation could not be updated." }, { status: 200 });
  }
}
