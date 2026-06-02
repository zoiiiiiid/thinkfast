"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type Board = { id: string; name: string };

export function SaveToBoardButton({ conversationId }: { conversationId: string | null }) {
  const [boards, setBoards] = useState<Board[]>([]);
  const [boardId, setBoardId] = useState("");
  const [status, setStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingBoards, setIsLoadingBoards] = useState(true);

  useEffect(() => {
    async function loadBoards() {
      try {
        const res = await fetch("/api/boards");
        const data = res.ok ? await res.json() : [];
        setBoards(Array.isArray(data) ? data : data.boards ?? []);
      } catch (error) {
        console.error("Failed to load boards:", error);
        setBoards([]);
      } finally {
        setIsLoadingBoards(false);
      }
    }

    void loadBoards();
  }, []);

  async function saveToBoard() {
    if (!conversationId || !boardId || isSaving) return;

    setIsSaving(true);
    setStatus("");

    try {
      const res = await fetch("/api/conversation-boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, boardId }),
      });
      const json = await res.json();
      setStatus(res.ok && json.ok ? "Saved to board." : json.error || json.message || "Unable to save to board.");
    } catch (error) {
      console.error("Save to board error:", error);
      setStatus("Unable to save to board.");
    } finally {
      setIsSaving(false);
    }
  }

  const disabled = !conversationId || !boardId || isSaving;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        className="h-9 rounded-full border bg-background px-3 text-sm outline-none transition focus:border-primary"
        value={boardId}
        onChange={(event) => setBoardId(event.target.value)}
      >
        <option value="">{isLoadingBoards ? "Loading boards..." : "Save to board"}</option>
        {boards.map((board) => (
          <option key={board.id} value={board.id}>
            {board.name}
          </option>
        ))}
      </select>

      <Button size="sm" onClick={saveToBoard} disabled={disabled}>
        {isSaving ? "Saving..." : "Add"}
      </Button>

      {!conversationId ? (
        <span className="text-xs text-muted-foreground">Generate first.</span>
      ) : !boardId ? (
        <span className="text-xs text-muted-foreground">Choose a board.</span>
      ) : null}

      {status ? <span className="text-xs text-muted-foreground">{status}</span> : null}
    </div>
  );
}
