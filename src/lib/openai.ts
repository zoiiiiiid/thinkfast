import { GoogleGenAI } from "@google/genai";
import type { GenerationRequest, GenerationResult } from "@/lib/types";
import { getModelDisplayName, resolveModelRoute } from "@/lib/model-router";

type AttemptStatus = "success" | "quota" | "auth" | "unavailable";

type ModelAttempt = {
  model: string;
  status: AttemptStatus;
  message?: string;
};

type ModelSuccess = {
  modelUsed: string;
  text: string;
  attempts: ModelAttempt[];
};

function cleanJsonResponse(text: string) {
  const withoutFences = text.replace(/```json/g, "").replace(/```/g, "").trim();
  const firstBrace = withoutFences.indexOf("{");
  const lastBrace = withoutFences.lastIndexOf("}");

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return withoutFences.slice(firstBrace, lastBrace + 1).trim();
  }

  return withoutFences;
}

function getGeminiModel(routeModel: string) {
  if (!routeModel || routeModel.startsWith("gpt")) {
    return process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
  }

  return routeModel;
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error ?? "Unknown Gemini error");
}

function classifyGeminiError(error: unknown): AttemptStatus {
  const message = errorMessage(error).toLowerCase();

  if (
    message.includes("429") ||
    message.includes("quota") ||
    message.includes("rate") ||
    message.includes("resource_exhausted") ||
    message.includes("too many requests")
  ) {
    return "quota";
  }

  if (
    message.includes("401") ||
    message.includes("403") ||
    message.includes("api key") ||
    message.includes("permission") ||
    message.includes("unauthorized")
  ) {
    return "auth";
  }

  return "unavailable";
}

function fallbackSummaryFromAttempts(attempts: ModelAttempt[]) {
  if (attempts.some((attempt) => attempt.status === "quota")) {
    return "The first Gemini model hit a quota or rate limit, so ThinkFast tried a fallback model.";
  }

  if (attempts.some((attempt) => attempt.status === "auth")) {
    return "Gemini returned an authentication or permission issue, so ThinkFast tried fallback handling.";
  }

  return "The first Gemini model was temporarily unavailable, so ThinkFast tried a fallback model.";
}

function getMockReason(error?: unknown) {
  if (!process.env.GEMINI_API_KEY) {
    return {
      summary: "Generated in demo mode because GEMINI_API_KEY is not configured.",
      outputMessage: "Live Gemini generation is not connected yet. Add GEMINI_API_KEY in your environment variables to use live generation.",
      tag: "missing-key",
    };
  }

  const status = classifyGeminiError(error);

  if (status === "quota") {
    return {
      summary: "Generated in demo mode because all Gemini model attempts reached quota or rate limits.",
      outputMessage: "The selected Gemini model and its fallbacks are temporarily rate-limited or out of quota. ThinkFast is using demo mode so the workflow can continue.",
      tag: "rate-limited",
    };
  }

  if (status === "auth") {
    return {
      summary: "Generated in demo mode because Gemini authentication failed.",
      outputMessage: "Gemini rejected the current API credentials or model permissions. Check GEMINI_API_KEY and model access, then try again.",
      tag: "auth-check",
    };
  }

  return {
    summary: "Generated in demo mode because Gemini was temporarily unavailable.",
    outputMessage: "Gemini failed after trying the available fallback models. ThinkFast is using demo mode so the flow can continue.",
    tag: "gemini-unavailable",
  };
}

function mockResult(input: GenerationRequest, error?: unknown): GenerationResult {
  const ideaNotes = (input.ideaAnswers ?? []).join("; ");
  const historyNote = input.conversationHistory?.length
    ? `\n\nPrevious conversation included ${input.conversationHistory.length} message(s).`
    : "";

  const fallback = getMockReason(error);

  return {
    title: `${input.template} Draft`,
    summary: fallback.summary,
    output: `Template: ${input.template}\nMode: ${input.mode}\n\n${input.redactedPrompt}\n\nIdea direction: ${ideaNotes || "None provided"}${historyNote}\n\n${fallback.outputMessage}`,
    tags: [fallback.tag, input.template.toLowerCase(), input.mode],
    suggestedNextAction: "Try generating again, or refine this draft manually for now.",
    modelUsed: "mock",
    modelLabel: "Demo mode",
    generationMode: "mock",
    fallbackNotice: fallback.summary,
    followUpCard: {
      cardType: "next-action",
      title: "Continue anyway",
      description: "You can keep editing or retry live generation when Gemini is available.",
      suggestedAction: "Retry or refine",
    },
  };
}

function formatHistory(input: GenerationRequest) {
  const history = input.conversationHistory ?? [];

  if (!history.length) {
    return "No previous conversation yet.";
  }

  return history
    .slice(-10)
    .map((item) => {
      const speaker = item.role === "user" ? "User" : "ThinkFast";
      return `${speaker}: ${item.content}`;
    })
    .join("\n\n");
}

function fallbackFromText(
  input: GenerationRequest,
  text: string,
  modelUsed: string,
  attempts: ModelAttempt[],
): GenerationResult {
  const usedFallback = attempts.length > 1;
  const modelLabel = getModelDisplayName(modelUsed);

  return {
    title: `${input.template} Output`,
    summary: `Generated with ${modelLabel}, but JSON parsing failed, so ThinkFast kept the raw draft.`,
    output: text,
    tags: [input.template.toLowerCase(), input.mode, usedFallback ? "fallback" : "live"],
    suggestedNextAction: "Create a cleaner version from this draft.",
    modelUsed,
    modelLabel,
    generationMode: usedFallback ? "fallback" : "live",
    fallbackNotice: usedFallback ? fallbackSummaryFromAttempts(attempts) : undefined,
    followUpCard: {
      cardType: "follow-up",
      title: "Polish this output",
      description: "Turn this draft into a finalized format.",
      suggestedAction: "Refine output",
    },
  };
}

