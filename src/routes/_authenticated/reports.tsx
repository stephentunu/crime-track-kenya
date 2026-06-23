import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell, Legend } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/reports")({
  component: ReportsPage,
  head: () => ({ meta: [{ title: "Reports · Kenya Police CMS" }] }),
});

const COLORS = ["oklch(0.24 0.06 260)", "oklch(0.75 0.13 80)", "oklch(0.55 0.14 145)", "oklch(0.55 0.22 27)", "oklch(0.45 0.08 220)", "oklch(0.34 0.07 260)"];

function ReportsPage() {
  const { data } = useQuery({
    queryKey: ["reports"],
    queryFn: async () => {
      const { data: ob } = await supabase.from("ob_entries").select("incident_type, location, occurred_at, status");
      return ob ?? [];
    },
  });

  const byType = Object.entries(
    (data ?? []).reduce<Record<string, number>>((acc, e) => { acc[e.incident_type] = (acc[e.incident_type] || 0) + 1; return acc; }, {})
  ).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count);

  const byStatus = Object.entries(
    (data ?? []).reduce<Record<string, number>>((acc, e) => { acc[e.status] = (acc[e.status] || 0) + 1; return acc; }, {})
  ).map(([name, value]) => ({ name, value }));

  const hotspots = Object.entries(
    (data ?? []).filter((e) => e.location).reduce<Record<string, number>>((acc, e) => { acc[e.location!] = (acc[e.location!] || 0) + 1; return acc; }, {})
  ).map(([location, count]) => ({ location, count })).sort((a, b) => b.count - a.count).slice(0, 10);

  const byMonth = Object.entries(
    (data ?? []).reduce<Record<string, number>>((acc, e) => {
      const m = new Date(e.occurred_at).toISOString().slice(0, 7);
      acc[m] = (acc[m] || 0) + 1;
      return acc;
    }, {})
  ).map(([month, count]) => ({ month, count })).sort((a, b) => a.month.localeCompare(b.month));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Crime analytics</p>
        <h1 className="mt-1 font-display text-3xl font-bold">Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">Aggregated from {data?.length ?? 0} Occurrence Book entries.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="font-display text-lg">Incidents by type</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byType}>
                <XAxis dataKey="type" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="oklch(0.24 0.06 260)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="font-display text-lg">Status breakdown</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byStatus} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} label>
                  {byStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="font-display text-lg">Trend over time</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byMonth}>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="oklch(0.75 0.13 80)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="font-display text-lg">Top hotspots</CardTitle></CardHeader>
          <CardContent>
            {hotspots.length ? (
              <ol className="space-y-2 text-sm">
                {hotspots.map((h, i) => (
                  <li key={h.location} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
                    <span><span className="mr-2 font-mono text-xs text-muted-foreground">#{i + 1}</span>{h.location}</span>
                    <span className="font-display font-semibold text-primary">{h.count}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted-foreground">No location data yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
