import type { CreateTemplate, IdeaCheckResult } from "@/lib/types";

const TASK_REQUEST_PATTERNS = [
  /\b(make|write|create|do|generate)\s+(me\s+)?(a|an|my)?\s*(reflection|essay|project|presentation|plan|proposal|caption|email|report|script|reviewer)\b/i,
  /\bgive\s+me\s+(an?\s+)?(idea|business idea|topic|answer|caption|outline)\b/i,
  /\bhelp\s+me\s+(make|write|create|do|answer|draft)\b/i,
  /\b(can you|please)\s+(make|write|create|generate|draft)\b/i,
];

const VERY_VAGUE_PATTERNS = [
  /^\s*(make|write|create|do|generate)\s+(me\s+)?(a|an|my)?\s*(reflection|essay|project|presentation|plan|proposal|caption|email|report|script|reviewer)?\s*\.?\s*$/i,
  /^\s*(give me|suggest)\s+(ideas|something|a topic|an answer|a business idea)\s*\.?\s*$/i,
  /^\s*help me with (this|my assignment|my homework|my project)\s*\.?\s*$/i,
];

const USER_DIRECTION_SIGNALS = [
  /\bi\s+(think|believe|feel|want|need|prefer|realize|learned|agree|disagree|argue|plan|experienced|noticed)\b/i,
  /\bmy\s+(idea|opinion|experience|example|goal|problem|audience|view|point|stand|argument|realization|take)\b/i,
  /\bthe\s+(main\s+)?(idea|point|goal|audience|purpose|argument|stand|problem)\s+is\b/i,
  /\bbecause\b/i,
  /\bshould\s+(focus|argue|explain|show|emphasize)\b/i,
  /\bmake it sound\b/i,
];

const GENERIC_TOPICS = new Set([
  "ai",
  "artificial intelligence",
  "technology",
  "social media",
  "education",
  "business",
  "school",
  "work",
  "privacy",
  "life",
  "love",
]);

function normalize(text: string) {
  return text.trim().replace(/\s+/g, " ");
}

function countWords(text: string) {
  return normalize(text).split(" ").filter(Boolean).length;
}

function extractSubject(prompt: string) {
  const clean = normalize(prompt);

  const aboutMatch = clean.match(/\b(?:about|on|regarding|for|based on)\b\s+(.+)/i);
  if (aboutMatch?.[1]) {
    return aboutMatch[1].replace(/[?.!]+$/g, "").trim();
  }

  return clean
    .replace(/^(make|write|create|do|generate|give|help)\s+(me\s+)?(a|an|my)?\s*/i, "")
    .replace(/\b(reflection|essay|project|presentation|plan|proposal|caption|email|report|script|reviewer|answer|idea)\b/gi, "")
    .replace(/[?.!]+$/g, "")
    .trim();
}

function isGenericSubject(subject: string) {
  const lower = subject.toLowerCase().replace(/[?.!]/g, "").trim();
  if (!lower) return true;
  if (GENERIC_TOPICS.has(lower)) return true;
  if (countWords(lower) <= 2) return true;
  return false;
}

function hasSpecificAngle(prompt: string, subject: string) {
  const lower = `${prompt} ${subject}`.toLowerCase();
  const subjectWords = countWords(subject);

  if (subjectWords >= 6) return true;

  return (
    subjectWords >= 4 &&
    /\b(how|why|whether|impact|effects?|replace|dependence|future|next\s+\d+\s+years?|students|workers|human work|real human work|philippines|bacolod|education|privacy|ethics|society)\b/i.test(lower)
  );
}

function getSubjectLabel(subject: string) {
  return subject || "this topic";
}

function questionsFor(template: CreateTemplate | undefined, subject: string): string[] {
  const topic = getSubjectLabel(subject);

  switch (template) {
    case "Reflection":
      return [
        `What is your own view or realization about ${topic}?`,
        `What personal example, observation, or experience can connect to ${topic}?`,
        "What lesson should the reflection end with?",
      ];
    case "Essay":
      return [
        `What main argument do you want to make about ${topic}?`,
        "What reason or example should support your point?",
        "Do you want a balanced, persuasive, or analytical essay?",
      ];
    case "Business Idea":
      return [
        `What specific problem should this idea solve?`,
        "Who exactly is the target user?",
        "What makes the idea different from existing tools?",
      ];
    case "Quiz Reviewer":
      return [
        `What exact lesson or topic should the reviewer focus on?`,
        "Should it be multiple choice, identification, or mixed?",
        "Should the answers appear immediately or at the end?",
      ];
    case "Presentation Script":
      return [
        `What should the audience remember about ${topic}?`,
        "How long should the script be?",
        "Should it sound formal, casual, persuasive, or student-like?",
      ];
    case "Email":
      return [
        "Who is the email for?",
        "What is your main message or request?",
        "Should it sound respectful, warm, urgent, or direct?",
      ];
    case "Social Media Caption":
      return [
        `What feeling should the caption create about ${topic}?`,
        "Should it sound trendy, premium, funny, or simple?",
        "Do you want a call-to-action?",
      ];
    default:
      return [
        `What is your main idea about ${topic}?`,
        "Who is this for?",
        "What should the final output focus on?",
      ];
  }
}

function optionsFor(template: CreateTemplate | undefined, subject: string): string[] {
  const topic = getSubjectLabel(subject);

  switch (template) {
    case "Reflection":
      return [
        `I want to connect ${topic} to my own experience or observation.`,
        `I want to explain what I learned or realized about ${topic}.`,
        `I want the reflection to sound natural and not generic.`,
      ];
    case "Essay":
      return [
        `My thesis is that ${topic} has both benefits and risks.`,
        `I want to argue that ${topic} should be used responsibly.`,
        `I want a balanced essay that explains both sides clearly.`,
      ];
    case "Business Idea":
      return [
        "I want this to solve a real everyday problem.",
        "The target users should be students or young professionals.",
        "The idea should be simple enough for an MVP.",
      ];
    default:
      return [
        `My main idea is that ${topic} should be clear, useful, and practical.`,
        "I want the output to sound natural and specific.",
        "I want AI to organize my idea, not invent everything from zero.",
      ];
  }
}

export function checkIdeaPrompt(prompt: string, template?: CreateTemplate): IdeaCheckResult {
  const clean = normalize(prompt);
  const subject = extractSubject(clean);
  const promptWords = countWords(clean);

  const isTaskRequest = TASK_REQUEST_PATTERNS.some((pattern) => pattern.test(clean));
  const isVeryVague = VERY_VAGUE_PATTERNS.some((pattern) => pattern.test(clean));
  const hasUserDirection = USER_DIRECTION_SIGNALS.some((pattern) => pattern.test(clean));
  const genericSubject = isGenericSubject(subject);
  const specificAngle = hasSpecificAngle(clean, subject);

  const needsIdeaPrompt =
    isVeryVague ||
    (isTaskRequest && !hasUserDirection && (genericSubject || !specificAngle)) ||
    (!hasUserDirection && promptWords <= 6);

  if (!needsIdeaPrompt) {
    return {
      ideaPromptNeeded: false,
      reason: "The prompt already gives enough direction to generate a useful output.",
      suggestedQuestions: [],
      quickOptions: [],
    };
  }

  return {
    ideaPromptNeeded: true,
    reason:
      "Your request needs your idea first. Add your direction so ThinkFast does not generate a generic AI answer.",
    suggestedQuestions: questionsFor(template, subject),
    quickOptions: optionsFor(template, subject),
  };
}

// Backward-compatible alias in case another file imports checkIdea.
export const checkIdea = checkIdeaPrompt;
