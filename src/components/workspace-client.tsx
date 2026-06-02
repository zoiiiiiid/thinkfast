"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { TEMPLATE_OPTIONS } from "@/lib/constants";
import { ModelSelector } from "@/components/model-selector";
import { SaveToBoardButton } from "@/components/save-to-board-button";
import type { AiMode, CreateTemplate, GenerationResult, IdeaCheckResult, PrivacyCheckResult } from "@/lib/types";

type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  title?: string;
  summary?: string;
  tags?: string[];
};

type PendingRequest = {
  prompt: string;
  privacy: PrivacyCheckResult;
  idea: IdeaCheckResult;
};

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(data?.error || data?.message || "Request failed");
  }

  return data as T;
}

function riskBadgeClass(risk?: string) {
  if (risk === "high") return "border-red-200 bg-red-50 text-red-700";
  if (risk === "medium") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

export function WorkspaceClient({ initialTemplate }: { initialTemplate?: CreateTemplate }) {
  const [template, setTemplate] = useState<CreateTemplate>(initialTemplate ?? "Reflection");
  const [mode, setMode] = useState<AiMode>("auto");
  const [input, setInput] = useState("");
  const [tone, setTone] = useState("balanced");
  const [saveRawPrompt, setSaveRawPrompt] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      title: "Welcome to ThinkFast",
      content:
        "Start with a prompt. I will check privacy, ask for your idea when the prompt is too broad, then generate a useful output you can continue as a conversation.",
      tags: ["privacy-first", "idea-led"],
    },
  ]);
  const [pending, setPending] = useState<PendingRequest | null>(null);
  const [privacyDecision, setPrivacyDecision] = useState<"protect" | "privacy-first" | "continue" | null>(null);
  const [ideaAnswer, setIdeaAnswer] = useState("");
  const [latestConversationId, setLatestConversationId] = useState<string | null>(null);
  const [latestOutput, setLatestOutput] = useState<GenerationResult | null>(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState<"checking" | "generating" | "saving" | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const privacyReady = useMemo(() => {
    if (!pending) return false;
    if (pending.privacy.privacyRisk === "low") return true;
    return Boolean(privacyDecision);
  }, [pending, privacyDecision]);

  const ideaReady = useMemo(() => {
    if (!pending) return false;
    if (!pending.idea.ideaPromptNeeded) return true;
    return ideaAnswer.trim().length > 0;
  }, [pending, ideaAnswer]);

  const canGeneratePending = Boolean(pending && privacyReady && ideaReady && !loading);

  function addMessage(message: Omit<ChatMessage, "id">) {
    setMessages((current) => [...current, { id: makeId(), ...message }]);
  }

  async function saveConversation(result: GenerationResult, request: PendingRequest, usedPrompt: string) {
    setLoading("saving");
    setStatus("Saving conversation...");

    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: result.title || `${template} Output`,
        originalPrompt: saveRawPrompt ? request.prompt : null,
        redactedPrompt: usedPrompt,
        aiResponse: result.output || "",
        summary: result.summary || "Generated ThinkFast output.",
        selectedMode: mode,
        privacyRisk: request.privacy.privacyRisk,
        ideaPromptNeeded: request.idea.ideaPromptNeeded,
        followUpCard: result.followUpCard,
        template,
      }),
    });

    const json = await readJson<{ ok?: boolean; conversationId?: string; conversation?: { id: string } }>(res);
    const id = json.conversationId ?? json.conversation?.id ?? null;
    setLatestConversationId(id);
    setStatus(id ? "Saved. You can now add this conversation to a board." : "Generated, but no conversation ID was returned.");
  }

  async function generateFromPending(request: PendingRequest) {
    const decision = request.privacy.privacyRisk === "low" ? "protect" : privacyDecision;
    const usedMode = decision === "privacy-first" ? "privacy-first" : mode;
    const promptToGenerate = decision === "continue" ? request.prompt : request.privacy.redactedPrompt;
    const answers = request.idea.ideaPromptNeeded ? [ideaAnswer.trim()] : [];

    setLoading("generating");
    setStatus("Generating with ThinkFast...");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: request.prompt,
          redactedPrompt: promptToGenerate,
          template,
          mode: usedMode,
          preferredTone: tone,
          ideaAnswers: answers,
        }),
      });

      const result = await readJson<GenerationResult>(res);
      setLatestOutput(result);
      addMessage({
        role: "assistant",
        title: result.title,
        summary: result.summary,
        content: result.output,
        tags: result.tags,
      });

      await saveConversation(result, request, promptToGenerate);
      setPending(null);
      setIdeaAnswer("");
      setPrivacyDecision(null);
    } catch (error) {
      console.error(error);
      addMessage({
        role: "system",
        content: error instanceof Error ? error.message : "Something went wrong while generating.",
      });
      setStatus("Generation failed. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const prompt = input.trim();
    if (!prompt || loading) return;

    setInput("");
    setLatestConversationId(null);
    setLatestOutput(null);
    setPending(null);
    setIdeaAnswer("");
    setPrivacyDecision(null);
    setStatus("Checking privacy and idea quality...");

    addMessage({ role: "user", content: prompt });
    setLoading("checking");

    try {
      const [privacy, idea] = await Promise.all([
        fetch("/api/check-privacy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt }),
        }).then((response) => readJson<PrivacyCheckResult>(response)),
        fetch("/api/check-idea", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt }),
        }).then((response) => readJson<IdeaCheckResult>(response)),
      ]);

      const request = { prompt, privacy, idea };
      setPending(request);
      setLoading(null);

      if (privacy.privacyRisk === "low" && !idea.ideaPromptNeeded) {
        setPrivacyDecision("protect");
        await generateFromPending(request);
      } else {
        setStatus("Review the quick checks, then continue generation.");
      }
    } catch (error) {
      console.error(error);
      addMessage({
        role: "system",
        content: error instanceof Error ? error.message : "Checks failed. Please try again.",
      });
      setStatus("Checks failed. Please try again.");
      setLoading(null);
    }
  }

  const pendingQuickOptions = pending?.idea.quickOptions?.length
    ? pending.idea.quickOptions
    : pending?.idea.suggestedQuestions ?? [];

  return (
    <section className="mx-auto flex h-[calc(100vh-6.75rem)] max-w-5xl flex-col overflow-hidden rounded-[2rem] border bg-card/80 shadow-sm backdrop-blur">
      <header className="border-b bg-card/90 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">ThinkFast Workspace</p>
            <h1 className="text-xl font-semibold tracking-tight">Chat, check, generate, continue</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={template}
              onChange={(event) => setTemplate(event.target.value as CreateTemplate)}
              className="h-10 rounded-full border bg-background px-3 text-sm outline-none"
              aria-label="Select template"
            >
              {TEMPLATE_OPTIONS.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
            <ModelSelector mode={mode} onChange={setMode} />
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-5 md:px-6">
        <div className="mx-auto space-y-5">
          {messages.map((message) => (
            <article
              key={message.id}
              className={
                message.role === "user"
                  ? "ml-auto max-w-[82%] rounded-3xl bg-primary px-4 py-3 text-primary-foreground shadow-sm"
                  : message.role === "system"
                    ? "mx-auto max-w-[82%] rounded-3xl border bg-muted/60 px-4 py-3 text-sm text-muted-foreground"
                    : "mr-auto max-w-[88%] rounded-3xl border bg-background px-4 py-4 shadow-sm"
              }
            >
              {message.title ? <h2 className="mb-1 font-semibold tracking-tight">{message.title}</h2> : null}
              {message.summary ? <p className="mb-3 text-sm text-muted-foreground">{message.summary}</p> : null}
              <div className="whitespace-pre-wrap text-sm leading-7">{message.content}</div>
              {message.tags?.length ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {message.tags.slice(0, 5).map((tag) => (
                    <span key={tag} className="rounded-full bg-muted px-2 py-1 text-[11px] text-muted-foreground">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </article>
          ))}

          {pending ? (
            <article className="mr-auto max-w-[92%] rounded-3xl border bg-background p-4 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-3 py-1 text-xs font-medium ${riskBadgeClass(pending.privacy.privacyRisk)}`}>
                  Privacy: {pending.privacy.privacyRisk}
                </span>
                <span className="rounded-full border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                  Idea check: {pending.idea.ideaPromptNeeded ? "needs direction" : "enough direction"}
                </span>
              </div>

              {pending.privacy.privacyRisk !== "low" ? (
                <div className="mb-4 rounded-2xl border bg-muted/40 p-3">
                  <p className="text-sm font-medium">Privacy check found: {pending.privacy.detectedItems.join(", ") || "sensitive context"}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">Redacted preview: {pending.privacy.redactedPrompt}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant={privacyDecision === "protect" ? "default" : "outline"} onClick={() => setPrivacyDecision("protect")}>
                      Protect details
                    </Button>
                    <Button size="sm" variant={privacyDecision === "privacy-first" ? "default" : "outline"} onClick={() => { setPrivacyDecision("privacy-first"); setMode("privacy-first"); }}>
                      Privacy First
                    </Button>
                    <Button size="sm" variant={privacyDecision === "continue" ? "default" : "outline"} onClick={() => setPrivacyDecision("continue")}>
                      Continue anyway
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="mb-4 rounded-2xl border bg-emerald-50 px-3 py-2 text-sm text-emerald-700">No major sensitive details detected. Redacted mode will be used by default.</p>
              )}

              {pending.idea.ideaPromptNeeded ? (
                <div className="rounded-2xl border bg-muted/40 p-3">
                  <p className="text-sm font-medium">Give ThinkFast one direction before it generates.</p>
                  <p className="mt-1 text-xs text-muted-foreground">{pending.idea.reason}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {pendingQuickOptions.map((option) => (
                      <button
                        type="button"
                        key={option}
                        onClick={() => setIdeaAnswer(option)}
                        className={`rounded-full border px-3 py-1.5 text-xs transition ${ideaAnswer === option ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={ideaAnswer}
                    onChange={(event) => setIdeaAnswer(event.target.value)}
                    className="mt-3 min-h-16 w-full resize-none rounded-2xl border bg-background p-3 text-sm outline-none focus:border-primary"
                    placeholder="Or type your own quick idea..."
                  />
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button onClick={() => void generateFromPending(pending)} disabled={!canGeneratePending}>
                  {loading === "generating" || loading === "saving" ? "Working..." : "Generate with these choices"}
                </Button>
                <span className="text-xs text-muted-foreground">
                  {privacyReady && ideaReady ? "Ready to generate." : "Complete privacy and idea choices first."}
                </span>
              </div>
            </article>
          ) : null}
        </div>
      </div>

      <footer className="border-t bg-card/95 p-4">
        <div className="mx-auto space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="rounded-full border px-2.5 py-1">Tone: {tone}</span>
              <label className="flex items-center gap-2 rounded-full border px-2.5 py-1">
                <input type="checkbox" checked={saveRawPrompt} onChange={(event) => setSaveRawPrompt(event.target.checked)} />
                Save raw prompt
              </label>
              {status ? <span>{status}</span> : null}
            </div>
            {latestOutput ? <SaveToBoardButton conversationId={latestConversationId} /> : null}
          </div>

          <form onSubmit={handleSubmit} className="flex items-end gap-3 rounded-[1.75rem] border bg-background p-2 shadow-sm">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void handleSubmit(event as unknown as FormEvent);
                }
              }}
              placeholder="Message ThinkFast..."
              className="max-h-36 min-h-12 flex-1 resize-none bg-transparent px-3 py-3 text-sm leading-6 outline-none"
            />
            <div className="hidden items-center gap-2 md:flex">
              <input
                value={tone}
                onChange={(event) => setTone(event.target.value)}
                className="h-10 w-28 rounded-full border bg-background px-3 text-xs outline-none"
                aria-label="Preferred tone"
              />
            </div>
            <Button type="submit" size="lg" disabled={!input.trim() || Boolean(loading)}>
              {loading === "checking" ? "Checking..." : "Send"}
            </Button>
          </form>
        </div>
      </footer>
    </section>
  );
}
