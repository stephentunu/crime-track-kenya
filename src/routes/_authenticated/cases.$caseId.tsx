import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/cases/$caseId")({
  component: CaseDetail,
  head: () => ({ meta: [{ title: "Case · Kenya Police CMS" }] }),
});

function CaseDetail() {
  const { caseId } = Route.useParams();
  const qc = useQueryClient();
  const [note, setNote] = useState("");

  const { data: c, isLoading } = useQuery({
    queryKey: ["case", caseId],
    queryFn: async () => (await supabase.from("cases").select("*, ob_entries(*), stations(name)").eq("id", caseId).maybeSingle()).data,
  });

  const { data: updates } = useQuery({
    queryKey: ["case-updates", caseId],
    queryFn: async () => (await supabase.from("case_updates").select("*").eq("case_id", caseId).order("created_at", { ascending: false })).data ?? [],
  });

  const { data: links } = useQuery({
    queryKey: ["case-offenders", caseId],
    queryFn: async () => (await supabase.from("case_offenders").select("offenders(*)").eq("case_id", caseId)).data ?? [],
  });

  const { data: offenders } = useQuery({
    queryKey: ["offenders-all"],
    queryFn: async () => (await supabase.from("offenders").select("id, full_name, alias").order("full_name")).data ?? [],
  });

  const addNote = useMutation({
    mutationFn: async () => {
      if (!note.trim()) throw new Error("Note is empty");
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("case_updates").insert({ case_id: caseId, update_text: note.trim(), created_by: u.user!.id });
      if (error) throw error;
    },
    onSuccess: () => { setNote(""); qc.invalidateQueries({ queryKey: ["case-updates", caseId] }); toast.success("Update added"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const setStatus = useMutation({
    mutationFn: async (status: string) => {
      const { error } = await supabase.from("cases").update({ status }).eq("id", caseId);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["case", caseId] }); qc.invalidateQueries({ queryKey: ["cases"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const linkOffender = useMutation({
    mutationFn: async (offender_id: string) => {
      const { error } = await supabase.from("case_offenders").insert({ case_id: caseId, offender_id });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["case-offenders", caseId] }); toast.success("Suspect linked"); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!c) return <p className="text-sm text-muted-foreground">Case not found.</p>;

  return (
    <div className="space-y-6">
      <Link to="/cases" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to cases
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs text-gold">{c.case_number}</p>
          <h1 className="mt-1 font-display text-3xl font-bold">{c.title}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="outline">{c.priority} priority</Badge>
            {c.stations && <Badge variant="outline">{c.stations.name}</Badge>}
          </div>
        </div>
        <Select value={c.status} onValueChange={(v) => setStatus.mutate(v)}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="under_investigation">Under investigation</SelectItem>
            <SelectItem value="pending_court">Pending court</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle className="font-display text-lg">Brief</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">{c.description || "No description provided."}</p>
              {c.ob_entries && (
                <div className="mt-4 rounded-md border border-border bg-muted/40 p-3 text-sm">
                  <p className="font-mono text-xs text-gold">{c.ob_entries.ob_number} · {c.ob_entries.incident_type}</p>
                  <p className="mt-1 text-muted-foreground">{c.ob_entries.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="font-display text-lg">Investigation log</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Add an investigation note, witness statement, or status update…" />
                <Button onClick={() => addNote.mutate()} disabled={addNote.isPending} className="bg-primary text-primary-foreground hover:bg-secondary">
                  {addNote.isPending ? "Adding…" : "Add update"}
                </Button>
              </div>
              <div className="space-y-3">
                {updates?.map((u) => (
                  <div key={u.id} className="border-l-2 border-gold pl-4">
                    <p className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleString()}</p>
                    <p className="text-sm">{u.update_text}</p>
                  </div>
                ))}
                {!updates?.length && <p className="text-sm text-muted-foreground">No updates yet.</p>}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader><CardTitle className="font-display text-lg">Suspects</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {links?.length ? links.map((l, i) => l.offenders && (
              <div key={i} className="rounded-md border border-border p-3">
                <p className="font-medium">{l.offenders.full_name}</p>
                {l.offenders.alias && <p className="text-xs text-muted-foreground">aka {l.offenders.alias}</p>}
              </div>
            )) : <p className="text-sm text-muted-foreground">No suspects linked.</p>}
            <Select onValueChange={(v) => linkOffender.mutate(v)}>
              <SelectTrigger><SelectValue placeholder="Link existing offender…" /></SelectTrigger>
              <SelectContent>{offenders?.map((o) => <SelectItem key={o.id} value={o.id}>{o.full_name}{o.alias ? ` (${o.alias})` : ""}</SelectItem>)}</SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
