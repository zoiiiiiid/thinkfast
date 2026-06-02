"use client";

import { useEffect, useState } from "react";
import { FeedCard } from "@/components/cards";

type FeedItem = {
  id: string;
  title: string;
  description: string;
  suggested_action: string;
};

export default function FeedPage() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [recentConversations, setRecentConversations] = useState<
    { id: string; title: string; summary: string; selected_mode: string; created_at: string }[]
  >([]);
  useEffect(() => {
    fetch("/api/feed")
      .then((r) => (r.ok ? r.json() : []))
      .then(setItems);
    fetch("/api/conversations")
      .then((r) => (r.ok ? r.json() : []))
      .then(setRecentConversations);
  }, []);
  return (
    <section className="space-y-5">
      <h1 className="text-2xl font-semibold">Your Home Feed</h1>
      <p className="text-sm text-muted-foreground">Personalized cards to continue projects, take next actions, and stay idea-driven.</p>
      <div className="max-h-[68vh] space-y-4 overflow-y-auto pr-1">
        <article className="rounded-2xl border bg-card p-4">
          <h2 className="font-semibold">Continue where you left off</h2>
          <div className="mt-2 grid gap-2">
            {recentConversations.slice(0, 3).map((c) => (
              <div key={c.id} className="rounded-lg border p-3">
                <p className="font-medium">{c.title}</p>
                <p className="text-xs text-muted-foreground">{c.summary || "No summary yet."}</p>
                <p className="text-xs text-primary">Mode: {c.selected_mode}</p>
              </div>
            ))}
            {!recentConversations.length ? <p className="text-xs text-muted-foreground">No outputs yet. Start from Create to seed your feed.</p> : null}
          </div>
        </article>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((card) => (
          <FeedCard key={card.id} title={card.title} description={card.description} suggestedAction={card.suggested_action} />
        ))}
        </div>
      </div>
    </section>
  );
}
