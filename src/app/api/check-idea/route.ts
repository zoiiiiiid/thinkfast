import { NextResponse } from "next/server";
import { z } from "zod";
import { checkIdea } from "@/lib/idea-check";
import type { CreateTemplate } from "@/lib/types";

const schema = z.object({
  prompt: z.string().min(1),
  template: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ideaPromptNeeded: false,
          reason: "Invalid prompt.",
          suggestedQuestions: [],
          quickOptions: [],
        },
        { status: 200 }
      );
    }

    const result = checkIdea(
      parsed.data.prompt,
      (parsed.data.template ?? "Custom Prompt") as CreateTemplate
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Idea check route error:", error);

    return NextResponse.json(
      {
        ideaPromptNeeded: false,
        reason: "Idea check failed, but the prompt can continue.",
        suggestedQuestions: [],
        quickOptions: [],
      },
      { status: 200 }
    );
  }
}