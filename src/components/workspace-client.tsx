"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { TEMPLATE_OPTIONS } from "@/lib/constants";
import { ModelSelector } from "@/components/model-selector";
import { SaveToBoardButton } from "@/components/save-to-board-button";
import { getModelLabel } from "@/lib/model-router";
import type {
  AiMode,
  CreateTemplate,
  GenerationResult,
  IdeaCheckResult,
  PrivacyCheckResult,
} from "@/lib/types";

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

type PrivacyDecision = "protect" | "privacy-first" | "continue";

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

function autosizeTextArea(element: HTMLTextAreaElement | null) {
  if (!element) return;
  element.style.height = "0px";
  element.style.height = `${Math.min(element.scrollHeight, 180)}px`;
}

function riskLabel(risk?: string) {
  if (risk === "high") return "High risk";
  if (risk === "medium") return "Medium risk";
  return "Low risk";
}

function riskClass(risk?: string) {
  if (risk === "high") return "border-red-200 bg-red-50 text-red-700";
  if (risk === "medium") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function statusText(
  loading: "checking" | "generating" | "saving" | null,
  pending: PendingRequest | null
) {
  if (loading === "checking") return "Checking";
  if (loading === "generating") return "Generating";
  if (loading === "saving") return "Saving";
  if (pending?.idea.ideaPromptNeeded) return "Your Idea First";
  if (pending?.privacy.privacyRisk !== "low") return "Privacy Decision";
  return "Ready";
}

function getComposerHint(
  pending: PendingRequest | null,
  loading: "checking" | "generating" | "saving" | null
) {
  if (loading === "checking") {
    return "Checking if your prompt needs your idea first.";
  }

  if (loading === "generating") {
    return "Generating from your prompt, idea direction, and privacy choice.";
  }

  if (pending?.idea.ideaPromptNeeded) {
    return "Your first prompt was too broad. Add your idea direction below before ThinkFast generates.";
  }

  if (pending && pending.privacy.privacyRisk !== "low") {
    return "Choose how ThinkFast should handle the privacy risk before generating.";
  }

  return "Prompt normally. If your request is too broad, ThinkFast will ask for your idea first.";
}

function compactHistory(messages: ChatMessage[]) {
  return messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .slice(-8)
    .map((message) => ({
      role: message.role as "user" | "assistant",
      content: [message.title, message.summary, message.content]
        .filter(Boolean)
        .join("\n"),
    }));
}

export function WorkspaceClient({
  initialTemplate,
}: {
  initialTemplate?: CreateTemplate;
}) {
  const [template, setTemplate] = useState<CreateTemplate>(
    initialTemplate ?? "Reflection"
  );
  const [mode, setMode] = useState<AiMode>("auto");
  const [input, setInput] = useState("");
  const [saveRawPrompt, setSaveRawPrompt] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesRef = useRef<ChatMessage[]>([]);

  const [pending, setPending] = useState<PendingRequest | null>(null);
  const [privacyDecision, setPrivacyDecision] =
    useState<PrivacyDecision | null>(null);
  const [ideaAnswer, setIdeaAnswer] = useState("");

  const [latestConversationId, setLatestConversationId] = useState<string | null>(
    null
  );
  const [latestOutput, setLatestOutput] = useState<GenerationResult | null>(
    null
  );

  const [loading, setLoading] = useState<
    "checking" | "generating" | "saving" | null
  >(null);

  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const ideaRef = useRef<HTMLTextAreaElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, pending, loading]);

  useEffect(() => {
    if (pending?.idea.ideaPromptNeeded) {
      setTimeout(() => ideaRef.current?.focus(), 80);
    }
  }, [pending]);

  const needsIdea = Boolean(pending?.idea.ideaPromptNeeded);
  const needsPrivacy = Boolean(pending && pending.privacy.privacyRisk !== "low");

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

  const quickOptions = pending?.idea.quickOptions?.length
    ? pending.idea.quickOptions
    : [];

  function addMessage(message: Omit<ChatMessage, "id">) {
    const nextMessage: ChatMessage = {
      id: makeId(),
      ...message,
    };

    const nextMessages = [...messagesRef.current, nextMessage];
    messagesRef.current = nextMessages;
    setMessages(nextMessages);

    return nextMessage;
  }

  async function saveConversation(
    result: GenerationResult,
    request: PendingRequest,
    usedPrompt: string,
    usedMode: AiMode
  ) {
    setLoading("saving");

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

    const json = await readJson<{
      ok?: boolean;
      conversationId?: string;
      conversation?: { id: string };
    }>(res);

    const id = json.conversationId ?? json.conversation?.id ?? null;
    setLatestConversationId(id);
  }

  async function generateFromPending(
    request: PendingRequest,
    options?: {
      ideaOverride?: string;
      privacyDecisionOverride?: PrivacyDecision;
    }
  ) {
    const selectedIdea = options?.ideaOverride ?? ideaAnswer.trim();

    if (request.idea.ideaPromptNeeded && !selectedIdea) {
      return;
    }

    const selectedPrivacyDecision =
      request.privacy.privacyRisk === "low"
        ? "protect"
        : options?.privacyDecisionOverride ?? privacyDecision;

    if (request.privacy.privacyRisk !== "low" && !selectedPrivacyDecision) {
      return;
    }

    const usedMode: AiMode =
      selectedPrivacyDecision === "privacy-first" ? "privacy-first" : mode;

    const promptToGenerate =
      selectedPrivacyDecision === "continue"
        ? request.prompt
        : request.privacy.redactedPrompt;

    const answers = request.idea.ideaPromptNeeded ? [selectedIdea] : [];

    if (request.idea.ideaPromptNeeded && selectedIdea) {
      addMessage({
        role: "user",
        content: `My idea direction: ${selectedIdea}`,
      });
    }

    setLoading("generating");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: request.prompt,
          redactedPrompt: promptToGenerate,
          template,
          mode: usedMode,
          ideaAnswers: answers,
          conversationHistory: compactHistory(messagesRef.current),
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
        content:
          error instanceof Error
            ? error.message
            : "Something went wrong while generating.",
      });
    } finally {
      setLoading(null);
    }
  }

  async function runChecks(prompt: string) {
    setLatestConversationId(null);
    setLatestOutput(null);
    setPending(null);
    setIdeaAnswer("");
    setPrivacyDecision(null);
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

      const request: PendingRequest = { prompt, privacy, idea };
      setPending(request);
      setLoading(null);

      if (privacy.privacyRisk === "low" && !idea.ideaPromptNeeded) {
        setPrivacyDecision("protect");
        await generateFromPending(request, {
          privacyDecisionOverride: "protect",
        });
      }
    } catch (error) {
      console.error(error);

      addMessage({
        role: "system",
        content:
          error instanceof Error
            ? error.message
            : "Checks failed. Please try again.",
      });

      setLoading(null);
    }
  }

  async function handlePromptSubmit(event?: FormEvent) {
    event?.preventDefault();

    const prompt = input.trim();

    if (!prompt || loading || pending) {
      return;
    }

    setInput("");
    autosizeTextArea(inputRef.current);

    addMessage({
      role: "user",
      content: prompt,
    });

    await runChecks(prompt);
  }

  async function handleIdeaSubmit(event?: FormEvent) {
    event?.preventDefault();

    if (!pending || !ideaReady || loading) {
      return;
    }

    if (!privacyReady && needsPrivacy) {
      return;
    }

    await generateFromPending(pending);
  }

  async function chooseIdea(option: string) {
    setIdeaAnswer(option);

    if (!pending || loading) {
      return;
    }

    if (needsPrivacy && !privacyDecision) {
      return;
    }

    await generateFromPending(pending, {
      ideaOverride: option,
    });
  }

  function cancelPending() {
    setPending(null);
    setIdeaAnswer("");
    setPrivacyDecision(null);
    setInput("");
  }

  return (
    <section className="mx-auto flex h-[calc(100vh-5.5rem)] max-w-5xl flex-col overflow-hidden rounded-[1.75rem] border bg-background shadow-sm">
      <header className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-tight">
            ThinkFast Workspace
          </p>
          <p className="text-xs text-muted-foreground">
            Idea first, privacy checked, then generated.
          </p>
        </div>

        <div className="hidden items-center gap-2 text-xs text-muted-foreground md:flex">
          <span className="rounded-full border px-2.5 py-1">
            {statusText(loading, pending)}
          </span>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
        {!messages.length && !pending ? (
          <div className="mx-auto flex min-h-full max-w-2xl flex-col justify-center pb-10 text-center">
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              What are you making today?
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Start with a normal prompt. If it is too broad, ThinkFast will ask
              for your idea first before generating.
            </p>
          </div>
        ) : null}

        <div className="mx-auto max-w-3xl space-y-5">
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
                  {message.title ? (
                    <h2 className="mb-1 font-semibold tracking-tight">
                      {message.title}
                    </h2>
                  ) : null}

                  {message.summary ? (
                    <p className="mb-3 text-sm text-muted-foreground">
                      {message.summary}
                    </p>
                  ) : null}

                  <div className="whitespace-pre-wrap text-sm leading-7">
                    {message.content}
                  </div>

                  {message.tags?.length ? (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {message.tags.slice(0, 4).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-muted px-2 py-1 text-[11px] text-muted-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="whitespace-pre-wrap text-sm leading-7">
                  {message.content}
                </div>
              )}
            </article>
          ))}

          {pending ? (
            <article className="mr-auto max-w-[92%] rounded-[1.5rem] border bg-card p-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${
                    pending.idea.ideaPromptNeeded
                      ? "border-primary/20 bg-primary/10 text-primary"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {pending.idea.ideaPromptNeeded
                    ? "Your Idea First"
                    : "Idea ready"}
                </span>

                <span
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${riskClass(
                    pending.privacy.privacyRisk
                  )}`}
                >
                  Privacy: {riskLabel(pending.privacy.privacyRisk)}
                </span>
              </div>

              {pending.idea.ideaPromptNeeded ? (
                <div className="mt-4 rounded-[1.25rem] border border-primary/15 bg-primary/5 p-4">
                  <p className="text-sm font-semibold">Your Idea First</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {pending.idea.reason}
                  </p>

                  {pending.idea.suggestedQuestions.length ? (
                    <div className="mt-3 rounded-2xl bg-background/80 p-3">
                      <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        Direction guide
                      </p>
                      <ul className="space-y-1 text-xs leading-5 text-muted-foreground">
                        {pending.idea.suggestedQuestions
                          .slice(0, 3)
                          .map((question) => (
                            <li key={question}>• {question}</li>
                          ))}
                      </ul>
                    </div>
                  ) : null}

                  {quickOptions.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {quickOptions.slice(0, 4).map((option) => (
                        <button
                          type="button"
                          key={option}
                          onClick={() => void chooseIdea(option)}
                          className={`rounded-full border px-3 py-1.5 text-left text-xs transition ${
                            ideaAnswer === option
                              ? "border-primary bg-primary text-primary-foreground"
                              : "bg-card hover:bg-muted/60"
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {needsPrivacy ? (
                <div className="mt-4 rounded-[1.25rem] border bg-background p-4">
                  <p className="text-sm font-semibold">Privacy check</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Detected:{" "}
                    {pending.privacy.detectedItems.join(", ") ||
                      "sensitive context"}
                  </p>

                  <p className="mt-2 line-clamp-2 rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">
                    {pending.privacy.redactedPrompt}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant={
                        privacyDecision === "protect" ? "default" : "outline"
                      }
                      onClick={() => setPrivacyDecision("protect")}
                    >
                      Protect
                    </Button>

                    <Button
                      size="sm"
                      variant={
                        privacyDecision === "privacy-first"
                          ? "default"
                          : "outline"
                      }
                      onClick={() => {
                        setPrivacyDecision("privacy-first");
                        setMode("privacy-first");
                      }}
                    >
                      Privacy First
                    </Button>

                    <Button
                      size="sm"
                      variant={
                        privacyDecision === "continue" ? "default" : "outline"
                      }
                      onClick={() => setPrivacyDecision("continue")}
                    >
                      Continue anyway
                    </Button>
                  </div>
                </div>
              ) : null}
            </article>
          ) : null}

          <div ref={bottomRef} />
        </div>
      </div>

      <footer className="border-t bg-background px-3 py-3 md:px-5">
        <div className="mx-auto max-w-3xl space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-1.5 rounded-full border bg-background px-2.5 py-1.5">
                <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Task
                </span>

                <select
                  value={template}
                  onChange={(event) =>
                    setTemplate(event.target.value as CreateTemplate)
                  }
                  className="bg-transparent text-xs font-medium outline-none"
                  aria-label="Select template"
                  disabled={Boolean(pending)}
                >
                  {TEMPLATE_OPTIONS.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>

              <label className="flex items-center gap-1.5 rounded-full border bg-background px-2.5 py-1.5">
                <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Mode
                </span>

                <ModelSelector
                  mode={mode}
                  onChange={setMode}
                  disabled={Boolean(pending)}
                />
              </label>

              <label className="hidden items-center gap-2 rounded-full border px-2.5 py-1.5 md:flex">
                <input
                  type="checkbox"
                  checked={saveRawPrompt}
                  onChange={(event) => setSaveRawPrompt(event.target.checked)}
                  disabled={Boolean(pending)}
                />
                Save raw
              </label>
            </div>

            {latestOutput ? (
              <SaveToBoardButton conversationId={latestConversationId} />
            ) : null}
          </div>

          <p className="px-2 text-[11px] text-muted-foreground">
            {getComposerHint(pending, loading)}
          </p>

          {needsIdea ? (
            <form
              onSubmit={handleIdeaSubmit}
              className="rounded-[1.5rem] border border-primary/20 bg-card p-2 shadow-sm"
            >
              <div className="px-3 pt-2 text-xs font-medium text-primary">
                Your Idea First
              </div>

              <div className="flex items-end gap-2">
                <textarea
                  ref={ideaRef}
                  value={ideaAnswer}
                  onChange={(event) => {
                    setIdeaAnswer(event.target.value);
                    autosizeTextArea(event.currentTarget);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void handleIdeaSubmit();
                    }
                  }}
                  placeholder="Type your idea, opinion, example, or direction here..."
                  className="max-h-40 min-h-12 flex-1 resize-none bg-transparent px-3 py-3 text-sm leading-6 outline-none"
                />

                <Button
                  type="submit"
                  size="lg"
                  disabled={!ideaReady || !privacyReady || Boolean(loading)}
                >
                  {loading ? "Working" : "Continue"}
                </Button>
              </div>

              <div className="flex items-center justify-between px-3 pb-1 text-[11px] text-muted-foreground">
                <span>
                  {privacyReady
                    ? "Your idea will be combined with the original prompt."
                    : "Choose a privacy option above before continuing."}
                </span>

                <button
                  type="button"
                  className="hover:text-foreground"
                  onClick={cancelPending}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : pending ? (
            <div className="rounded-[1.5rem] border bg-card p-3 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  {needsPrivacy
                    ? "Choose a privacy option above, then generate."
                    : "Checks complete. Ready to generate."}
                </p>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={cancelPending}
                    disabled={Boolean(loading)}
                  >
                    Cancel
                  </Button>

                  <Button
                    onClick={() => void generateFromPending(pending)}
                    disabled={!canGeneratePending}
                  >
                    {loading === "generating" || loading === "saving"
                      ? "Working..."
                      : "Generate"}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <form
              onSubmit={handlePromptSubmit}
              className="rounded-[1.5rem] border bg-card p-2 shadow-sm"
            >
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
                      void handlePromptSubmit();
                    }
                  }}
                  placeholder="Ask ThinkFast anything..."
                  className="max-h-40 min-h-12 flex-1 resize-none bg-transparent px-3 py-3 text-sm leading-6 outline-none"
                  disabled={Boolean(loading)}
                />

                <Button
                  type="submit"
                  size="lg"
                  disabled={!input.trim() || Boolean(loading)}
                >
                  {loading === "checking" ? "Checking" : "Send"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </footer>
    </section>
  );
}