"use client";

import { useEffect, useState } from "react";

type Insights = {
  outputsGenerated: number;
  commonTopics: string[];
  privacyWarnings: number;
  ideaPromptsTriggered: number;
  recentModes: string[];
  boardsCreated: number;
};

export default function InsightsPage() {
  const [insights, setInsights] = useState<Insights | null>(null);

  useEffect(() => {
    fetch("/api/insights")
      .then((r) => r.json())
      .then(setInsights);
  }, []);

  if (!insights) return <p>Loading insights...</p>;

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Insights</h1>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <article className="rounded-xl border p-4">
          <p className="text-xs text-muted-foreground">AI outputs generated</p>
          <p className="text-2xl font-semibold">{insights.outputsGenerated}</p>
        </article>
        <article className="rounded-xl border p-4">
          <p className="text-xs text-muted-foreground">Privacy warnings</p>
          <p className="text-2xl font-semibold">{insights.privacyWarnings}</p>
        </article>
        <article className="rounded-xl border p-4">
          <p className="text-xs text-muted-foreground">Idea prompts triggered</p>
          <p className="text-2xl font-semibold">{insights.ideaPromptsTriggered}</p>
        </article>
        <article className="rounded-xl border p-4">
          <p className="text-xs text-muted-foreground">Boards created</p>
          <p className="text-2xl font-semibold">{insights.boardsCreated}</p>
        </article>
        <article className="rounded-xl border p-4 md:col-span-2">
          <p className="text-xs text-muted-foreground">Most common topics</p>
          <p className="text-sm">{insights.commonTopics.join(", ") || "No topics yet"}</p>
        </article>
        <article className="rounded-xl border p-4 md:col-span-2">
          <p className="text-xs text-muted-foreground">Recently used AI modes</p>
          <p className="text-sm">{insights.recentModes.join(", ") || "No modes yet"}</p>
        </article>
      </div>
    </section>
  );
}
