import type { AiMode } from "@/lib/types";
import { MODE_OPTIONS } from "@/lib/constants";

const MODE_HINTS: Record<AiMode, string> = {
  auto: "Balanced for most tasks",
  fast: "Quick draft",
  deep: "More structured",
  creative: "More original",
  "study-coach": "Guided learning",
  "privacy-first": "Cautious with details",
};

type ModelSelectorProps = {
  mode: AiMode;
  onChange: (mode: AiMode) => void;
};

export function ModelSelector({ mode, onChange }: ModelSelectorProps) {
  const selected = MODE_OPTIONS.find((item) => item.value === mode) ?? MODE_OPTIONS[0];

  return (
    <div className="flex items-center gap-2 rounded-full border bg-background px-3 py-2 shadow-sm">
      <span className="text-xs font-medium text-muted-foreground">Mode</span>
      <select
        value={mode}
        onChange={(event) => onChange(event.target.value as AiMode)}
        className="max-w-40 bg-transparent text-sm font-medium outline-none"
        aria-label="Select AI mode"
      >
        {MODE_OPTIONS.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
      <span className="hidden rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground md:inline">
        {MODE_HINTS[selected.value]}
      </span>
    </div>
  );
}
