import type { AiMode, CreateTemplate } from "@/lib/types";

export const APP_NAME = "ThinkFast";

export const TEMPLATE_OPTIONS: CreateTemplate[] = [
  "Reflection",
  "Essay",
  "Quiz Reviewer",
  "Business Idea",
  "Presentation Script",
  "Email",
  "Social Media Caption",
  "Study Plan",
  "Project Proposal",
  "Custom Prompt",
];

export const MODE_OPTIONS: { label: string; value: AiMode; description: string }[] = [
  { label: "Auto", value: "auto", description: "Balanced speed and depth." },
  { label: "Fast", value: "fast", description: "Quick first draft output." },
  { label: "Deep", value: "deep", description: "Detailed, structured response." },
  { label: "Creative", value: "creative", description: "Original and expressive angle." },
  {
    label: "Study Coach",
    value: "study-coach",
    description: "Explains and coaches step-by-step.",
  },
  {
    label: "Privacy First",
    value: "privacy-first",
    description: "Strict redaction and careful wording.",
  },
];
