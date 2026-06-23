import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Search } from "lucide-react";
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

export const Route = createFileRoute("/_authenticated/ob")({
  component: OBPage,
  head: () => ({ meta: [{ title: "Occurrence Book · Kenya Police CMS" }] }),
});

const INCIDENT_TYPES = ["Theft", "Assault", "Burglary", "Robbery", "Traffic", "Missing person", "Domestic", "Drugs", "Fraud", "Other"];

const schema = z.object({
  incident_type: z.string().min(2).max(60),
  description: z.string().trim().min(5).max(2000),
  location: z.string().trim().max(200).optional().or(z.literal("")),
  reporter_name: z.string().trim().max(120).optional().or(z.literal("")),
  reporter_contact: z.string().trim().max(60).optional().or(z.literal("")),
  occurred_at: z.string().min(1),
  station_id: z.string().uuid().optional().or(z.literal("")),
});

function OBPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [openDialog, setOpenDialog] = useState(false);

  const { data: stations } = useQuery({
    queryKey: ["stations"],
    queryFn: async () => (await supabase.from("stations").select("*").order("name")).data ?? [],
  });

  const { data: entries, isLoading } = useQuery({
    queryKey: ["ob-entries", q],
    queryFn: async () => {
      let query = supabase.from("ob_entries").select("*, stations(name)").order("occurred_at", { ascending: false }).limit(200);
      if (q.trim()) query = query.or(`ob_number.ilike.%${q}%,incident_type.ilike.%${q}%,description.ilike.%${q}%,location.ilike.%${q}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async (form: FormData) => {
      const parsed = schema.safeParse(Object.fromEntries(form));
      if (!parsed.success) throw new Error(parsed.error.issues[0].message);
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("ob_entries").insert({
        incident_type: parsed.data.incident_type,
        description: parsed.data.description,
        location: parsed.data.location || null,
        reporter_name: parsed.data.reporter_name || null,
        reporter_contact: parsed.data.reporter_contact || null,
        occurred_at: new Date(parsed.data.occurred_at).toISOString(),
        station_id: parsed.data.station_id || null,
        recorded_by: u.user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("OB entry recorded");
      qc.invalidateQueries({ queryKey: ["ob-entries"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setOpenDialog(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("ob_entries").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ob-entries"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Digital register</p>
          <h1 className="mt-1 font-display text-3xl font-bold">Occurrence Book</h1>
          <p className="mt-1 text-sm text-muted-foreground">Every incident reported at this station, time-stamped and indelible.</p>
        </div>
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-secondary"><Plus className="mr-2 h-4 w-4" />New OB entry</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle className="font-display">New Occurrence Book entry</DialogTitle></DialogHeader>
            <form
              onSubmit={(e) => { e.preventDefault(); create.mutate(new FormData(e.currentTarget)); }}
              className="space-y-3"
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Incident type</Label>
                  <Select name="incident_type" defaultValue="Theft">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{INCIDENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Occurred at</Label>
                  <Input type="datetime-local" name="occurred_at" defaultValue={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)} required />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea name="description" rows={4} required placeholder="Brief facts of the incident…" />
              </div>
              <div className="space-y-1.5">
                <Label>Location</Label>
                <Input name="location" placeholder="e.g. Tom Mboya Street, near Ambassadeur" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Reporter name</Label><Input name="reporter_name" /></div>
                <div className="space-y-1.5"><Label>Reporter contact</Label><Input name="reporter_contact" /></div>
              </div>
              <div className="space-y-1.5">
                <Label>Station</Label>
                <Select name="station_id">
                  <SelectTrigger><SelectValue placeholder="Select station" /></SelectTrigger>
                  <SelectContent>{stations?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={create.isPending} className="bg-primary text-primary-foreground hover:bg-secondary">
                  {create.isPending ? "Saving…" : "Record entry"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by OB number, type, location…" className="pl-9" />
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-8 text-center text-sm text-muted-foreground">Loading…</p>
          ) : entries && entries.length > 0 ? (
            <div className="divide-y divide-border">
              {entries.map((e) => (
                <div key={e.id} className="flex flex-wrap items-start justify-between gap-4 p-4 hover:bg-muted/40">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-gold">{e.ob_number}</span>
                      <Badge variant="outline">{e.incident_type}</Badge>
                    </div>
                    <p className="mt-1 truncate font-medium">{e.description}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {e.location ?? "Unknown location"} · {new Date(e.occurred_at).toLocaleString()} · {e.stations?.name ?? "—"}
                    </p>
                  </div>
                  <Select value={e.status} onValueChange={(v) => updateStatus.mutate({ id: e.id, status: v })}>
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="under_investigation">Under investigation</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                      <SelectItem value="unfounded">Unfounded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          ) : (
            <p className="p-8 text-center text-sm text-muted-foreground">No entries match your search.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
