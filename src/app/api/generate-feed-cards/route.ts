import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  template: z.string(),
  title: z.string(),
});

export async function POST(req: Request) {
  const payload = schema.safeParse(await req.json());
  if (!payload.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const suggested = {
    "Quiz Reviewer": "How did the quiz go?",
    "Project Proposal": "Turn this into an MVP plan.",
    "Business Idea": "Create target users and feature set.",
    Reflection: "Make this sound more personal.",
    "Presentation Script": "Create speaker notes.",
  } as Record<string, string>;

  return NextResponse.json({
    cardType: "follow-up",
    title: `Follow up: ${payload.data.title}`,
    description: suggested[payload.data.template] ?? "Refine this output with one stronger angle.",
    suggestedAction: "Open workspace",
  });
}
