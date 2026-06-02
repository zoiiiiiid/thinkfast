import Link from "next/link";
import { Navbar } from "@/components/navbar";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-16">
        <section className="rounded-3xl border bg-card p-8 text-center shadow-sm">
          <p className="text-sm uppercase tracking-wide text-muted-foreground">ThinkFast</p>
          <h1 className="mt-3 text-4xl font-bold">Fast AI, guided by your ideas, protected by privacy.</h1>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            ThinkFast helps you create outputs quickly while protecting sensitive details and prompting your own viewpoint when requests are too vague.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link href="/auth" className="rounded-lg bg-primary px-4 py-2 text-primary-foreground">
              Get Started
            </Link>
            <Link href="/workspace" className="rounded-lg border px-4 py-2">
              Open Workspace
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
