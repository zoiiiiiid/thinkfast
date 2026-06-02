import type { ReactNode } from "react";
import { Navbar } from "@/components/navbar";
import { Sidebar } from "@/components/sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(0,0,0,0.07),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(0,0,0,0.05),transparent_28%)]" />
      <Navbar />
      <div className="mx-auto flex w-full max-w-7xl gap-6 px-4 py-5">
        <Sidebar />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
