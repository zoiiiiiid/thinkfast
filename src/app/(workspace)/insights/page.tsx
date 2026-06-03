"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

type Insights = {
  outputsGenerated: number;
  commonTopics: string[];
  privacyWarnings: number;
  ideaPromptsTriggered: number;
  recentModes: string[];
  boardsCreated: number;
};

const emptyInsights: Insights = {
  outputsGenerated: 0,
  commonTopics: [],
  privacyWarnings: 0,
  ideaPromptsTriggered: 0,
  recentModes: [],
  boardsCreated: 0,
};

function MetricSkeleton({ wide = false }: { wide?: boolean }) {
  return (
    <article className={`rounded-xl border p-4 ${wide ? "md:col-span-2" : ""}`}>
      <Skeleton className="h-3 w-28" />
      <Skeleton className="mt-3 h-8 w-16" />
    </article>
  );
}

function InsightsSkeleton() {
  return (
    <section className="space-y-4">
      <p className="sr-only" role="status">
        Loading insights...
      </p>
      <Skeleton className="h-8 w-32" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MetricSkeleton />
        <MetricSkeleton />
        <MetricSkeleton />
        <MetricSkeleton />
        <MetricSkeleton wide />
        <MetricSkeleton wide />
      </div>
    </section>
  );
}

async function loadInsights(): Promise<Insights> {
  try {
    const response = await fetch("/api/insights", { cache: "no-store" });
    const text = await response.text().catch(() => "");

    if (!response.ok || !text) return emptyInsights;

    return JSON.parse(text) as Insights;
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Unable to load insights:", error);
    }

    return emptyInsights;
  }
}

export default function InsightsPage() {
  const [insights, setInsights] = useState<Insights | null>(null);

  useEffect(() => {
    let mounted = true;

    void loadInsights().then((data) => {
      if (mounted) setInsights(data);
    });

    return () => {
      mounted = false;
    };
  }, []);

  if (!insights) return <InsightsSkeleton />;

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