async function generateWithModelFallbacks(
  ai: GoogleGenAI,
  modelsToTry: string[],
  prompt: string,
): Promise<ModelSuccess> {
  let lastError: unknown = null;
  const attempts: ModelAttempt[] = [];

  for (const model of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      attempts.push({ model, status: "success" });

      return {
        modelUsed: model,
        text: response.text || "{}",
        attempts,
      };
    } catch (error) {
      lastError = error;
      const status = classifyGeminiError(error);

      attempts.push({
        model,
        status,
        message: errorMessage(error),
      });

      console.warn(`Gemini model failed: ${model}`, error);
    }
  }

  throw Object.assign(lastError instanceof Error ? lastError : new Error(errorMessage(lastError)), {
    attempts,
  });
}

function safeString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeParsedResult(
  input: GenerationRequest,
  parsed: Partial<GenerationResult>,
  modelUsed: string,
  attempts: ModelAttempt[],
): GenerationResult {
  const modelLabel = getModelDisplayName(modelUsed);
  const usedFallback = attempts.filter((attempt) => attempt.status !== "success").length > 0;
  const fallbackNotice = usedFallback ? fallbackSummaryFromAttempts(attempts) : undefined;
  const summary = safeString(parsed.summary, `Generated with ${modelLabel}.`);

  return {
    title: safeString(parsed.title, `${input.template} Output`),
    summary: usedFallback
      ? `${summary} Generated with ${modelLabel} after fallback.`
      : `${summary} Generated with ${modelLabel}.`,
    output: safeString(parsed.output, "ThinkFast generated an empty response. Try again with a more specific prompt."),
    tags: Array.from(
      new Set([
        ...((parsed.tags ?? []).filter((tag): tag is string => typeof tag === "string" && Boolean(tag.trim()))),
        input.template.toLowerCase(),
        input.mode,
        usedFallback ? "fallback" : "live",
      ]),
    ),
    suggestedNextAction: safeString(parsed.suggestedNextAction, "Continue refining this output."),
    modelUsed,
    modelLabel,
    generationMode: usedFallback ? "fallback" : "live",
    fallbackNotice,
    followUpCard: {
      cardType: safeString(parsed.followUpCard?.cardType, "follow-up"),
      title: safeString(parsed.followUpCard?.title, "Continue this output"),
      description: safeString(parsed.followUpCard?.description, "Open this again and refine it."),
      suggestedAction: safeString(parsed.followUpCard?.suggestedAction, "Continue"),
    },
  };
}

export async function generateThinkFastOutput(
  input: GenerationRequest,
): Promise<GenerationResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return mockResult(input);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const route = resolveModelRoute(input.mode);
    const ideaNotes = (input.ideaAnswers ?? []).join("; ");

    const primaryModel = getGeminiModel(route.model);
    const fallbackModels = (route.fallbackModels ?? []).map(getGeminiModel);
    const modelsToTry = Array.from(new Set([primaryModel, ...fallbackModels]));

    const prompt = `
You are ThinkFast, an idea-first and privacy-aware AI productivity assistant.

${route.systemStyle}

Core behavior:
- Continue the user's current conversation when prior messages are provided.
- If the user answered an idea prompt, treat that answer as the user's chosen direction.
- Do not ignore the user's original request. Combine the original task with their selected or typed idea.
- The user's idea comes first, then privacy protection.
- Use the redacted prompt for generation unless the user explicitly chose to continue anyway.
- Be clear, helpful, natural, and not generic.
- Do not mention that you are returning JSON.

Formatting rules for the output field:
- Avoid raw Markdown symbols when possible.
- Do not use ##, ###, or **.
- Use clean section titles written as plain text.
- Use short paragraphs and simple bullet lines only when they improve readability.
- Do not over-format the answer.

Return strict JSON only. Do not wrap the JSON in triple backticks.

The JSON must have these keys:
{
  "title": "",
  "summary": "",
  "output": "",
  "tags": [],
  "suggestedNextAction": "",
  "followUpCard": {
    "cardType": "",
    "title": "",
    "description": "",
    "suggestedAction": ""
  }
}

Conversation so far:
${formatHistory(input)}

Current request details:
Template: ${input.template}
Mode: ${input.mode}
Preferred Tone: ${input.preferredTone ?? "balanced"}
Original Prompt: ${input.prompt}
Redacted Prompt Used for Safety: ${input.redactedPrompt}
User's Idea Direction: ${ideaNotes || "None provided"}

Generate the next ThinkFast response now.
`;

    const { text, modelUsed, attempts } = await generateWithModelFallbacks(
      ai,
      modelsToTry,
      prompt,
    );

    const cleaned = cleanJsonResponse(text);

    try {
      const parsed = JSON.parse(cleaned) as Partial<GenerationResult>;
      return normalizeParsedResult(input, parsed, modelUsed, attempts);
    } catch {
      return fallbackFromText(input, text, modelUsed, attempts);
    }
  } catch (error) {
    console.error("Gemini generation error:", error);
    return mockResult(input, error);
  }
}
