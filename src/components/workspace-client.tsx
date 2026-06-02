"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
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

function riskLabel(risk?: string) {
  if (risk === "high") return "High privacy risk";
  if (risk === "medium") return "Medium privacy risk";
  return "Low privacy risk";
}

function riskClass(risk?: string) {
  if (risk === "high") return "border-red-200 bg-red-50 text-red-700";
  if (risk === "medium") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function autosizeTextArea(element: HTMLTextAreaElement | null) {
  if (!element) return;
  element.style.height = "0px";
  element.style.height = `${Math.min(element.scrollHeight, 160)}px`;
}

export function WorkspaceClient({ initialTemplate }: { initialTemplate?: CreateTemplate }) {
  const [template, setTemplate] = useState<CreateTemplate>(initialTemplate ?? "Reflection");
  const [mode, setMode] = useState<AiMode>("auto");
  const [input, setInput] = useState("");
  const [tone, setTone] = useState("balanced");
  const [saveRawPrompt, setSaveRawPrompt] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState<PendingRequest | null>(null);
  const [privacyDecision, setPrivacyDecision] = useState<"protect" | "privacy-first" | "continue" | null>(null);
  const [ideaAnswer, setIdeaAnswer] = useState("");
  const [latestConversationId, setLatestConversationId] = useState<string | null>(null);
  const [latestOutput, setLatestOutput] = useState<GenerationResult | null>(null);
  const [status, setStatus] = useState("Ready");
  const [loading, setLoading] = useState<"checking" | "generating" | "saving" | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, pending, loading]);

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

  async function saveConversation(result: GenerationResult, request: PendingRequest, usedPrompt: string, usedMode: AiMode) {
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
        selectedMode: usedMode,
        privacyRisk: request.privacy.privacyRisk,
        ideaPromptNeeded: request.idea.ideaPromptNeeded,
        followUpCard: result.followUpCard,
        template,
      }),
    });

    const json = await readJson<{ ok?: boolean; conversationId?: string; conversation?: { id: string } }>(res);
    const id = json.conversationId ?? json.conversation?.id ?? null;
    setLatestConversationId(id);
    setStatus(id ? "Saved. Choose a board to file it." : "Generated, but no conversation ID was returned.");
  }

  async function generateFromPending(request: PendingRequest) {
    const decision = request.privacy.privacyRisk === "low" ? "protect" : privacyDecision;
    const usedMode: AiMode = decision === "privacy-first" ? "privacy-first" : mode;
    const promptToGenerate = decision === "continue" ? request.prompt : request.privacy.redactedPrompt;
    const answers = request.idea.ideaPromptNeeded ? [ideaAnswer.trim()] : [];

    setLoading("generating");
    setStatus("Generating...");

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

      await saveConversation(result, request, promptToGenerate, usedMode);
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
    autosizeTextArea(inputRef.current);
    setLatestConversationId(null);
    setLatestOutput(null);
    setPending(null);
    setIdeaAnswer("");
    setPrivacyDecision(null);
    setStatus("Checking idea and privacy...");

    addMessage({ role: "user", content: prompt });
    setLoading("checking");

    try {
      const [idea, privacy] = await Promise.all([
        fetch("/api/check-idea", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, template }),
        }).then((response) => readJson<IdeaCheckResult>(response)),
        fetch("/api/check-privacy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt }),
        }).then((response) => readJson<PrivacyCheckResult>(response)),
      ]);

      const request = { prompt, privacy, idea };
      setPending(request);
      setLoading(null);

      if (privacy.privacyRisk === "low" && !idea.ideaPromptNeeded) {
        setPrivacyDecision("protect");
        await generateFromPending(request);
      } else {
        setStatus(idea.ideaPromptNeeded ? "Add your idea first." : "Choose a privacy option.");
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
    <section className="mx-auto flex h-[calc(100vh-5.5rem)] max-w-5xl flex-col overflow-hidden rounded-[1.75rem] border bg-background shadow-sm">
      <header className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-tight">ThinkFast Workspace</p>
          <p className="text-xs text-muted-foreground">Idea first. Privacy protected. Then generate.</p>
        </div>
        <div className="hidden items-center gap-2 text-xs text-muted-foreground md:flex">
          <span className="rounded-full border px-2.5 py-1">{status}</span>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
        {!messages.length && !pending ? (
          <div className="mx-auto flex min-h-full max-w-2xl flex-col justify-center pb-10 text-center">
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">What are you making today?</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Type your request below. ThinkFast will ask for your own idea when the prompt is too broad, then protect private details before generating.
            </p>
          </div>
        ) : null}

        <div className="mx-auto max-w-3xl space-y-6">
          {messages.map((message) => (
            <article
              key={message.id}
              className={
                message.role === "user"
                  ? "ml-auto max-w-[82%] rounded-[1.4rem] bg-primary px-4 py-3 text-primary-foreground shadow-sm"
                  : message.role === "system"
                    ? "mx-auto max-w-[86%] rounded-[1.4rem] border bg-muted/40 px-4 py-3 text-sm text-muted-foreground"
                    : "mr-auto max-w-[92%] px-1 py-1"
              }
            >
              {message.role === "assistant" ? (
                <div className="rounded-[1.5rem] border bg-card px-5 py-4 shadow-sm">
                  {message.title ? <h2 className="mb-1 font-semibold tracking-tight">{message.title}</h2> : null}
                  {message.summary ? <p className="mb-3 text-sm text-muted-foreground">{message.summary}</p> : null}
                  <div className="whitespace-pre-wrap text-sm leading-7">{message.content}</div>
                  {message.tags?.length ? (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {message.tags.slice(0, 4).map((tag) => (
                        <span key={tag} className="rounded-full bg-muted px-2 py-1 text-[11px] text-muted-foreground">
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="whitespace-pre-wrap text-sm leading-7">{message.content}</div>
              )}
            </article>
          ))}

          {pending ? (
            <article className="mr-auto max-w-[92%] rounded-[1.5rem] border bg-card p-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                  Idea check: {pending.idea.ideaPromptNeeded ? "needs your direction" : "ready"}
                </span>
                <span className={`rounded-full border px-3 py-1 text-xs font-medium ${riskClass(pending.privacy.privacyRisk)}`}>
                  {riskLabel(pending.privacy.privacyRisk)}
                </span>
              </div>

              {pending.idea.ideaPromptNeeded ? (
                <div className="mt-4 rounded-[1.25rem] border bg-background p-4">
                  <p className="text-sm font-semibold">Your idea first</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{pending.idea.reason}</p>
                  <div className="mt-3 grid gap-2">
                    {pendingQuickOptions.slice(0, 3).map((option) => (
                      <button
                        type="button"
                        key={option}
                        onClick={() => setIdeaAnswer(option)}
                        className={`rounded-2xl border px-3 py-2 text-left text-xs leading-5 transition ${ideaAnswer === option ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted/60"}`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={ideaAnswer}
                    onChange={(event) => setIdeaAnswer(event.target.value)}
                    className="mt-3 min-h-16 w-full resize-none rounded-2xl border bg-background p-3 text-sm outline-none focus:border-primary"
                    placeholder="Or type your own idea in one sentence..."
                  />
                </div>
              ) : null}

              {pending.privacy.privacyRisk !== "low" ? (
                <div className="mt-4 rounded-[1.25rem] border bg-background p-4">
                  <p className="text-sm font-semibold">Privacy check</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Detected: {pending.privacy.detectedItems.join(", ") || "sensitive context"}
                  </p>
                  <p className="mt-2 line-clamp-2 rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">
                    {pending.privacy.redactedPrompt}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant={privacyDecision === "protect" ? "default" : "outline"} onClick={() => setPrivacyDecision("protect")}>
                      Protect
                    </Button>
                    <Button size="sm" variant={privacyDecision === "privacy-first" ? "default" : "outline"} onClick={() => { setPrivacyDecision("privacy-first"); setMode("privacy-first"); }}>
                      Privacy First
                    </Button>
                    <Button size="sm" variant={privacyDecision === "continue" ? "default" : "outline"} onClick={() => setPrivacyDecision("continue")}>
                      Continue anyway
                    </Button>
                  </div>
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button onClick={() => void generateFromPending(pending)} disabled={!canGeneratePending}>
                  {loading === "generating" || loading === "saving" ? "Working..." : "Generate"}
                </Button>
                <span className="text-xs text-muted-foreground">
                  {ideaReady && privacyReady ? "Ready." : "Complete the required check first."}
                </span>
              </div>
            </article>
          ) : null}

          <div ref={bottomRef} />
        </div>
      </div>

      <footer className="border-t bg-background px-3 py-3 md:px-5">
        <div className="mx-auto max-w-3xl space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={template}
                onChange={(event) => setTemplate(event.target.value as CreateTemplate)}
                className="h-8 rounded-full border bg-background px-3 text-xs outline-none"
                aria-label="Select template"
              >
                {TEMPLATE_OPTIONS.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
              <ModelSelector mode={mode} onChange={setMode} />
              <input
                value={tone}
                onChange={(event) => setTone(event.target.value)}
                className="h-8 w-28 rounded-full border bg-background px-3 text-xs outline-none"
                aria-label="Preferred tone"
                placeholder="Tone"
              />
              <label className="hidden items-center gap-2 rounded-full border px-2.5 py-1.5 md:flex">
                <input type="checkbox" checked={saveRawPrompt} onChange={(event) => setSaveRawPrompt(event.target.checked)} />
                Save raw
              </label>
            </div>
            {latestOutput ? <SaveToBoardButton conversationId={latestConversationId} /> : null}
          </div>

          <form onSubmit={handleSubmit} className="rounded-[1.5rem] border bg-card p-2 shadow-sm">
            <div className="px-3 pt-2 text-xs text-muted-foreground">
              Start with your request. If it is too broad, ThinkFast will ask for your own idea first.
            </div>
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(event) => {
                  setInput(event.target.value);
                  autosizeTextArea(event.currentTarget);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void handleSubmit(event as unknown as FormEvent);
                  }
                }}
                placeholder="Ask ThinkFast anything..."
                className="max-h-40 min-h-12 flex-1 resize-none bg-transparent px-3 py-3 text-sm leading-6 outline-none"
              />
              <Button type="submit" size="lg" disabled={!input.trim() || Boolean(loading)}>
                {loading === "checking" ? "Checking" : "Send"}
              </Button>
            </div>
          </form>
        </div>
      </footer>
    </section>
  );
}
