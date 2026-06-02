"use client";

import { FormEvent, useEffect, useState } from "react";
import { BoardCard } from "@/components/cards";
import { Button } from "@/components/ui/button";

type Board = {
  id: string;
  name: string;
  description: string;
  conversation_count?: number;
};

export default function BoardsPage() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [status, setStatus] = useState("");

  async function loadBoards() {
    const res = await fetch("/api/boards");
    const data = res.ok ? await res.json() : [];
    setBoards(Array.isArray(data) ? data : data.boards ?? []);
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
    <section className="mx-auto max-w-6xl space-y-6">
      <div className="rounded-[2rem] border bg-card/80 p-6 shadow-sm backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Boards</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Organize your AI outputs</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Boards work like playlists for conversations. Open a board to review everything you saved there.
            </p>
          </div>
          <span className="rounded-full border px-3 py-1 text-sm text-muted-foreground">{boards.length} boards</span>
        </div>
      </div>

      <form onSubmit={createBoard} className="grid gap-3 rounded-[2rem] border bg-card/80 p-4 shadow-sm backdrop-blur md:grid-cols-[1fr_1.5fr_auto]">
        <input
          className="h-11 rounded-full border bg-background px-4 text-sm outline-none transition focus:border-primary"
          placeholder="Board name"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <input
          className="h-11 rounded-full border bg-background px-4 text-sm outline-none transition focus:border-primary"
          placeholder="Description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
        <Button type="submit" size="lg" disabled={!name.trim() || isCreating}>
          {isCreating ? "Creating..." : "Create board"}
        </Button>
      </form>

      {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {boards.map((board) => (
          <BoardCard
            key={board.id}
            id={board.id}
            name={board.name}
            description={board.description}
            count={board.conversation_count ?? 0}
          />
        ))}
      </div>

      {!boards.length ? (
        <div className="rounded-[2rem] border bg-card/80 p-8 text-center text-sm text-muted-foreground shadow-sm">
          No boards yet. Create your first board, then save generated conversations into it from the workspace.
        </div>
      ) : null}
    </section>
  );
}
