import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileText, Briefcase, Users, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Dashboard · Kenya Police CMS" }] }),
});

function Dashboard() {
  const { data } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [ob, cases, offenders, openCases, recent] = await Promise.all([
        supabase.from("ob_entries").select("*", { count: "exact", head: true }),
        supabase.from("cases").select("*", { count: "exact", head: true }),
        supabase.from("offenders").select("*", { count: "exact", head: true }),
        supabase.from("cases").select("*", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("ob_entries").select("id, ob_number, incident_type, location, occurred_at, status").order("occurred_at", { ascending: false }).limit(6),
      ]);
      return {
        ob: ob.count ?? 0,
        cases: cases.count ?? 0,
        offenders: offenders.count ?? 0,
        openCases: openCases.count ?? 0,
        recent: recent.data ?? [],
      };
    },
  });

  const stats = [
    { label: "OB Entries", value: data?.ob ?? 0, icon: FileText, accent: "bg-primary text-primary-foreground" },
    { label: "Active Cases", value: data?.openCases ?? 0, icon: AlertTriangle, accent: "bg-gold text-gold-foreground" },
    { label: "Total Cases", value: data?.cases ?? 0, icon: Briefcase, accent: "bg-secondary text-secondary-foreground" },
    { label: "Offenders on file", value: data?.offenders ?? 0, icon: Users, accent: "bg-muted text-foreground" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Station overview</p>
        <h1 className="mt-1 font-display text-3xl font-bold">Good day, officer.</h1>
        <div className="gold-rule mt-4 max-w-[120px]" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className={`grid h-12 w-12 place-items-center rounded-md ${s.accent}`}>
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</p>
                <p className="font-display text-2xl font-bold">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-display">Recent Occurrence Book entries</CardTitle>
          <Link to="/ob" className="text-sm text-primary underline-offset-4 hover:underline">View all →</Link>
        </CardHeader>
        <CardContent>
          {data?.recent.length ? (
            <div className="divide-y divide-border">
              {data.recent.map((e) => (
                <div key={e.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-mono text-xs text-muted-foreground">{e.ob_number}</p>
                    <p className="font-medium">{e.incident_type}</p>
                    <p className="text-sm text-muted-foreground">{e.location ?? "—"} · {new Date(e.occurred_at).toLocaleString()}</p>
                  </div>
                  <Badge variant={e.status === "open" ? "default" : "secondary"} className={e.status === "open" ? "bg-gold text-gold-foreground" : ""}>
                    {e.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">No entries yet. Open the Occurrence Book to log the first incident.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
