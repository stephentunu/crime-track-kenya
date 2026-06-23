import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/cases")({
  component: CasesPage,
  head: () => ({ meta: [{ title: "Cases · Kenya Police CMS" }] }),
});

const schema = z.object({
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  priority: z.enum(["low", "medium", "high"]),
  ob_entry_id: z.string().uuid().optional().or(z.literal("")),
  station_id: z.string().uuid().optional().or(z.literal("")),
});

function CasesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: cases, isLoading } = useQuery({
    queryKey: ["cases"],
    queryFn: async () => (await supabase.from("cases").select("*, ob_entries(ob_number, incident_type), stations(name)").order("created_at", { ascending: false })).data ?? [],
  });
  const { data: obList } = useQuery({
    queryKey: ["ob-for-cases"],
    queryFn: async () => (await supabase.from("ob_entries").select("id, ob_number, incident_type").order("created_at", { ascending: false }).limit(100)).data ?? [],
  });
  const { data: stations } = useQuery({
    queryKey: ["stations"],
    queryFn: async () => (await supabase.from("stations").select("*").order("name")).data ?? [],
  });

  const create = useMutation({
    mutationFn: async (fd: FormData) => {
      const parsed = schema.safeParse(Object.fromEntries(fd));
      if (!parsed.success) throw new Error(parsed.error.issues[0].message);
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("cases").insert({
        title: parsed.data.title,
        description: parsed.data.description || null,
        priority: parsed.data.priority,
        ob_entry_id: parsed.data.ob_entry_id || null,
        station_id: parsed.data.station_id || null,
        assigned_to: u.user!.id,
        created_by: u.user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Case opened");
      qc.invalidateQueries({ queryKey: ["cases"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Investigation files</p>
          <h1 className="mt-1 font-display text-3xl font-bold">Cases</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-secondary"><Plus className="mr-2 h-4 w-4" />Open case</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle className="font-display">Open a new case</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); create.mutate(new FormData(e.currentTarget)); }} className="space-y-3">
              <div className="space-y-1.5"><Label>Case title</Label><Input name="title" required /></div>
              <div className="space-y-1.5"><Label>Description</Label><Textarea name="description" rows={3} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Priority</Label>
                  <Select name="priority" defaultValue="medium">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Station</Label>
                  <Select name="station_id">
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{stations?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Linked OB entry</Label>
                <Select name="ob_entry_id">
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>{obList?.map((o) => <SelectItem key={o.id} value={o.id}>{o.ob_number} · {o.incident_type}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={create.isPending} className="bg-primary text-primary-foreground hover:bg-secondary">
                  {create.isPending ? "Saving…" : "Open case"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {cases?.map((c) => (
            <Link key={c.id} to="/cases/$caseId" params={{ caseId: c.id }}>
              <Card className="transition hover:shadow-md">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-gold">{c.case_number}</p>
                      <p className="mt-1 font-display text-lg font-semibold">{c.title}</p>
                      {c.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>}
                    </div>
                    <PriorityBadge p={c.priority} />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline">{c.status}</Badge>
                    {c.ob_entries && <span>OB {c.ob_entries.ob_number} · {c.ob_entries.incident_type}</span>}
                    {c.stations && <span>· {c.stations.name}</span>}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
          {!cases?.length && <p className="text-sm text-muted-foreground">No cases yet.</p>}
        </div>
      )}
    </div>
  );
}

function PriorityBadge({ p }: { p: string }) {
  const styles: Record<string, string> = {
    high: "bg-destructive text-destructive-foreground",
    medium: "bg-gold text-gold-foreground",
    low: "bg-muted text-foreground",
  };
  return <Badge className={styles[p] ?? ""}>{p}</Badge>;
}
