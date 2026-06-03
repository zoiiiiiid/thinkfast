import type { PrivacyCheckResult, PrivacyRisk } from "@/lib/types";

type Detection = {
  label: string;
  level: "medium" | "high";
};

const NAME_STOPWORDS = new Set([
  "thinking",
  "looking",
  "going",
  "trying",
  "asking",
  "wondering",
  "planning",
  "hoping",
  "making",
  "writing",
  "creating",
  "building",
  "working",
  "studying",
  "interested",
  "from",
  "for",
  "about",
]);

const COMMON_NON_NAMES = new Set([
  "Github",
  "GitHub",
  "Portfolio",
  "Business",
  "Project",
  "Reflection",
  "Essay",
  "Technology",
  "Artificial",
  "Intelligence",
]);

function unique(items: string[]) {
  return Array.from(new Set(items));
}

function isLikelyName(candidate: string) {
  const cleaned = candidate.trim();

  if (!cleaned) return false;

  const words = cleaned.split(/\s+/);
  const firstWord = words[0]?.toLowerCase();

  if (!firstWord || NAME_STOPWORDS.has(firstWord)) return false;
  if (words.length > 4) return false;
  if (words.some((word) => COMMON_NON_NAMES.has(word))) return false;

  return words.every((word) => /^[A-Z][a-zA-Z.'-]{1,}$/.test(word));
}

function redactPattern(text: string, pattern: RegExp, replacement: string) {
  return text.replace(pattern, replacement);
}

function hasPersonalSchoolContext(prompt: string) {
  return /\b(my|our)\s+(school|university|college|campus|class|professor|teacher|instructor|classmate|student number|student id)\b/i.test(prompt) ||
    /\b(professor|teacher|instructor|sir|ma'am|mam)\s+[A-Z][a-zA-Z.'-]+\b/i.test(prompt) ||
    /\b(Ateneo|ADMU|La Salle|DLSU|UP|UST)\b/i.test(prompt) ||
    /\b[A-Z][A-Za-z0-9&.'\s]+(?:University|College|School)\b/.test(prompt);
}

function hasCompanyContext(prompt: string) {
  return /\b(my|our)\s+(company|workplace|employer|boss|manager|client|organization)\b/i.test(prompt) ||
    /\b[A-Z][A-Za-z0-9&.'\s]+(?:Inc|Corp|Corporation|LLC|Ltd)\b/.test(prompt);
}

export function checkPrivacy(prompt: string): PrivacyCheckResult {
  const detections: Detection[] = [];
  let redactedPrompt = prompt;

  function addDetection(label: string, level: "medium" | "high") {
    detections.push({ label, level });
  }

  const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
  if (emailPattern.test(prompt)) {
    addDetection("email", "high");
    redactedPrompt = redactPattern(redactedPrompt, emailPattern, "[EMAIL]");
  }

  const phonePattern =
    /(?<!\d)(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{3,4}[\s.-]?\d{4}(?!\d)/g;
  if (phonePattern.test(prompt)) {
    addDetection("phone number", "high");
    redactedPrompt = redactPattern(redactedPrompt, phonePattern, "[PHONE]");
  }

  const addressPattern =
    /\b\d{1,5}\s+[A-Za-z0-9.'\s]+\s(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Village|Subdivision|Boulevard|Blvd)\b/gi;
  if (addressPattern.test(prompt)) {
    addDetection("address", "high");
    redactedPrompt = redactPattern(redactedPrompt, addressPattern, "[ADDRESS]");
  }

  const studentNumberPattern =
    /\b(?:student\s*(?:id|number)|id\s*number)\s*[:#]?\s*[A-Z0-9-]{5,}\b/gi;
  if (studentNumberPattern.test(prompt)) {
    addDetection("student number", "high");
    redactedPrompt = redactPattern(
      redactedPrompt,
      studentNumberPattern,
      "[STUDENT_ID]",
    );
  }

  const healthPattern =
    /\b(diagnosis|diagnosed|medical|depression|anxiety|therapy|prescription|illness|condition|surgery|medication|hospital|doctor)\b/i;
  if (healthPattern.test(prompt)) {
    addDetection("health details", "high");
  }

  const financialPattern =
    /\b(bank account|credit card|debit card|debt|salary|income|loan|investment|gcash|maya|account number)\b/i;
  if (financialPattern.test(prompt)) {
    addDetection("financial details", "high");
  }

  const legalPattern =
    /\b(legal case|lawsuit|criminal|court case|police report|confidential|nda|settlement)\b/i;
  if (legalPattern.test(prompt)) {
    addDetection("legal/confidential details", "high");
  }

  const namePatterns = [
    /\bmy\s+name\s+is\s+([A-Z][a-zA-Z.'-]*(?:\s+[A-Z][a-zA-Z.'-]*){0,3})\b/g,
    /\bi\s+am\s+([A-Z][a-zA-Z.'-]*(?:\s+[A-Z][a-zA-Z.'-]*){0,3})\b/g,
    /\bi'm\s+([A-Z][a-zA-Z.'-]*(?:\s+[A-Z][a-zA-Z.'-]*){0,3})\b/g,
    /\bthis\s+is\s+([A-Z][a-zA-Z.'-]*(?:\s+[A-Z][a-zA-Z.'-]*){0,3})\b/g,
  ];

  for (const pattern of namePatterns) {
    const matches = Array.from(prompt.matchAll(pattern));

    for (const match of matches) {
      const candidate = match[1];

      if (candidate && isLikelyName(candidate)) {
        addDetection("personal name", "medium");
        redactedPrompt = redactedPrompt.replace(candidate, "[NAME]");
      }
    }
  }

  const cityPatterns = [
    /\bi\s+live\s+in\s+([A-Z][a-zA-Z.'-]*(?:\s+[A-Z][a-zA-Z.'-]*){0,3})\b/g,
    /\bmy\s+city\s+is\s+([A-Z][a-zA-Z.'-]*(?:\s+[A-Z][a-zA-Z.'-]*){0,3})\b/g,
    /\bi\s+am\s+from\s+([A-Z][a-zA-Z.'-]*(?:\s+[A-Z][a-zA-Z.'-]*){0,3})\b/g,
    /\bi'm\s+from\s+([A-Z][a-zA-Z.'-]*(?:\s+[A-Z][a-zA-Z.'-]*){0,3})\b/g,
    /\bbased\s+in\s+([A-Z][a-zA-Z.'-]*(?:\s+[A-Z][a-zA-Z.'-]*){0,3})\b/g,
  ];

  for (const pattern of cityPatterns) {
    const matches = Array.from(prompt.matchAll(pattern));

    for (const match of matches) {
      const city = match[1];

      if (city) {
        addDetection("city/location", "medium");
        redactedPrompt = redactedPrompt.replace(city, "[CITY]");
      }
    }
  }

  if (hasPersonalSchoolContext(prompt)) {
    addDetection("school/institution", "medium");
    redactedPrompt = redactedPrompt
      .replace(/\b(Ateneo|ADMU|La Salle|DLSU|UP|UST)\b/g, "[SCHOOL]")
      .replace(
        /\b[A-Z][A-Za-z0-9&.'\s]+(?:University|College|School)\b/g,
        "[SCHOOL]",
      );
  }

  if (hasCompanyContext(prompt)) {
    addDetection("company/workplace", "medium");
    redactedPrompt = redactedPrompt.replace(
      /\b[A-Z][A-Za-z0-9&.'\s]+(?:Inc|Corp|Corporation|LLC|Ltd)\b/g,
      "[COMPANY]",
    );
  }

  const personalContextPattern =
    /\b(my experience|personal use|my personal|my life|my story|journal|private reflection)\b/i;
  if (personalContextPattern.test(prompt)) {
    addDetection("personal context", "medium");
  }

  const businessIdeaPattern =
    /\b(confidential plan|confidential pitch|private startup idea|private business idea)\b/i;
  if (businessIdeaPattern.test(prompt)) {
    addDetection("business/project idea", "medium");
  }

  const detectedItems = unique(detections.map((item) => item.label));

  let privacyRisk: PrivacyRisk = "low";

  if (detections.some((item) => item.level === "high")) {
    privacyRisk = "high";
  } else if (detections.some((item) => item.level === "medium")) {
    privacyRisk = "medium";
  }

  return {
    privacyRisk,
    detectedItems,
    redactedPrompt,
  };
}
