import type { CreateTemplate, IdeaCheckResult } from "@/lib/types";

const VAGUE_PATTERNS = [
  /\b(make|write|create|do|generate)\s+(me\s+)?(a|an|my)?\s*(reflection|essay|project|presentation|plan|proposal|caption|email)\b/i,
  /\bgive\s+me\s+(an?\s+)?(idea|business idea|topic)\b/i,
  /\bhelp\s+me\s+(make|write|create|do)\b/i,
  /\bmake\s+it\s+for\s+me\b/i,
];

const DIRECTION_SIGNALS = [
  /\bi\s+(think|believe|feel|want|need|prefer|realize|learned|agree|disagree)\b/i,
  /\bmy\s+(idea|opinion|experience|example|goal|problem|audience|tone|view|point)\b/i,
  /\bbecause\b/i,
  /\bfor\s+(students|teachers|customers|sellers|businesses|users|parents|professionals)\b/i,
  /\bshould\b/i,
  /\bthe main point\b/i,
];

function detectTopic(prompt: string) {
  const lower = prompt.toLowerCase();
  if (lower.includes("ai") || lower.includes("chatgpt") || lower.includes("gemini")) return "AI use";
  if (lower.includes("business") || lower.includes("startup") || lower.includes("mvp")) return "business idea";
  if (lower.includes("quiz") || lower.includes("exam") || lower.includes("review")) return "study task";
  if (lower.includes("privacy") || lower.includes("data")) return "privacy";
  if (lower.includes("reflection")) return "reflection";
  if (lower.includes("presentation") || lower.includes("script")) return "presentation";
  return "this task";
}

function optionsFor(template: CreateTemplate | undefined, topic: string): string[] {
  switch (template) {
    case "Reflection":
      return [
        `My main realization about ${topic} is that it helps, but people should still think for themselves.`,
        `I use ${topic} for speed, but I sometimes worry about becoming too dependent.`,
        `I have mixed feelings because it is useful, but it can make work feel less personal.`,
      ];
    case "Essay":
      return [
        `My argument is that ${topic} is useful when it supports human judgment, not when it replaces it.`,
        `I want the essay to compare the benefits and risks of ${topic}.`,
        `My stand is balanced: ${topic} should be used responsibly with clear limits.`,
      ];
    case "Business Idea":
      return [
        "The problem I want to solve is that users waste time turning messy thoughts into usable outputs.",
        "The target users are students and young professionals who use AI often.",
        "The product should be fast, simple, and privacy-centered.",
      ];
    case "Quiz Reviewer":
      return [
        "Focus on the most important terms and make the questions harder than basic memorization.",
        "Make it a practice quiz first, then show answers after.",
        "Explain why the correct answer is right in simple language.",
      ];
    case "Presentation Script":
      return [
        "I want the message to sound confident, simple, and easy to present.",
        "The main point should be clear in the first 30 seconds.",
        "Make it sound natural, like a college student speaking.",
      ];
    case "Email":
      return [
        "Make it polite, direct, and not too formal.",
        "I want to sound respectful but still clear about what I need.",
        "Keep it short and easy to reply to.",
      ];
    default:
      return [
        `My main idea is that ${topic} should be useful, clear, and practical.`,
        "I want the output to sound natural and not generic.",
        "Ask me for one missing detail before making the final output.",
      ];
  }
}

function questionsFor(template: CreateTemplate | undefined): string[] {
  switch (template) {
    case "Reflection":
      return ["What is your honest realization?", "What personal example should be included?", "Should it sound casual, academic, or heartfelt?"];
    case "Essay":
      return ["What is your thesis or stand?", "What side do you want to emphasize?", "What example should support your argument?"];
    case "Business Idea":
      return ["What problem are you solving?", "Who is the target user?", "What makes your idea different?"];
    case "Quiz Reviewer":
      return ["What topic should the quiz focus on?", "How difficult should it be?", "Should answers appear immediately or after the quiz?"];
    case "Presentation Script":
      return ["What should the audience remember?", "How long is the presentation?", "Should the tone be formal or conversational?"];
    default:
      return ["What is your main idea?", "Who is this for?", "What tone should it use?"];
  }
}

export function checkIdeaPrompt(prompt: string, template?: CreateTemplate): IdeaCheckResult {
  const clean = prompt.trim();
  const wordCount = clean.split(/\s+/).filter(Boolean).length;
  const vaguePattern = VAGUE_PATTERNS.some((pattern) => pattern.test(clean));
  const hasDirection = DIRECTION_SIGNALS.some((pattern) => pattern.test(clean));
  const topic = detectTopic(clean);

  const needsDirection = wordCount < 16 || vaguePattern || !hasDirection;

  if (!needsDirection) {
    return {
      ideaPromptNeeded: false,
      reason: "Your prompt already gives enough direction, so ThinkFast can generate right away.",
      suggestedQuestions: [],
      quickOptions: [],
    };
  }

  return {
    ideaPromptNeeded: true,
    reason: "ThinkFast needs your idea first so the output does not start from zero or sound generic.",
    suggestedQuestions: questionsFor(template),
    quickOptions: optionsFor(template, topic),
  };
}
