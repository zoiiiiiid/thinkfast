"use client";

import { FormEvent, useEffect, useState } from "react";
import { BoardCard } from "@/components/cards";
import { Button } from "@/components/ui/button";

type Board = {
  id: string;
  name: string;
  description?: string;
  conversation_count?: number;
};

export default function BoardsPage() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [status, setStatus] = useState("");

  async function loadBoards() {
    try {
      const res = await fetch("/api/boards");
      const data = res.ok ? await res.json() : [];
      setBoards(Array.isArray(data) ? data : data.boards ?? []);
    } catch (error) {
      console.error("Unable to load boards:", error);
      setBoards([]);
    }
  }

  async function createBoard(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;

    setIsCreating(true);
    setStatus("");

    try {
      const res = await fetch("/api/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() }),
      });

      if (!res.ok) throw new Error("Unable to create board.");

      setName("");
      setDescription("");
      setStatus("Board created.");
      await loadBoards();
    } catch (error) {
      console.error(error);
      setStatus("Unable to create board.");
    } finally {
      setIsCreating(false);
    }
  }

  useEffect(() => {
    void loadBoards();
  }, []);

  return (
    <section className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Boards</h1>
          <p className="mt-2 text-sm text-muted-foreground">Save conversations into clean folders.</p>
        </div>
        <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">{boards.length} boards</span>
      </div>

      <form onSubmit={createBoard} className="rounded-[1.5rem] border bg-card p-3 shadow-sm">
        <div className="grid gap-2 md:grid-cols-[1fr_1.4fr_auto]">
          <input
            className="h-10 rounded-full border bg-background px-4 text-sm outline-none transition focus:border-primary"
            placeholder="Board name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <input
            className="h-10 rounded-full border bg-background px-4 text-sm outline-none transition focus:border-primary"
            placeholder="Description optional"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
          <Button type="submit" size="lg" disabled={!name.trim() || isCreating}>
            {isCreating ? "Creating" : "Create"}
          </Button>
        </div>
      </form>

      {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {boards.map((board) => (
          <BoardCard
            key={board.id}
            id={board.id}
            name={board.name}
            description={board.description || ""}
            count={board.conversation_count ?? 0}
          />
        ))}
      </div>

      {!boards.length ? (
        <div className="rounded-[1.5rem] border bg-card p-8 text-center text-sm text-muted-foreground shadow-sm">
          No boards yet. Create one, then save generated conversations from the workspace.
        </div>
      ) : null}
    </section>
  );
}
