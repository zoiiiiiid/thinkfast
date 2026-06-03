import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/server-security";

const schema = z.object({
  template: z.string(),
  title: z.string(),
});

export async function POST(req: Request) {
  try {
    const auth = await requireUser();
    if (auth.response) return auth.response;

    const payload = schema.safeParse(await req.json().catch(() => null));

    if (!payload.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

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
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Generate feed card route error:", error);
    }

    return NextResponse.json(
      {
        error: "Unable to generate feed card.",
      },
      { status: 200 },
    );
  }
}
