"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FeedCard } from "@/components/cards";

type FeedItem = {
  id: string;
  title: string;
  description: string;
  suggested_action: string;
  href?: string | null;
  meta?: string | null;
  kind?: string | null;
};

type RecentConversation = {
  id: string;
  title?: string | null;
  summary?: string | null;
  selected_mode?: string | null;
  privacy_risk?: string | null;
  idea_prompt_needed?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

function normalizeFeed(data: unknown): FeedItem[] {
  if (Array.isArray(data)) return data as FeedItem[];
  if (data && typeof data === "object" && Array.isArray((data as { cards?: unknown }).cards)) {
    return (data as { cards: FeedItem[] }).cards;
  }
  return [];
}

function normalizeRecent(data: unknown): RecentConversation[] {
  if (Array.isArray(data)) return data as RecentConversation[];
  if (data && typeof data === "object" && Array.isArray((data as { conversations?: unknown }).conversations)) {
    return (data as { conversations: RecentConversation[] }).conversations;
  }
  return [];
}

async function fetchJson<T>(url: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return fallback;
    const data = await response.json().catch(() => null);
    return data as T;
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error(`Unable to load ${url}:`, error);
    }
    return fallback;
  }
}

export default function FeedPage() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [recentConversations, setRecentConversations] = useState<RecentConversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadFeed() {
      setLoading(true);

      const [feedData, conversationData] = await Promise.all([
        fetchJson<unknown>("/api/feed", []),
        fetchJson<unknown>("/api/conversations", []),
      ]);

      if (!mounted) return;

      setItems(normalizeFeed(feedData));
      setRecentConversations(normalizeRecent(conversationData));
      setLoading(false);
    }

    void loadFeed();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Your Home Feed</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Personalized cards based on recent conversations, saved boards, and follow-up actions.
          </p>
        </div>

        <Link
          href="/workspace"
          className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
        >
          New workspace
        </Link>
      </div>

      <div className="max-h-[72vh] space-y-4 overflow-y-auto pr-1">
        <article className="rounded-[1.5rem] border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold tracking-tight">Continue where you left off</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Reopen a saved conversation and keep building from the same thread.
              </p>
            </div>
            <Link href="/boards" className="text-xs font-medium text-primary">
              Boards →
            </Link>
          </div>

          <div className="mt-3 grid gap-2">
            {loading ? (
              <p className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
                Loading your recent work...
              </p>
            ) : null}

            {!loading && recentConversations.slice(0, 3).map((conversation) => (
              <Link
                key={conversation.id}
                href={`/workspace?conversationId=${conversation.id}`}
                className="group rounded-xl border p-3 transition hover:border-primary/30 hover:bg-muted/30"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {conversation.title || "Untitled conversation"}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                      {conversation.summary || "Continue refining this output."}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-muted px-2 py-1 text-[11px] text-muted-foreground group-hover:text-primary">
                    Continue
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
                    {conversation.selected_mode || "auto"}
                  </span>
                  <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
                    Privacy: {conversation.privacy_risk || "low"}
                  </span>
                  {conversation.idea_prompt_needed ? (
                    <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
                      Idea-led
                    </span>
                  ) : null}
                </div>
              </Link>
            ))}

            {!loading && !recentConversations.length ? (
              <p className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
                No outputs yet. Start from the workspace to seed your feed.
              </p>
            ) : null}
          </div>
        </article>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((card) => (
            <FeedCard
              key={card.id}
              title={card.title}
              description={card.description}
              suggestedAction={card.suggested_action}
              href={card.href}
              meta={card.meta}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
