import { createFileRoute, Link } from "@tanstack/react-router";
import { Shield, FileText, Users, BarChart3, Lock, Database } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Kenya Police Crime Management System" },
      { name: "description", content: "Digitizing the Occurrence Book — secure case management and crime analytics for Kenya Police stations." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="border-b border-border bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-md bg-gold text-gold-foreground">
              <Shield className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <p className="font-display text-base font-semibold">Kenya Police</p>
              <p className="text-xs text-primary-foreground/70">Crime Management System</p>
            </div>
          </div>
          <Link to="/auth">
            <Button variant="secondary" className="bg-gold text-gold-foreground hover:bg-gold/90">
              Officer sign in
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="crest-gradient text-primary-foreground">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.2em] text-gold">Ministry of Interior · National Police Service</p>
            <h1 className="mt-4 font-display text-4xl font-bold leading-tight sm:text-5xl">
              From paper Occurrence Books to a secure digital record.
            </h1>
            <p className="mt-5 text-base text-primary-foreground/80 sm:text-lg">
              A station-grade crime management platform that captures incidents, tracks investigations,
              and surfaces hotspots — replacing handwritten files with encrypted, searchable records.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/auth">
                <Button size="lg" className="bg-gold text-gold-foreground hover:bg-gold/90">
                  Enter the system
                </Button>
              </Link>
              <a href="#features">
                <Button size="lg" variant="outline" className="border-gold/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10">
                  Learn more
                </Button>
              </a>
            </div>
          </div>
        </div>
        <div className="gold-rule" />
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-12 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-gold">Capabilities</p>
          <h2 className="mt-2 font-display text-3xl font-bold">Built for the station, not the filing cabinet</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: FileText, title: "Digital Occurrence Book", desc: "Capture incidents with location, reporter and officer-of-record. Auto-numbered, time-stamped, indelible." },
            { icon: Users, title: "Offender registry", desc: "Centralised suspect records with aliases, biodata and case history — searchable in seconds." },
            { icon: Shield, title: "Case management", desc: "Assign investigators, track status and log every update against the original OB entry." },
            { icon: BarChart3, title: "Crime analytics", desc: "Filter by station, type and time. Identify recurring offences and emerging hotspots." },
            { icon: Lock, title: "Role-based security", desc: "Officer, Investigator and Admin roles. Row-level policies enforce who can read and edit." },
            { icon: Database, title: "Reliable backup", desc: "Every entry persists in encrypted cloud storage — no more lost or damaged files." },
          ].map((f) => (
            <div key={f.title} className="rounded-lg border border-border bg-card p-6 shadow-sm transition hover:shadow-md">
              <div className="grid h-10 w-10 place-items-center rounded-md bg-primary text-primary-foreground">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border bg-primary py-8 text-center text-sm text-primary-foreground/70">
        © {new Date().getFullYear()} Kenya Police Service · Crime Management System
      </footer>
    </div>
  );
}
