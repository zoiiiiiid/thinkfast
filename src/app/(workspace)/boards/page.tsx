"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type Board = {
  id: string;
  name: string;
  description?: string | null;
  created_at?: string;
};

function BoardCardSkeleton() {
  return (
    <div className="rounded-[1.5rem] border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-3">
          <Skeleton className="h-5 w-2/5" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>

        <Skeleton className="h-7 w-16 rounded-full" />
      </div>

      <Skeleton className="mt-4 h-3 w-28" />
    </div>
  );
}

export default function BoardsPage() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void loadBoards();
  }, []);

  async function loadBoards() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/boards", {
        cache: "no-store",
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || data?.ok === false) {
        setBoards([]);
        setError(data?.error || "Unable to load boards.");
        return;
      }

      const nextBoards = Array.isArray(data)
        ? data
        : Array.isArray(data?.boards)
          ? data.boards
          : [];

      setBoards(nextBoards);
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.error("Unable to load boards:", error);
      }
      setBoards([]);
      setError("Unable to load boards.");
    } finally {
      setLoading(false);
    }
  }

  async function createBoard() {
    const cleanName = name.trim();

    if (!cleanName || creating) return;

    setCreating(true);
    setError("");

    try {
      const res = await fetch("/api/boards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: cleanName,
          description: description.trim() || null,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || data?.ok === false) {
        setError(data?.error || "Unable to create board.");
        return;
      }

      const createdBoard = data?.board ?? data;

      if (createdBoard?.id) {
        setBoards((current) => [createdBoard, ...current]);
      } else {
        await loadBoards();
      }

      setName("");
      setDescription("");
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.error("Create board error:", error);
      }
      setError("Unable to create board.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 md:px-8">
      <section className="rounded-[1.75rem] border bg-background p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Boards</h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Organize your ThinkFast conversations into focused spaces. Open a
              board to preview saved conversations or continue them in the
              workspace.
            </p>
          </div>

          <Button variant="outline" onClick={() => void loadBoards()}>
            Refresh
          </Button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-[1fr_1.4fr_auto]">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Board name"
            className="rounded-2xl border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary"
          />

          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Short description, optional"
            className="rounded-2xl border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary"
          />

          <Button
            onClick={createBoard}
            disabled={!name.trim() || creating}
            className="rounded-2xl px-5"
          >
            {creating ? "Creating..." : "Create"}
          </Button>
        </div>

        {error ? (
          <p className="mt-3 text-sm text-red-600">{error}</p>
        ) : null}
      </section>

      <section>
        {loading ? (
          <>
            <p className="sr-only" role="status">
              Loading boards...
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <BoardCardSkeleton key={index} />
              ))}
            </div>
          </>
        ) : boards.length === 0 ? (
          <div className="rounded-[1.75rem] border bg-card p-8 text-center">
            <h2 className="text-base font-medium">No boards yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Create your first board to start organizing saved conversations.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {boards.map((board) => (
              <Link
                key={board.id}
                href={`/boards/${board.id}`}
                className="group rounded-[1.5rem] border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold tracking-tight">
                      {board.name}
                    </h2>

                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                      {board.description || "Open this board to view and continue saved ThinkFast conversations."}
                    </p>
                  </div>

                  <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground transition group-hover:border-primary/40 group-hover:text-primary">
                    Open
                  </span>
                </div>

                {board.created_at ? (
                  <p className="mt-4 text-xs text-muted-foreground">
                    Created {new Date(board.created_at).toLocaleDateString()}
                  </p>
                ) : null}
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}