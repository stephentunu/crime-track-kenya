import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, FileText, Users, Briefcase, BarChart3, LogOut, Shield, Menu } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/ob", label: "Occurrence Book", icon: FileText },
  { to: "/cases", label: "Cases", icon: Briefcase },
  { to: "/offenders", label: "Offenders", icon: Users },
  { to: "/reports", label: "Reports", icon: BarChart3 },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { data } = useCurrentUser();
  const [open, setOpen] = useState(false);

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-sidebar text-sidebar-foreground transition-transform lg:static lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full",
      )}>
        <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-5">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-gold text-gold-foreground">
            <Shield className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <p className="font-display text-base font-semibold">Kenya Police</p>
            <p className="text-[11px] uppercase tracking-wider text-sidebar-foreground/60">CMS</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV.map((item) => {
            const active = pathname === item.to || pathname.startsWith(item.to + "/");
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground border-l-2 border-gold"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-4">
          <div className="mb-3">
            <p className="truncate text-sm font-medium">{data?.profile?.full_name ?? data?.user.email}</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {data?.roles.map((r) => (
                <Badge key={r} variant="outline" className="border-gold/40 bg-transparent text-[10px] uppercase tracking-wider text-gold">
                  {r}
                </Badge>
              ))}
            </div>
          </div>
          <Button onClick={signOut} variant="outline" size="sm" className="w-full border-sidebar-border bg-transparent text-sidebar-foreground hover:bg-sidebar-accent">
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>

      {open && <div onClick={() => setOpen(false)} className="fixed inset-0 z-30 bg-black/40 lg:hidden" />}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-3 border-b border-border bg-card px-4 lg:px-8">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {NAV.find((n) => pathname.startsWith(n.to))?.label ?? "Dashboard"}
          </div>
          <div className="ml-auto text-xs text-muted-foreground">
            {data?.profile?.stations?.name ?? "Unassigned station"}
          </div>
        </header>
        <main className="flex-1 overflow-auto px-4 py-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
