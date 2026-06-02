"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type Board = {
  id: string;
  name: string;
  description?: string | null;
  created_at?: string;
};

type Conversation = {
  id: string;
  title?: string | null;
  summary?: string | null;
  ai_response?: string | null;
  selected_mode?: string | null;
  privacy_risk?: string | null;
  idea_prompt_needed?: boolean | null;
  created_at?: string | null;
};

async function fetchJsonWithTimeout<T>(url: string, fallback: T): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return fallback;
    const data = await response.json();
    return data as T;
  } catch (error) {
    console.error(`Failed to fetch ${url}:`, error);
    return fallback;
  } finally {
    window.clearTimeout(timeout);
  }
}

export default function BoardDetailPage() {
  const params = useParams<{ id: string }>();
  const boardId = params.id;
  const [board, setBoard] = useState<Board | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openConversationId, setOpenConversationId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadBoard() {
      if (!boardId) return;
      setLoading(true);
      setError("");

      try {
        const boardData = await fetchJsonWithTimeout<Board | null>(`/api/boards/${boardId}`, null);
        const conversationData = await fetchJsonWithTimeout<Conversation[] | { conversations?: Conversation[] }>(
          `/api/boards/${boardId}/conversations`,
          [],
        );

        if (!mounted) return;

        const list = Array.isArray(conversationData) ? conversationData : conversationData.conversations ?? [];
        setBoard(boardData);
        setConversations(list);
        if (!boardData) setError("This board could not be loaded. Try going back to Boards and opening it again.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadBoard();
    return () => {
      mounted = false;
    };
  }, [boardId]);

  return (
    <section className="mx-auto max-w-4xl space-y-5">
      <Link href="/boards" className="inline-flex text-sm text-muted-foreground transition hover:text-foreground">
        ← Boards
      </Link>

      <div className="rounded-[1.5rem] border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Board</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">{board?.name ?? "Loading board"}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              {board?.description || "Saved ThinkFast conversations appear here."}
            </p>
          </div>
          <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">{conversations.length} saved</span>
        </div>
      </div>

      {loading ? (
        <div className="rounded-[1.5rem] border bg-card p-6 text-sm text-muted-foreground shadow-sm">
          Loading saved conversations...
        </div>
      ) : null}

      {!loading && error ? (
        <div className="rounded-[1.5rem] border bg-card p-6 text-sm text-muted-foreground shadow-sm">{error}</div>
      ) : null}

      {!loading && !error && !conversations.length ? (
        <div className="rounded-[1.5rem] border bg-card p-8 text-center shadow-sm">
          <h2 className="font-semibold">Nothing saved here yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Generate something in the workspace, choose this board, then click Add.
          </p>
          <Link href="/workspace" className="mt-4 inline-flex rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground">
            Open workspace
          </Link>
        </div>
      ) : null}

      <div className="space-y-3">
        {conversations.map((conversation) => {
          const isOpen = openConversationId === conversation.id;
          return (
            <article key={conversation.id} className="overflow-hidden rounded-[1.5rem] border bg-card shadow-sm">
              <button
                type="button"
                onClick={() => setOpenConversationId(isOpen ? null : conversation.id)}
                className="flex w-full items-start justify-between gap-4 p-4 text-left transition hover:bg-muted/40"
              >
                <div className="min-w-0">
                  <h2 className="font-semibold tracking-tight">{conversation.title || "Untitled conversation"}</h2>
                  <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">
                    {conversation.summary || "No summary saved."}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
                      {conversation.selected_mode || "auto"}
                    </span>
                    <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
                      Privacy: {conversation.privacy_risk || "low"}
                    </span>
                    {conversation.idea_prompt_needed ? (
                      <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">Idea-led</span>
                    ) : null}
                  </div>
                </div>
                <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">{isOpen ? "Close" : "Open"}</span>
              </button>

              {isOpen ? (
                <div className="border-t bg-background p-4">
                  <div className="whitespace-pre-wrap rounded-[1.25rem] bg-muted/50 p-4 text-sm leading-7">
                    {conversation.ai_response || "No saved output."}
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
