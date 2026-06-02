import type { AiMode } from "@/lib/types";

type ModelRoute = {
  model: string;
  systemStyle: string;
};

const ROUTES: Record<AiMode, ModelRoute> = {
  auto: {
    model: "gemini-2.5-flash",
    systemStyle: "Balance helpfulness, structure, and concise speed.",
  },
  fast: {
    model: "gemini-2.5-flash",
    systemStyle: "Prioritize speed and clear first-draft usefulness.",
  },
  deep: {
    model: "gemini-2.5-flash",
    systemStyle: "Provide deep, structured, and thoughtful output.",
  },
  creative: {
    model: "gemini-2.5-flash",
    systemStyle: "Be original, vivid, and idea-expansive while practical.",
  },
  "study-coach": {
    model: "gemini-2.5-flash",
    systemStyle: "Teach through examples, checkpoints, and reflection prompts.",
  },
  "privacy-first": {
    model: "gemini-2.5-flash",
    systemStyle: "Never reveal or infer sensitive details. Keep output safely generic.",
  },
};

export function resolveModelRoute(mode: AiMode): ModelRoute {
  return ROUTES[mode] ?? ROUTES.auto;
}
