"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";

export function VercelAnalytics() {
  return (
    <Analytics
      beforeSend={(event: BeforeSendEvent) => {
        const url = new URL(event.url);

        return {
          ...event,
          url: url.origin + url.pathname,
        };
      }}
    />
  );
}