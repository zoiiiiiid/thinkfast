import { NextResponse } from "next/server";
import { z } from "zod";
import { checkPrivacy } from "@/lib/privacy";
import { requireUser } from "@/lib/server-security";

const schema = z.object({
  prompt: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const auth = await requireUser();
    if (auth.response) return auth.response;

    const parsed = schema.safeParse(await req.json().catch(() => null));

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
    if (process.env.NODE_ENV !== "production") {
      console.error("Privacy check route error:", error);
    }

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
