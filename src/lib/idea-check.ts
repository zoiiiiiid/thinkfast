import type { CreateTemplate, IdeaCheckResult } from "@/lib/types";

const TASK_REQUEST_PATTERNS = [
  /\b(make|write|create|do|generate|draft)\s+(me\s+)?(a|an|my)?\s*(reflection|essay|project|presentation|plan|proposal|caption|email|report|script|reviewer|outline)\b/i,
  /\bgive\s+me\s+(an?\s+)?(idea|ideas|business idea|business ideas|topic|topics|answer|caption|outline)\b/i,
  /\bsuggest\s+(an?\s+)?(idea|ideas|topic|topics|business idea|business ideas)\b/i,
  /\bhelp\s+me\s+(make|write|create|do|answer|draft|generate|think of)\b/i,
  /\b(can you|please)\s+(make|write|create|generate|draft|suggest|give)\b/i,
];

const VERY_VAGUE_PATTERNS = [
  /^\s*(make|write|create|do|generate|draft)\s+(me\s+)?(a|an|my)?\s*(reflection|essay|project|presentation|plan|proposal|caption|email|report|script|reviewer|outline)?\s*[.!?]?\s*$/i,
  /^\s*(give me|suggest)\s+(ideas|something|a topic|an answer|a business idea|business ideas)\s*[.!?]?\s*$/i,
  /^\s*help me with (this|my assignment|my homework|my project)\s*[.!?]?\s*$/i,
];

const USER_DIRECTION_SIGNALS = [
  /\bi\s+(think|believe|feel|want|need|prefer|realize|realized|learned|agree|disagree|argue|plan|experienced|noticed|observed|chose|decided)\b/i,
  /\bmy\s+(idea|opinion|experience|example|goal|problem|audience|view|point|stand|argument|realization|take|main point|thesis)\b/i,
  /\bthe\s+(main\s+)?(idea|point|goal|audience|purpose|argument|stand|problem|issue)\s+is\b/i,
  /\bbecause\b/i,
  /\bshould\s+(focus|argue|explain|show|emphasize|sound|include)\b/i,
  /\bmake it sound\b/i,
  /\btarget\s+(users?|audience|market)\b/i,
  /\bfor\s+(students|student renters|small businesses|nurses|teachers|parents|customers|fans|buyers|users)\b/i,
];

const SPECIFIC_ANGLE_SIGNALS = [
  /\b(how|why|whether|impact|effects?|replace|dependence|future|next\s+\d+\s+years?|students|workers|human work|real human work|philippines|filipino|bacolod|katipunan|education|privacy|ethics|society|portfolio|github|mvp|verified|renters|condo listings|target users?)\b/i,
  /\bnear\s+[A-Z][a-zA-Z.'-]+/,
  /\bfor\s+[a-zA-Z0-9.'-]+\s+[a-zA-Z0-9.'-]+/i,
  /\bwho\s+(struggle|need|want|cannot|lack|have|are)\b/i,
  /\bthat\s+(can|will|would|helps?|solves?|addresses?|improves?)\b/i,
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
  "science",
  "society",
  "marketing",
  "management",
]);

function normalize(text: string) {
  return text.trim().replace(/\s+/g, " ");
}

function countWords(text: string) {
  const clean = normalize(text);
  if (!clean) return 0;
  return clean.split(" ").filter(Boolean).length;
}

function stripRequestWords(text: string) {
  return text
    .replace(/^(can you|please)\s+/i, "")
    .replace(/^(make|write|create|do|generate|draft|give|suggest|help)\s+(me\s+)?(a|an|my)?\s*/i, "")
    .replace(/^me\s+/i, "")
    .replace(/\b(reflection|essay|project|presentation|plan|proposal|caption|email|report|script|reviewer|answer|idea|ideas|business idea|business ideas|topic|topics|outline)\b/gi, "")
    .replace(/[?.!]+$/g, "")
    .trim();
}

function extractSubject(prompt: string) {
  const clean = normalize(prompt);

  const aboutMatch = clean.match(/\b(?:about|on|regarding|based on)\b\s+(.+)/i);
  if (aboutMatch?.[1]) {
    return aboutMatch[1].replace(/[?.!]+$/g, "").trim();
  }

  const specificForMatch = clean.match(/\bfor\s+(.+)/i);
  if (specificForMatch?.[1] && countWords(specificForMatch[1]) >= 3) {
    return specificForMatch[1].replace(/[?.!]+$/g, "").trim();
  }

  return stripRequestWords(clean);
}

function isGenericSubject(subject: string) {
  const lower = subject.toLowerCase().replace(/[?.!]/g, "").trim();
  if (!lower) return true;
  if (GENERIC_TOPICS.has(lower)) return true;
  if (countWords(lower) <= 2) return true;
  return false;
}

function hasSpecificAngle(prompt: string, subject: string) {
  const combined = `${prompt} ${subject}`;
  const subjectWords = countWords(subject);

  if (subjectWords >= 7) return true;
  if (SPECIFIC_ANGLE_SIGNALS.some((pattern) => pattern.test(combined))) return true;

  return subjectWords >= 4 && !isGenericSubject(subject);
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
        "What specific problem should this idea solve?",
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
        "I want the reflection to sound natural and not generic.",
      ];
    case "Essay":
      return [
        `My thesis is that ${topic} has both benefits and risks.`,
        `I want to argue that ${topic} should be used responsibly.`,
        "I want a balanced essay that explains both sides clearly.",
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

  const asksForOriginalIdea = /\b(give|suggest|think of|come up with)\b.*\b(idea|ideas|business idea|project idea|topic|topics)\b/i.test(clean);

  const needsIdeaPrompt =
    isVeryVague ||
    (!hasUserDirection && promptWords <= 6) ||
    (isTaskRequest && !hasUserDirection && genericSubject) ||
    (asksForOriginalIdea && !specificAngle && !hasUserDirection);

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

export const checkIdea = checkIdeaPrompt;
