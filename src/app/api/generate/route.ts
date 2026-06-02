import { NextResponse } from "next/server";
import { z } from "zod";
import { MODE_OPTIONS, TEMPLATE_OPTIONS } from "@/lib/constants";
import { generateThinkFastOutput } from "@/lib/openai";
import type { GenerationRequest } from "@/lib/types";

const schema = z.object({
  prompt: z.string().min(1),
  redactedPrompt: z.string().min(1),
  template: z.string().min(1),
  mode: z.string().min(1),
  preferredTone: z.string().optional(),
  ideaAnswers: z.array(z.string()).optional(),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid generation payload" }, { status: 400 });
  if (!TEMPLATE_OPTIONS.includes(parsed.data.template as (typeof TEMPLATE_OPTIONS)[number])) {
    return NextResponse.json({ error: "Invalid template" }, { status: 400 });
  }
  if (!MODE_OPTIONS.some((mode) => mode.value === parsed.data.mode)) {
    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  }
  const result = await generateThinkFastOutput(parsed.data as GenerationRequest);
  return NextResponse.json(result);
}
