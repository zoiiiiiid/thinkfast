import type { AiMode } from "@/lib/types";

export type ModelRoute = {
  model: string;
  modelLabel: string;
  fallbackModels: string[];
  systemStyle: string;
};

export type ThinkFastModeOption = {
  value: AiMode;
  label: string;
  description: string;
  modelLabel: string;
};

const MODEL_LABELS: Record<string, string> = {
  "gemini-3.1-flash-lite": "Gemini 3.1 Flash Lite",
  "gemini-3.5-flash": "Gemini 3.5 Flash",
  "gemini-2.5-flash": "Gemini 2.5 Flash",
  "gemini-2.5-flash-lite": "Gemini 2.5 Flash Lite",
  "gemini-2.5-pro": "Gemini 2.5 Pro",
};

const ROUTES: Record<AiMode, ModelRoute> = {
  auto: {
    model: "gemini-3.1-flash-lite",
    modelLabel: MODEL_LABELS["gemini-3.1-flash-lite"],
    fallbackModels: ["gemini-2.5-flash", "gemini-2.5-flash-lite"],
    systemStyle: "Balance helpfulness, structure, and concise speed.",
  },

  fast: {
    model: "gemini-3.1-flash-lite",
    modelLabel: MODEL_LABELS["gemini-3.1-flash-lite"],
    fallbackModels: ["gemini-2.5-flash-lite", "gemini-2.5-flash"],
    systemStyle: "Prioritize speed, clarity, and useful first-draft output.",
  },

  deep: {
    model: "gemini-3.5-flash",
    modelLabel: MODEL_LABELS["gemini-3.5-flash"],
    fallbackModels: ["gemini-3.1-flash-lite", "gemini-2.5-flash", "gemini-2.5-flash-lite"],
    systemStyle: "Provide deeper structure, stronger reasoning, and thoughtful development.",
  },

  creative: {
    model: "gemini-3.1-flash-lite",
    modelLabel: MODEL_LABELS["gemini-3.1-flash-lite"],
    fallbackModels: ["gemini-2.5-flash", "gemini-2.5-flash-lite"],
    systemStyle: "Be original, vivid, idea-expansive, and practical.",
  },

  "study-coach": {
    model: "gemini-3.1-flash-lite",
    modelLabel: MODEL_LABELS["gemini-3.1-flash-lite"],
    fallbackModels: ["gemini-2.5-flash", "gemini-2.5-flash-lite"],
    systemStyle: "Teach through examples, checkpoints, review questions, and reflection prompts.",
  },

  "privacy-first": {
    model: "gemini-2.5-flash-lite",
    modelLabel: MODEL_LABELS["gemini-2.5-flash-lite"],
    fallbackModels: ["gemini-3.1-flash-lite", "gemini-2.5-flash"],
    systemStyle:
      "Prioritize privacy, safety, and cautious wording. Do not reveal, infer, or recreate sensitive details. Keep output helpful but safely generic when personal information is involved.",
  },
};

export const THINKFAST_MODE_OPTIONS: ThinkFastModeOption[] = [
  {
    value: "auto",
    label: "Auto",
    description: "Best default for most tasks.",
    modelLabel: ROUTES.auto.modelLabel,
  },
  {
    value: "fast",
    label: "Fast",
    description: "Quick drafts and simple outputs.",
    modelLabel: ROUTES.fast.modelLabel,
  },
  {
    value: "deep",
    label: "Deep",
    description: "Better for analysis and longer work.",
    modelLabel: ROUTES.deep.modelLabel,
  },
  {
    value: "creative",
    label: "Creative",
    description: "For brainstorming and fresh ideas.",
    modelLabel: ROUTES.creative.modelLabel,
  },
  {
    value: "study-coach",
    label: "Study Coach",
    description: "For quizzes, reviewers, and learning.",
    modelLabel: ROUTES["study-coach"].modelLabel,
  },
  {
    value: "privacy-first",
    label: "Privacy First",
    description: "For sensitive or personal prompts.",
    modelLabel: ROUTES["privacy-first"].modelLabel,
  },
];

export function resolveModelRoute(mode: AiMode): ModelRoute {
  return ROUTES[mode] ?? ROUTES.auto;
}

export function getModelLabel(mode: AiMode): string {
  return resolveModelRoute(mode).modelLabel;
}

export function getFallbackModels(mode: AiMode): string[] {
  return resolveModelRoute(mode).fallbackModels;
}

export function getModelDisplayName(model: string): string {
  return MODEL_LABELS[model] ?? model;
}
