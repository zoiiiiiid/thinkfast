import { NextResponse } from "next/server";
import { z } from "zod";
import { checkIdeaPrompt } from "@/lib/idea-check";
import type { CreateTemplate } from "@/lib/types";

const schema = z.object({
  prompt: z.string().min(1),
  template: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const parsed = schema.safeParse(await req.json());

    if (!parsed.success) {
      return NextResponse.json(
        {
          ideaPromptNeeded: false,
          reason: "Invalid prompt.",
          suggestedQuestions: [],
          quickOptions: [],
        },
        { status: 200 },
      );
    }

    return NextResponse.json(
      checkIdeaPrompt(parsed.data.prompt, parsed.data.template as CreateTemplate | undefined),
    );
  } catch (error) {
    console.error("Idea check route error:", error);

    return NextResponse.json(
      {
        ideaPromptNeeded: false,
        reason: "Idea check failed, but the prompt can continue.",
        suggestedQuestions: [],
        quickOptions: [],
      },
      { status: 200 },
    );
  }
}
