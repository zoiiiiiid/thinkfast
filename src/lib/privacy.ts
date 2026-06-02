import type { PrivacyCheckResult, PrivacyRisk } from "@/lib/types";

const RULES: { label: string; pattern: RegExp; level: "medium" | "high" }[] = [
  {
    label: "email",
    pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
    level: "high",
  },
  {
    label: "phone number",
    pattern: /(?:\+?\d{1,3}\s?)?(?:\(?\d{2,4}\)?[\s-]?)?\d{3,4}[\s-]?\d{4}\b/,
    level: "high",
  },
  {
    label: "address",
    pattern: /\b\d{1,5}\s+[A-Za-z0-9.\s]+\s(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Village|Subdivision)\b/i,
    level: "high",
  },
  {
    label: "student number",
    pattern: /\b(?:student\s*(?:id|number)|id)\s*[:#]?\s*[A-Z0-9-]{5,}\b/i,
    level: "high",
  },
  {
    label: "health details",
    pattern: /\b(diagnosis|medical|depression|anxiety|therapy|prescription|illness|condition|surgery)\b/i,
    level: "high",
  },
  {
    label: "financial details",
    pattern: /\b(bank account|credit card|debt|salary|income|loan|investment|gcash|maya)\b/i,
    level: "high",
  },
  {
    label: "private story",
    pattern: /\b(trauma|family issue|confidential|private|secret|personal struggle|personal problem)\b/i,
    level: "high",
  },

  // Medium-risk context
  {
    label: "school/institution",
    pattern: /\b(Ateneo|ADMU|La Salle|DLSU|UP|UST|University|College|School|campus|class|course)\b/i,
    level: "medium",
  },
  {
    label: "professor/teacher",
    pattern: /\b(professor|teacher|instructor|sir|ma'am|mam|classmate|student)\b/i,
    level: "medium",
  },
  {
    label: "company/workplace",
    pattern: /\b(company|workplace|employer|boss|manager|client|organization|Inc|Corp|Corporation|LLC|Ltd)\b/i,
    level: "medium",
  },
  {
    label: "personal context",
    pattern: /\b(my experience|personal use|my personal|my life|my story|reflection|journal)\b/i,
    level: "medium",
  },
  {
    label: "business idea",
    pattern: /\b(startup idea|business idea|project idea|proposal|pitch|confidential plan)\b/i,
    level: "medium",
  },
];

function redactPrompt(prompt: string, detectedItems: string[]) {
  let redacted = prompt;

  if (detectedItems.includes("email")) {
    redacted = redacted.replace(
      /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
      "[EMAIL]"
    );
  }

  if (detectedItems.includes("phone number")) {
    redacted = redacted.replace(
      /(?:\+?\d{1,3}\s?)?(?:\(?\d{2,4}\)?[\s-]?)?\d{3,4}[\s-]?\d{4}\b/g,
      "[PHONE]"
    );
  }

  if (detectedItems.includes("address")) {
    redacted = redacted.replace(
      /\b\d{1,5}\s+[A-Za-z0-9.\s]+\s(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Village|Subdivision)\b/gi,
      "[ADDRESS]"
    );
  }

  if (detectedItems.includes("student number")) {
    redacted = redacted.replace(
      /\b(?:student\s*(?:id|number)|id)\s*[:#]?\s*[A-Z0-9-]{5,}\b/gi,
      "[STUDENT_ID]"
    );
  }

  if (detectedItems.includes("school/institution")) {
    redacted = redacted.replace(
      /\b(Ateneo|ADMU|La Salle|DLSU|UP|UST|[A-Z][A-Za-z0-9&.\s]+(?:University|College|School))\b/g,
      "[SCHOOL]"
    );
  }

  if (detectedItems.includes("company/workplace")) {
    redacted = redacted.replace(
      /\b[A-Z][A-Za-z0-9&.\s]+(?:Inc|Corp|Corporation|LLC|Ltd)\b/g,
      "[COMPANY]"
    );
  }

  return redacted;
}

export function checkPrivacy(prompt: string): PrivacyCheckResult {
  const matchedRules = RULES.filter((rule) => rule.pattern.test(prompt));

  const detectedItems = matchedRules.map((rule) => rule.label);

  let privacyRisk: PrivacyRisk = "low";

  const hasHighRisk = matchedRules.some((rule) => rule.level === "high");
  const hasMediumRisk = matchedRules.some((rule) => rule.level === "medium");

  if (hasHighRisk) {
    privacyRisk = "high";
  } else if (hasMediumRisk) {
    privacyRisk = "medium";
  }

  return {
    privacyRisk,
    detectedItems,
    redactedPrompt: redactPrompt(prompt, detectedItems),
  };
}