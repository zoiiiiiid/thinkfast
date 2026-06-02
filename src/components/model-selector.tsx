import type { AiMode } from "@/lib/types";

const OPTIONS: { label: string; value: AiMode }[] = [
  { label: "Auto", value: "auto" },
  { label: "Fast", value: "fast" },
  { label: "Deep", value: "deep" },
  { label: "Creative", value: "creative" },
  { label: "Study", value: "study-coach" },
  { label: "Private", value: "privacy-first" },
];

type ModelSelectorProps = {
  mode: AiMode;
  onChange: (mode: AiMode) => void;
};

export function ModelSelector({ mode, onChange }: ModelSelectorProps) {
  return (
    <select
      value={mode}
      onChange={(event) => onChange(event.target.value as AiMode)}
      className="h-8 rounded-full border bg-background px-3 text-xs outline-none transition focus:border-primary"
      aria-label="Select AI mode"
    >
      {OPTIONS.map((item) => (
        <option key={item.value} value={item.value}>
          {item.label}
        </option>
      ))}
    </select>
  );
}
