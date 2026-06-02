"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type Board = {
  id: string;
  name: string;
  description: string;
  created_at: string;
};

type Conversation = {
  id: string;
  title: string;
  summary: string;
  ai_response: string;
  selected_mode: string;
  privacy_risk: string;
  idea_prompt_needed: boolean;
  created_at: string;
};

export default function BoardDetailPage() {
  const params = useParams<{ id: string }>();
  const boardId = params.id;
  const [board, setBoard] = useState<Board | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [openConversationId, setOpenConversationId] = useState<string | null>(null);

  useEffect(() => {
    async function loadBoard() {
      if (!boardId) return;
      setLoading(true);
      try {
        const [boardRes, conversationsRes] = await Promise.all([
          fetch(`/api/boards/${boardId}`),
          fetch(`/api/boards/${boardId}/conversations`),
        ]);

        setBoard(boardRes.ok ? await boardRes.json() : null);
        const data = conversationsRes.ok ? await conversationsRes.json() : [];
        setConversations(Array.isArray(data) ? data : data.conversations ?? []);
      } finally {
        setLoading(false);
      }
    }

    void loadBoard();
  }, [boardId]);

  return (
    <section className="mx-auto max-w-5xl space-y-5">
      <Link href="/boards" className="inline-flex text-sm font-medium text-muted-foreground hover:text-foreground">
        ← Back to boards
      </Link>

      <div className="rounded-[2rem] border bg-card/80 p-6 shadow-sm backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Board</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{board?.name ?? "Loading board..."}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              {board?.description || "Saved ThinkFast conversations appear here."}
            </p>
          </div>
          <span className="rounded-full border px-3 py-1 text-sm text-muted-foreground">
            {conversations.length} saved
          </span>
        </div>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Loading saved conversations...</p> : null}

      <div className="space-y-3">
        {conversations.map((conversation) => {
          const isOpen = openConversationId === conversation.id;

          return (
            <article key={conversation.id} className="overflow-hidden rounded-[1.75rem] border bg-card shadow-sm">
              <button
                type="button"
                onClick={() => setOpenConversationId(isOpen ? null : conversation.id)}
                className="flex w-full items-start justify-between gap-4 p-5 text-left transition hover:bg-muted/40"
              >
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap gap-2">
                    <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">{conversation.selected_mode}</span>
                    <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">Privacy: {conversation.privacy_risk}</span>
                    {conversation.idea_prompt_needed ? (
                      <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">Idea-led</span>
                    ) : null}
                  </div>
                  <h2 className="font-semibold tracking-tight">{conversation.title}</h2>
                  <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">
                    {conversation.summary || "No summary saved."}
                  </p>
                </div>
                <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                  {isOpen ? "Close" : "Open"}
                </span>
              </button>

              {isOpen ? (
                <div className="border-t bg-background p-5">
                  <div className="whitespace-pre-wrap rounded-3xl bg-muted/50 p-4 text-sm leading-7">
                    {conversation.ai_response}
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      {!loading && !conversations.length ? (
        <div className="rounded-[2rem] border bg-card/80 p-8 text-center shadow-sm">
          <h2 className="font-semibold">Nothing saved here yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Generate something in the workspace, select this board, then click Add.
          </p>
          <Link href="/workspace" className="mt-4 inline-flex rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground">
            Open workspace
          </Link>
        </div>
      ) : null}
    </section>
  );
}
