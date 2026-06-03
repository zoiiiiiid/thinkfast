import type { PrivacyCheckResult, PrivacyRisk } from "@/lib/types";

type PrivacyRule = {
  label: string;
  pattern: RegExp;
  level: "medium" | "high";
};

const CITY_NAMES = [
  "Bacolod",
  "Manila",
  "Quezon City",
  "Cebu",
  "Davao",
  "Iloilo",
  "Makati",
  "Pasig",
  "Taguig",
  "Mandaluyong",
  "Paranaque",
  "Parañaque",
  "Caloocan",
  "Las Pinas",
  "Las Piñas",
  "Baguio",
  "Cagayan de Oro",
  "General Santos",
  "Zamboanga",
  "Singapore",
  "Tokyo",
  "Hong Kong",
];

const cityPattern = new RegExp(`\\b(${CITY_NAMES.map((city) => city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`, "i");

const RULES: PrivacyRule[] = [
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
    pattern: /\b\d{1,5}\s+[A-Za-z0-9.\s]+\s(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Village|Subdivision|Barangay|Brgy)\b/i,
    level: "high",
  },
  {
    label: "student number",
    pattern: /\b(?:student\s*(?:id|number)|school\s*id|id\s*number)\s*[:#]?\s*[A-Z0-9-]{5,}\b/i,
    level: "high",
  },
  {
    label: "password or credential",
    pattern: /\b(password|passcode|otp|one-time pin|login code|api key|secret key|token)\b/i,
    level: "high",
  },
  {
    label: "health details",
    pattern: /\b(diagnosis|medical|depression|anxiety|therapy|prescription|illness|condition|surgery|medication)\b/i,
    level: "high",
  },
  {
    label: "financial details",
    pattern: /\b(bank account|credit card|debit card|gcash|maya|salary|income|loan|debt|investment|account number)\b/i,
    level: "high",
  },
  {
    label: "deeply private story",
    pattern: /\b(trauma|family issue|confidential|private story|secret|personal struggle|personal problem)\b/i,
    level: "high",
  },
  {
    label: "personal name",
    pattern: /\b(my name is|i am|i'm|call me|this is)\s+([A-Za-z][A-Za-z'.-]+(?:\s+[A-Za-z][A-Za-z'.-]+){0,3})\b/i,
    level: "medium",
  },
  {
    label: "city/location",
    pattern: new RegExp(`\\b(my city is|i live in|living in|from|based in|located in|city of)\\s+(${CITY_NAMES.map((city) => city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")}|[A-Za-z][A-Za-z'.-]+(?:\\s+City)?)\\b`, "i"),
    level: "medium",
  },
  {
    label: "city/location",
    pattern: cityPattern,
    level: "medium",
  },
  {
    label: "school/institution",
    pattern: /\b(Ateneo|ADMU|La Salle|DLSU|UP|UST|University|College|School|campus)\b/i,
    level: "medium",
  },
  {
    label: "professor/teacher",
    pattern: /\b(professor|teacher|instructor|class adviser|classmate)\b/i,
    level: "medium",
  },
  {
    label: "company/workplace",
    pattern: /\b(company|workplace|employer|boss|manager|client|organization|Inc|Corp|Corporation|LLC|Ltd)\b/i,
    level: "medium",
  },
  {
    label: "personal experience",
    pattern: /\b(my experience|personal experience|personal use|my story|my life|journal entry|reflection about myself)\b/i,
    level: "medium",
  },
  {
    label: "business idea",
    pattern: /\b(startup idea|business idea|private project|project proposal|pitch deck|confidential plan)\b/i,
    level: "medium",
  },
];

function redactPrompt(prompt: string, detectedItems: string[]) {
  let redacted = prompt;

  if (detectedItems.includes("email")) {
    redacted = redacted.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[EMAIL]");
  }

  if (detectedItems.includes("phone number")) {
    redacted = redacted.replace(/(?:\+?\d{1,3}\s?)?(?:\(?\d{2,4}\)?[\s-]?)?\d{3,4}[\s-]?\d{4}\b/g, "[PHONE]");
  }

  if (detectedItems.includes("address")) {
    redacted = redacted.replace(
      /\b\d{1,5}\s+[A-Za-z0-9.\s]+\s(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Village|Subdivision|Barangay|Brgy)\b/gi,
      "[ADDRESS]",
    );
  }

  if (detectedItems.includes("student number")) {
    redacted = redacted.replace(
      /\b(?:student\s*(?:id|number)|school\s*id|id\s*number)\s*[:#]?\s*[A-Z0-9-]{5,}\b/gi,
      "[STUDENT_ID]",
    );
  }

  if (detectedItems.includes("personal name")) {
    redacted = redacted.replace(
      /\b(my name is|i am|i'm|call me|this is)\s+([A-Za-z][A-Za-z'.-]+(?:\s+[A-Za-z][A-Za-z'.-]+){0,3})\b/gi,
      "$1 [NAME]",
    );
  }

  if (detectedItems.includes("city/location")) {
    redacted = redacted.replace(
      new RegExp(`\\b(${CITY_NAMES.map((city) => city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`, "gi"),
      "[CITY]",
    );

    redacted = redacted.replace(
      /\b(my city is|i live in|living in|from|based in|located in|city of)\s+([A-Za-z][A-Za-z'.-]+(?:\s+City)?)\b/gi,
      "$1 [CITY]",
    );
  }

  if (detectedItems.includes("school/institution")) {
    redacted = redacted.replace(
      /\b(Ateneo|ADMU|La Salle|DLSU|UP|UST|[A-Z][A-Za-z0-9&.\s]+(?:University|College|School))\b/g,
      "[SCHOOL]",
    );
  }

  if (detectedItems.includes("company/workplace")) {
    redacted = redacted.replace(
      /\b[A-Z][A-Za-z0-9&.\s]+(?:Inc|Corp|Corporation|LLC|Ltd)\b/g,
      "[COMPANY]",
    );
  }

  return redacted;
}

export function checkPrivacy(prompt: string): PrivacyCheckResult {
  const matchedRules = RULES.filter((rule) => rule.pattern.test(prompt));
  const detectedItems = Array.from(new Set(matchedRules.map((rule) => rule.label)));

  let privacyRisk: PrivacyRisk = "low";

  if (matchedRules.some((rule) => rule.level === "high")) {
    privacyRisk = "high";
  } else if (matchedRules.some((rule) => rule.level === "medium")) {
    privacyRisk = "medium";
  }

  return {
    privacyRisk,
    detectedItems,
    redactedPrompt: redactPrompt(prompt, detectedItems),
  };
}
