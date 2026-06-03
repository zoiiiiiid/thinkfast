import { NextResponse } from "next/server";
import { z } from "zod";
import { MODE_OPTIONS, TEMPLATE_OPTIONS } from "@/lib/constants";
import { generateThinkFastOutput } from "@/lib/openai";
import type { GenerationRequest } from "@/lib/types";

const historySchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1),
});

const schema = z.object({
  prompt: z.string().min(1),
  redactedPrompt: z.string().min(1),
  template: z.string().min(1),
  mode: z.string().min(1),
  preferredTone: z.string().optional(),
  ideaAnswers: z.array(z.string()).optional(),
  conversationHistory: z.array(historySchema).optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid generation payload",
          issues: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    if (
      !TEMPLATE_OPTIONS.includes(
        parsed.data.template as (typeof TEMPLATE_OPTIONS)[number]
      )
    ) {
      return NextResponse.json({ error: "Invalid template" }, { status: 400 });
    }

    if (!MODE_OPTIONS.some((mode) => mode.value === parsed.data.mode)) {
      return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
    }

    const result = await generateThinkFastOutput(
      parsed.data as GenerationRequest
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Generate route error:", error);

    return NextResponse.json(
      {
        title: "Generation Error",
        summary: "ThinkFast could not complete generation.",
        output:
          "Something went wrong while generating. Please try again in a moment.",
        tags: ["error"],
        suggestedNextAction: "Try again.",
        followUpCard: {
          cardType: "retry",
          title: "Try again",
          description: "Generation failed temporarily.",
          suggestedAction: "Retry generation",
        },
      },
      { status: 200 }
    );
  }
}