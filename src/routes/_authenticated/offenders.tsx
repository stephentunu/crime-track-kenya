import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Search, User } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/offenders")({
  component: OffendersPage,
  head: () => ({ meta: [{ title: "Offenders · Kenya Police CMS" }] }),
});

const schema = z.object({
  full_name: z.string().trim().min(2).max(160),
  alias: z.string().trim().max(80).optional().or(z.literal("")),
  date_of_birth: z.string().optional().or(z.literal("")),
  gender: z.string().optional().or(z.literal("")),
  national_id: z.string().trim().max(40).optional().or(z.literal("")),
  address: z.string().trim().max(200).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

function OffendersPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const { data: list, isLoading } = useQuery({
    queryKey: ["offenders", q],
    queryFn: async () => {
      let query = supabase.from("offenders").select("*").order("created_at", { ascending: false }).limit(200);
      if (q.trim()) query = query.or(`full_name.ilike.%${q}%,alias.ilike.%${q}%,national_id.ilike.%${q}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async (fd: FormData) => {
      const parsed = schema.safeParse(Object.fromEntries(fd));
      if (!parsed.success) throw new Error(parsed.error.issues[0].message);
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("offenders").insert({
        full_name: parsed.data.full_name,
        alias: parsed.data.alias || null,
        date_of_birth: parsed.data.date_of_birth || null,
        gender: parsed.data.gender || null,
        national_id: parsed.data.national_id || null,
        address: parsed.data.address || null,
        phone: parsed.data.phone || null,
        notes: parsed.data.notes || null,
        created_by: u.user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Offender added to registry");
      qc.invalidateQueries({ queryKey: ["offenders"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Suspect registry</p>
          <h1 className="mt-1 font-display text-3xl font-bold">Offenders</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-secondary"><Plus className="mr-2 h-4 w-4" />New offender</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle className="font-display">Register offender</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); create.mutate(new FormData(e.currentTarget)); }} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-2"><Label>Full name</Label><Input name="full_name" required /></div>
                <div className="space-y-1.5"><Label>Alias</Label><Input name="alias" /></div>
                <div className="space-y-1.5"><Label>National ID</Label><Input name="national_id" /></div>
                <div className="space-y-1.5"><Label>Date of birth</Label><Input name="date_of_birth" type="date" /></div>
                <div className="space-y-1.5">
                  <Label>Gender</Label>
                  <Select name="gender">
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 col-span-2"><Label>Address</Label><Input name="address" /></div>
                <div className="space-y-1.5 col-span-2"><Label>Phone</Label><Input name="phone" /></div>
                <div className="space-y-1.5 col-span-2"><Label>Notes</Label><Textarea name="notes" rows={3} /></div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={create.isPending} className="bg-primary text-primary-foreground hover:bg-secondary">
                  {create.isPending ? "Saving…" : "Add offender"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, alias, ID…" className="pl-9" />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list?.map((o) => (
            <Card key={o.id}>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-muted text-foreground">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium">{o.full_name}</p>
                    {o.alias && <p className="text-xs text-muted-foreground">aka {o.alias}</p>}
                  </div>
                </div>
                <dl className="mt-4 space-y-1 text-xs">
                  <Row k="ID" v={o.national_id} />
                  <Row k="DOB" v={o.date_of_birth} />
                  <Row k="Phone" v={o.phone} />
                  <Row k="Address" v={o.address} />
                </dl>
              </CardContent>
            </Card>
          ))}
          {!list?.length && <p className="text-sm text-muted-foreground">No offenders on file.</p>}
        </div>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v?: string | null }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="truncate text-right">{v || "—"}</dd>
    </div>
  );
}
