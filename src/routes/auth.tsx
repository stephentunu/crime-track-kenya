import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shield } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  ssr: false,
  component: AuthPage,
  head: () => ({ meta: [{ title: "Sign in · Kenya Police CMS" }] }),
});

const signInSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(6, "At least 6 characters"),
});
const signUpSchema = signInSchema.extend({
  full_name: z.string().trim().min(2, "Required").max(120),
  badge_number: z.string().trim().max(40).optional(),
  rank: z.string().trim().max(60).optional(),
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  async function handleSignIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = signInSchema.safeParse({ email: fd.get("email"), password: fd.get("password") });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Signed in");
    navigate({ to: "/dashboard" });
  }

  async function handleSignUp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = signUpSchema.safeParse({
      email: fd.get("email"),
      password: fd.get("password"),
      full_name: fd.get("full_name"),
      badge_number: fd.get("badge_number") || undefined,
      rank: fd.get("rank") || undefined,
    });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: parsed.data.full_name,
          badge_number: parsed.data.badge_number,
          rank: parsed.data.rank,
        },
      },
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Account created. You can sign in.");
  }

  async function handleGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) { toast.error("Google sign-in failed"); return; }
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left brand panel */}
      <div className="crest-gradient relative hidden flex-col justify-between p-12 text-primary-foreground lg:flex">
        <Link to="/" className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-gold text-gold-foreground">
            <Shield className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <p className="font-display text-base font-semibold">Kenya Police</p>
            <p className="text-xs text-primary-foreground/70">Crime Management System</p>
          </div>
        </Link>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-gold">Restricted access</p>
          <h2 className="mt-3 font-display text-3xl font-bold">Authorised officers only.</h2>
          <p className="mt-3 max-w-md text-primary-foreground/80">
            All activity is logged. Misuse of this system is an offence under the
            Computer Misuse and Cybercrimes Act, 2018.
          </p>
        </div>
        <p className="text-xs text-primary-foreground/60">© Kenya Police Service</p>
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center bg-background p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Link to="/" className="flex items-center gap-2 text-primary">
              <Shield className="h-5 w-5" /> <span className="font-display font-semibold">Kenya Police CMS</span>
            </Link>
          </div>
          <h1 className="font-display text-2xl font-bold">Officer access</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to your station account.</p>

          <Tabs defaultValue="signin" className="mt-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4 pt-4">
                <Field label="Email" name="email" type="email" required />
                <Field label="Password" name="password" type="password" required />
                <Button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground hover:bg-secondary">
                  {loading ? "Signing in…" : "Sign in"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4 pt-4">
                <Field label="Full name" name="full_name" required />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Badge number" name="badge_number" />
                  <Field label="Rank" name="rank" placeholder="e.g. Constable" />
                </div>
                <Field label="Work email" name="email" type="email" required />
                <Field label="Password" name="password" type="password" required />
                <Button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground hover:bg-secondary">
                  {loading ? "Creating…" : "Create officer account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
          </div>
          <Button onClick={handleGoogle} variant="outline" className="w-full">
            Continue with Google
          </Button>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            New accounts are issued the <span className="font-medium text-foreground">Officer</span> role. Admins
            can elevate roles from the dashboard.
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={props.name}>{label}</Label>
      <Input id={props.name} {...props} />
    </div>
  );
}
