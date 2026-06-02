export type AiMode =
  | "auto"
  | "fast"
  | "deep"
  | "creative"
  | "study-coach"
  | "privacy-first";

export type PrivacyRisk = "low" | "medium" | "high";

export type CreateTemplate =
  | "Reflection"
  | "Essay"
  | "Quiz Reviewer"
  | "Business Idea"
  | "Presentation Script"
  | "Email"
  | "Social Media Caption"
  | "Study Plan"
  | "Project Proposal"
  | "Custom Prompt";

export type PrivacyCheckResult = {
  privacyRisk: PrivacyRisk;
  detectedItems: string[];
  redactedPrompt: string;
};

export type IdeaCheckResult = {
  ideaPromptNeeded: boolean;
  reason: string;
  suggestedQuestions: string[];
  quickOptions: string[];
};

export type GenerationRequest = {
  prompt: string;
  redactedPrompt: string;
  template: CreateTemplate;
  mode: AiMode;
  preferredTone?: string;
  ideaAnswers?: string[];
};

export type GenerationResult = {
  title: string;
  summary: string;
  output: string;
  tags: string[];
  suggestedNextAction: string;
  followUpCard: {
    cardType: string;
    title: string;
    description: string;
    suggestedAction: string;
  };
};
