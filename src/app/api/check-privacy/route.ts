import { NextResponse } from "next/server";
import { z } from "zod";
import { checkPrivacy } from "@/lib/privacy";

const schema = z.object({ prompt: z.string().min(1) });

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid prompt" }, { status: 400 });
  return NextResponse.json(checkPrivacy(parsed.data.prompt));
}
