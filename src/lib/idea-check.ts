import type { CreateTemplate, IdeaCheckResult } from "@/lib/types";

const VERY_VAGUE_PATTERNS = [
  /^make me (a|an)?\s*(reflection|essay|output|draft|paper|caption|email|proposal)?\.?$/i,
  /^write (me )?(a|an)?\s*(reflection|essay|output|draft|paper|caption|email|proposal)?\.?$/i,
  /^create (me )?(a|an)?\s*(reflection|essay|output|draft|paper|caption|email|proposal)?\.?$/i,
  /^give me (ideas|something|a topic|a business idea)\.?$/i,
  /^help me with (this|my assignment|my homework|my project)\.?$/i,
];

const TASK_WORDS = [
  "reflection",
  "essay",
  "paper",
  "caption",
  "email",
  "proposal",
  "presentation",
  "script",
  "reviewer",
  "quiz",
  "business idea",
  "study plan",
  "project",
];

const SPECIFICITY_MARKERS = [
  "about",
  "on",
  "regarding",
  "for",
  "based on",
  "because",
  "why",
  "how",
  "should",
  "will",
  "can",
  "in the next",
  "my experience",
  "students",
  "business",
  "school",
  "work",
  "ai",
  "privacy",
  "dependence",
  "education",
  "technology",
  "human",
  "future",
];

function normalize(text: string) {
  return text.trim().replace(/\s+/g, " ");
}

function wordCount(text: string) {
  return normalize(text).split(" ").filter(Boolean).length;
}

function hasVeryVaguePattern(prompt: string) {
  return VERY_VAGUE_PATTERNS.some((pattern) => pattern.test(normalize(prompt)));
}

function hasSpecificTopic(prompt: string) {
  const lower = prompt.toLowerCase();

  const hasMarker = SPECIFICITY_MARKERS.some((marker) =>
    lower.includes(marker)
  );

  const hasAboutPhrase =
    /\b(about|on|regarding|for|based on)\b\s+.{8,}/i.test(prompt);

  const hasEnoughWords = wordCount(prompt) >= 10;

  return hasMarker || hasAboutPhrase || hasEnoughWords;
}

function isOnlyTaskRequest(prompt: string) {
  const lower = normalize(prompt).toLowerCase();

  const withoutTaskWords = TASK_WORDS.reduce(
    (current, word) => current.replaceAll(word, ""),
    lower
  )
    .replace(/\b(make|write|create|give|help|me|a|an|my|the|for|about|with)\b/g, "")
    .replace(/[^\w\s]/g, "")
    .trim();

  return withoutTaskWords.length < 8;
}

function extractTopic(prompt: string) {
  const match = prompt.match(/\b(?:about|on|regarding|for|based on)\b\s+(.+)/i);

  if (match?.[1]) {
    return match[1]
      .replace(/[?.!]+$/g, "")
      .trim();
  }

  return normalize(prompt)
    .replace(/^(make|write|create|give|help)\s+(me\s+)?(a|an)?\s*/i, "")
    .replace(/\b(reflection|essay|paper|caption|email|proposal|presentation|script)\b/i, "")
    .replace(/[?.!]+$/g, "")
    .trim();
}

function getTemplateQuestions(template: string, topic: string) {
  const cleanTopic = topic || "this topic";

  const lowerTemplate = template.toLowerCase();

  if (lowerTemplate.includes("reflection")) {
    return [
      `What is your personal view on ${cleanTopic}?`,
      `What real experience or realization do you want to connect to ${cleanTopic}?`,
      `What lesson or insight should the reflection end with?`,
    ];
  }

  if (lowerTemplate.includes("essay")) {
    return [
      `What main argument do you want to make about ${cleanTopic}?`,
      `What side or position should the essay support?`,
      `What example should be included?`,
    ];
  }

  if (lowerTemplate.includes("business")) {
    return [
      `What problem should this business idea solve?`,
      `Who is the target user or customer?`,
      `What makes the idea different from existing solutions?`,
    ];
  }

  if (lowerTemplate.includes("quiz") || lowerTemplate.includes("reviewer")) {
    return [
      `What topic should the reviewer focus on?`,
      `What level of difficulty do you need?`,
      `Should it be multiple choice, identification, or explanation-based?`,
    ];
  }

  if (lowerTemplate.includes("email")) {
    return [
      `Who is the email for?`,
      `What is the main message or request?`,
      `Should the email sound formal, respectful, casual, or urgent?`,
    ];
  }

  if (lowerTemplate.includes("caption")) {
    return [
      `What product, event, or idea is the caption for?`,
      `What feeling should the caption create?`,
      `Should it sound fun, classy, trendy, or straightforward?`,
    ];
  }

  return [
    `What is your main idea about ${cleanTopic}?`,
    `Who is this for?`,
    `What should the final output focus on?`,
  ];
}

function getQuickOptions(template: string, topic: string) {
  const cleanTopic = topic || "this topic";
  const lowerTemplate = template.toLowerCase();

  if (lowerTemplate.includes("reflection")) {
    return [
      `I want to connect ${cleanTopic} to my own experience.`,
      `I want the reflection to explain what I learned from ${cleanTopic}.`,
      `I want the output to sound natural and not generic.`,
    ];
  }

  if (lowerTemplate.includes("essay")) {
    return [
      `I want to argue that ${cleanTopic} is important today.`,
      `I want a balanced discussion of both sides.`,
      `I want the essay to be clear, structured, and convincing.`,
    ];
  }

  if (lowerTemplate.includes("business")) {
    return [
      `I want this to solve a real everyday problem.`,
      `I want the idea to be simple and feasible for an MVP.`,
      `I want the business idea to help students or young users.`,
    ];
  }

  return [
    `I want the output to be clear and practical.`,
    `I want the AI to organize my idea, not invent everything from zero.`,
    `I want it to sound natural and specific.`,
  ];
}

export function checkIdea(
  prompt: string,
  template: CreateTemplate | string = "Custom Prompt"
): IdeaCheckResult {
  const cleanedPrompt = normalize(prompt);
  const topic = extractTopic(cleanedPrompt);

  const veryVague = hasVeryVaguePattern(cleanedPrompt);
  const onlyTask = isOnlyTaskRequest(cleanedPrompt);
  const specificTopic = hasSpecificTopic(cleanedPrompt);

  const shouldAskIdeaFirst =
    veryVague || (onlyTask && !specificTopic) || wordCount(cleanedPrompt) < 5;

  if (!shouldAskIdeaFirst) {
    return {
      ideaPromptNeeded: false,
      reason:
        "The prompt already has enough direction to generate a useful output.",
      suggestedQuestions: [],
      quickOptions: [],
    };
  }

  return {
    ideaPromptNeeded: true,
    reason:
      "Your request is still too broad. Add your idea first so the output starts from your thinking, not from a generic AI answer.",
    suggestedQuestions: getTemplateQuestions(String(template), topic),
    quickOptions: getQuickOptions(String(template), topic),
  };
}