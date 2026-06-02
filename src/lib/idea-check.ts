import type { IdeaCheckResult } from "@/lib/types";

const VAGUE_PATTERNS = [
  /\b(make|write|create|do)\s+(me\s+)?(a|an|my)\s+(reflection|essay|project|presentation|plan)\b/i,
  /\bgive\s+me\s+a\s+business\s+idea\b/i,
  /\bmake\s+my\s+project\b/i,
  /\bcreate\s+a\s+presentation\b/i,
];

const GENERIC_QUESTIONS = [
  "What is your main opinion about this topic?",
  "What personal example do you want included?",
  "What tone should this output use?",
];

const REFLECTION_OPTIONS = [
  "AI helps students save time.",
  "AI makes students too dependent.",
  "AI is useful, but students should still think.",
  "I have mixed feelings.",
  "I will write my own idea.",
];

export function checkIdeaPrompt(prompt: string): IdeaCheckResult {
  const wordCount = prompt.trim().split(/\s+/).filter(Boolean).length;
  const vague = VAGUE_PATTERNS.some((pattern) => pattern.test(prompt)) || wordCount < 9;

  if (!vague) {
    return {
      ideaPromptNeeded: false,
      reason: "Prompt includes enough direction to generate immediately.",
      suggestedQuestions: [],
      quickOptions: [],
    };
  }

  return {
    ideaPromptNeeded: true,
    reason: "The user did not provide a clear personal opinion, context, or direction.",
    suggestedQuestions: GENERIC_QUESTIONS,
    quickOptions: REFLECTION_OPTIONS,
  };
}
