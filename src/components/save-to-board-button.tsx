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
    let mounted = true;

    async function loadBoards() {
      try {
        const res = await fetch("/api/boards");
        const data = res.ok ? await res.json() : [];
        const list = Array.isArray(data) ? data : data.boards ?? [];
        if (mounted) setBoards(list);
      } catch (error) {
        console.error("Failed to load boards:", error);
        if (mounted) setBoards([]);
      } finally {
        if (mounted) setIsLoadingBoards(false);
      }
    }

    void loadBoards();
    return () => {
      mounted = false;
    };
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
      setStatus(res.ok && json.ok ? "Saved" : json.error || json.message || "Unable to save");
    } catch (error) {
      console.error("Save to board error:", error);
      setStatus("Unable to save");
    } finally {
      setIsSaving(false);
    }
  }

  const disabled = !conversationId || !boardId || isSaving;

  return (
    <div className="flex items-center gap-2">
      <select
        className="h-8 max-w-40 rounded-full border bg-background px-3 text-xs outline-none transition focus:border-primary"
        value={boardId}
        onChange={(event) => setBoardId(event.target.value)}
        aria-label="Choose board"
      >
        <option value="">{isLoadingBoards ? "Loading..." : "Save to board"}</option>
        {boards.map((board) => (
          <option key={board.id} value={board.id}>
            {board.name}
          </option>
        ))}
      </select>

      <Button size="sm" onClick={saveToBoard} disabled={disabled}>
        {isSaving ? "Saving" : "Add"}
      </Button>

      {status ? <span className="text-xs text-muted-foreground">{status}</span> : null}
    </div>
  );
}
