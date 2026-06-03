import { NextResponse } from "next/server";
import { z } from "zod";
import { checkPrivacy } from "@/lib/privacy";

const schema = z.object({
  prompt: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const parsed = schema.safeParse(await req.json());

    if (!parsed.success) {
      return NextResponse.json(
        {
          privacyRisk: "low",
          detectedItems: [],
          redactedPrompt: "",
        },
        { status: 200 },
      );
    }

    return NextResponse.json(checkPrivacy(parsed.data.prompt));
  } catch (error) {
    console.error("Privacy check route error:", error);

    return NextResponse.json(
      {
        privacyRisk: "low",
        detectedItems: [],
        redactedPrompt: "",
      },
      { status: 200 },
    );
  }
}
