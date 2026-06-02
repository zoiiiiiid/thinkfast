import type { IdeaCheckResult } from "@/lib/types";

export function IdeaPromptModal({
  idea,
  selectedAnswer,
  onSelect,
}: {
  idea: IdeaCheckResult;
  selectedAnswer: string;
  onSelect: (answer: string) => void;
}) {
  if (!idea.ideaPromptNeeded) return null;

  return (
    <section className="rounded-2xl border p-4">
      <h3 className="font-semibold">Idea Prompt Check</h3>
      <p className="text-sm text-muted-foreground">{idea.reason}</p>
      <p className="mt-2 text-xs text-muted-foreground">Choose your angle before generation:</p>
      <div className="mt-2 grid gap-2 md:grid-cols-2">
        {idea.quickOptions.map((option) => (
          <button
            key={option}
            className={`rounded-lg border p-2 text-left text-sm ${selectedAnswer === option ? "border-primary bg-primary/10" : "hover:bg-muted"}`}
            onClick={() => onSelect(option)}
          >
            {option}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Selected: {selectedAnswer || "None yet"}</p>
    </section>
  );
}
