"use client";

import type { AiMode } from "@/lib/types";
import { THINKFAST_MODE_OPTIONS } from "@/lib/model-router";

type ModelSelectorProps = {
  mode: AiMode;
  onChange: (mode: AiMode) => void;
  disabled?: boolean;
};

export function ModelSelector({
  mode,
  onChange,
  disabled = false,
}: ModelSelectorProps) {
  return (
    <select
      value={mode}
      onChange={(event) => onChange(event.target.value as AiMode)}
      disabled={disabled}
      aria-label="Select ThinkFast mode"
      className="max-w-[230px] truncate bg-transparent text-xs font-medium outline-none disabled:cursor-not-allowed disabled:opacity-60"
    >
      {THINKFAST_MODE_OPTIONS.map((item) => (
        <option key={item.value} value={item.value}>
          {item.label} · {item.modelLabel}
        </option>
      ))}
    </select>
  );
}