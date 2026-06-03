"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { AiMode, PrivacyRisk } from "@/lib/types";
import {
  getModelLabel,
  THINKFAST_MODE_OPTIONS,
} from "@/lib/model-router";

type WorkspaceComposerProps = {
  prompt: string;
  setPrompt: (value: string) => void;

  template: string;
  setTemplate: (value: string) => void;

  mode: AiMode;
  setMode: (value: AiMode) => void;

  preferredTone: string;
  setPreferredTone: (value: string) => void;

  isGenerating: boolean;

  isIdeaFirstActive: boolean;
  ideaQuestion?: string;
  ideaSuggestions?: string[];

  privacyRisk?: PrivacyRisk | null;

  onSubmitPrompt: () => void;
  onSubmitIdea: (idea: string) => void;
};

const TEMPLATE_OPTIONS = [
  "Reflection",
  "Essay",
  "Quiz Reviewer",
  "Business Idea",
  "Presentation Script",
  "Email",
  "Social Media Caption",
  "Study Plan",
  "Project Proposal",
  "Custom",
];

const TONE_OPTIONS = [
  "balanced",
  "natural",
  "academic",
  "simple",
  "confident",
  "professional",
  "casual",
];

function getPrivacyLabel(risk?: PrivacyRisk | null) {
  if (!risk) return "Not checked yet";

  if (risk === "high") return "High privacy risk";
  if (risk === "medium") return "Medium privacy risk";
  return "Low privacy risk";
}

function getPrivacyClass(risk?: PrivacyRisk | null) {
  if (risk === "high") return "bg-red-100 text-red-700 border-red-200";
  if (risk === "medium") return "bg-amber-100 text-amber-700 border-amber-200";
  if (risk === "low") return "bg-emerald-100 text-emerald-700 border-emerald-200";
  return "bg-muted text-muted-foreground border-border";
}

export function WorkspaceComposer({
  prompt,
  setPrompt,
  template,
  setTemplate,
  mode,
  setMode,
  preferredTone,
  setPreferredTone,
  isGenerating,
  isIdeaFirstActive,
  ideaQuestion,
  ideaSuggestions = [],
  privacyRisk,
  onSubmitPrompt,
  onSubmitIdea,
}: WorkspaceComposerProps) {
  const [ideaText, setIdeaText] = useState("");

  const modelLabel = useMemo(() => getModelLabel(mode), [mode]);

  const canSubmitPrompt = prompt.trim().length > 0 && !isGenerating;
  const canSubmitIdea = ideaText.trim().length > 0 && !isGenerating;

  function handlePromptKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (canSubmitPrompt) onSubmitPrompt();
    }
  }

  function handleIdeaKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (canSubmitIdea) {
        onSubmitIdea(ideaText.trim());
        setIdeaText("");
      }
    }
  }

  function submitIdea(value: string) {
    const cleaned = value.trim();
    if (!cleaned || isGenerating) return;

    onSubmitIdea(cleaned);
    setIdeaText("");
  }

  return (
    <div className="border-t bg-background/95 px-4 py-4 backdrop-blur">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-3xl border bg-background shadow-sm">
          <div className="border-b px-4 py-3">
            <div className="grid gap-3 md:grid-cols-3">
              <label className="space-y-1">
                <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Task
                </span>
                <select
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                  className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
                  disabled={isGenerating || isIdeaFirstActive}
                >
                  {TEMPLATE_OPTIONS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Mode
                </span>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as AiMode)}
                  className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
                  disabled={isGenerating || isIdeaFirstActive}
                >
                  {THINKFAST_MODE_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Tone
                </span>
                <select
                  value={preferredTone}
                  onChange={(e) => setPreferredTone(e.target.value)}
                  className="w-full rounded-xl border bg-background px-3 py-2 text-sm capitalize outline-none transition focus:border-primary"
                  disabled={isGenerating || isIdeaFirstActive}
                >
                  {TONE_OPTIONS.map((tone) => (
                    <option key={tone} value={tone}>
                      {tone}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
              <span className="rounded-full border bg-muted/50 px-2 py-1">
                Model: {modelLabel}
              </span>

              <span
                className={`rounded-full border px-2 py-1 ${getPrivacyClass(
                  privacyRisk
                )}`}
              >
                Privacy: {getPrivacyLabel(privacyRisk)}
              </span>

              {isIdeaFirstActive ? (
                <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-1 text-primary">
                  Your Idea First active
                </span>
              ) : (
                <span className="rounded-full border bg-muted/50 px-2 py-1">
                  Idea check runs before generation
                </span>
              )}
            </div>
          </div>

          {!isIdeaFirstActive ? (
            <div className="p-3">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handlePromptKeyDown}
                placeholder="Ask ThinkFast to make something. If your prompt is too broad, I’ll ask for your idea first."
                className="min-h-[96px] w-full resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground"
                disabled={isGenerating}
              />

              <div className="flex items-center justify-between gap-3 border-t px-2 pt-3">
                <p className="text-xs text-muted-foreground">
                  Press Enter to send. Shift + Enter for a new line.
                </p>

                <Button
                  type="button"
                  onClick={onSubmitPrompt}
                  disabled={!canSubmitPrompt}
                  className="rounded-full px-5"
                >
                  {isGenerating ? "Thinking..." : "Send"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-3">
              <div className="rounded-2xl border bg-muted/30 p-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Original prompt
                </p>
                <p className="mt-1 text-sm">{prompt}</p>
              </div>

              <div className="mt-3 rounded-2xl border border-primary/20 bg-primary/5 p-3">
                <p className="text-sm font-medium">Your Idea First</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {ideaQuestion ||
                    "Before I generate, give me your main idea, opinion, example, or direction."}
                </p>

                {ideaSuggestions.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {ideaSuggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => submitIdea(suggestion)}
                        disabled={isGenerating}
                        className="rounded-full border bg-background px-3 py-1.5 text-xs transition hover:bg-muted disabled:opacity-60"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                ) : null}

                <textarea
                  value={ideaText}
                  onChange={(e) => setIdeaText(e.target.value)}
                  onKeyDown={handleIdeaKeyDown}
                  placeholder="Type your own idea direction here..."
                  className="mt-3 min-h-[84px] w-full resize-none rounded-2xl border bg-background px-3 py-2 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary"
                  disabled={isGenerating}
                />

                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    Your idea will be combined with the original prompt.
                  </p>

                  <Button
                    type="button"
                    onClick={() => submitIdea(ideaText)}
                    disabled={!canSubmitIdea}
                    className="rounded-full px-5"
                  >
                    {isGenerating ? "Generating..." : "Use this idea"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          ThinkFast checks your idea first, then privacy, then generates with the selected model.
        </p>
      </div>
    </div>
  );
}