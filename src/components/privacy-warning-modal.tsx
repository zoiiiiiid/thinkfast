import { Button } from "@/components/ui/button";
import type { PrivacyCheckResult } from "@/lib/types";

type Decision = "protect" | "privacy-first" | "continue";

export function PrivacyWarningModal({
  privacy,
  decision,
  onDecision,
}: {
  privacy: PrivacyCheckResult;
  decision: Decision | null;
  onDecision: (decision: Decision) => void;
}) {
  if (privacy.privacyRisk === "low") return null;

  return (
    <section className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
      <h3 className="font-semibold">Privacy Warning</h3>
      <p className="mt-1 text-sm">
        Personal details detected ({privacy.detectedItems.join(", ")}). Choose how ThinkFast should continue.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant={decision === "protect" ? "default" : "secondary"} onClick={() => onDecision("protect")}>
          Protect and continue
        </Button>
        <Button size="sm" variant={decision === "privacy-first" ? "default" : "secondary"} onClick={() => onDecision("privacy-first")}>
          Use Privacy First mode
        </Button>
        <Button size="sm" variant={decision === "continue" ? "default" : "ghost"} onClick={() => onDecision("continue")}>
          Continue anyway
        </Button>
      </div>
    </section>
  );
}
