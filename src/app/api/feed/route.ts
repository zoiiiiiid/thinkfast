import { NextResponse } from "next/server";
import { mockStore } from "@/lib/mock-store";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const fallbackCards = [
  {
    id: "seed-1",
    title: "Continue where you left off",
    description: "You worked on AI Dependence Project yesterday. Continue building the MVP?",
    suggested_action: "Open AI Workspace",
  },
  {
    id: "seed-2",
    title: "Suggested next action",
    description: "Turn your last idea into a presentation outline.",
    suggested_action: "Generate follow-up",
  },
  {
    id: "seed-3",
    title: "Suggested topic",
    description: "You often create school reflections. Start a new one?",
    suggested_action: "Start Reflection template",
  },
];

export async function GET() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json(mockStore.feedCards.length ? mockStore.feedCards : fallbackCards);
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json(fallbackCards);

  const { data, error } = await supabase
    .from("feed_cards")
    .select("id, title, description, suggested_action")
    .eq("user_id", userData.user.id)
    .eq("dismissed", false)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    const userCards = mockStore.feedCards
      .filter((card) => card.user_id === userData.user?.id && !card.dismissed)
      .map((card) => ({
        id: card.id,
        title: card.title,
        description: card.description,
        suggested_action: card.suggested_action,
      }));
    return NextResponse.json(userCards.length ? userCards : fallbackCards);
  }

  if (data?.length) return NextResponse.json(data);

  const { data: recent } = await supabase
    .from("conversations")
    .select("id, title, summary")
    .eq("user_id", userData.user.id)
    .order("created_at", { ascending: false })
    .limit(3);

  if (recent?.length) {
    return NextResponse.json(
      recent.map((row) => ({
        id: row.id,
        title: `Continue: ${row.title}`,
        description: row.summary || "Continue refining this output.",
        suggested_action: "Open workspace",
      })),
    );
  }

  return NextResponse.json(fallbackCards);
}
