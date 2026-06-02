import { NextResponse } from "next/server";
import { z } from "zod";
import { checkIdeaPrompt } from "@/lib/idea-check";
import type { CreateTemplate } from "@/lib/types";

const schema = z.object({
  prompt: z.string().min(1),
  template: z.string().optional(),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid prompt" }, { status: 400 });

  return NextResponse.json(
    checkIdeaPrompt(parsed.data.prompt, parsed.data.template as CreateTemplate | undefined),
  );
}
