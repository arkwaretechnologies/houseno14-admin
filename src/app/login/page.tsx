"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthStore } from "@/store";
import { DEMO_BRANCH, DEMO_STAFF } from "@/lib/demo-data";
import { setDemoCookie, clearDemoCookie } from "@/lib/demo-mode";
import type { StaffRole } from "@/lib/constants";
import { APP_DESCRIPTION, ROLE_LABELS } from "@/lib/constants";
import { BrandMark } from "@/components/shared/brand-mark";

const DEMO_ROLES: StaffRole[] = [
  "super_admin",
  "manager",
  "cashier",
  "receptionist",
  "coach",
];

export default function LoginPage() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("demo1234");
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<StaffRole>("super_admin");

  const enterDemo = async (selectedRole: StaffRole = role) => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 500));
    setDemoCookie();
    setSession({
      staff: { ...DEMO_STAFF, role: selectedRole },
      branch: DEMO_BRANCH,
      isDemoMode: true,
    });
    toast.success(`Signed in as ${ROLE_LABELS[selectedRole]}`);
    router.push("/dashboard");
    setLoading(false);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key || url.includes("your-project")) {
      await enterDemo(role);
      return;
    }

    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*, branch:branches(*)")
        .eq("id", data.user.id)
        .single();

      if (profileError || !profile) {
        throw new Error("No staff profile found for this account");
      }

      if (profile.role !== "staff" && profile.role !== "admin") {
        throw new Error("This account is not authorized for the admin dashboard");
      }

      // Prefer fine-grained admin_role (additive migration); fall back from user_role
      const profileRecord = profile as typeof profile & {
        admin_role?: StaffRole | null;
        status?: string | null;
        last_login_at?: string | null;
      };

      const mappedRole: StaffRole =
        profileRecord.admin_role ??
        (profile.role === "admin" ? "super_admin" : "receptionist");

      const branchRow = Array.isArray(profile.branch)
        ? profile.branch[0]
        : profile.branch;

      const mappedBranch = branchRow
        ? {
            id: branchRow.id,
            name: branchRow.name,
            code: branchRow.slug,
            address: null,
            phone: null,
            email: null,
            timezone: branchRow.timezone,
            is_active: true,
            created_at: branchRow.created_at,
            updated_at: branchRow.created_at,
          }
        : null;

      setSession({
        staff: {
          id: profile.id,
          auth_user_id: profile.id,
          branch_id: profile.branch_id,
          email: data.user.email ?? "",
          full_name: profile.full_name ?? "Staff",
          role: mappedRole,
          avatar_url: profile.avatar_url,
          phone: profile.phone,
          is_active: (profileRecord.status ?? "active") === "active",
          last_login_at: profileRecord.last_login_at ?? null,
          created_at: profile.created_at,
          updated_at: profile.updated_at,
          branch: mappedBranch,
        },
        branch: mappedBranch,
        isDemoMode: false,
      });

      clearDemoCookie();
      toast.success("Welcome back");
      router.push("/dashboard");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      toast.error(message);
      toast.message("Tip", {
        description: "If you can’t sign in, try a sample club below, or contact your club administrator.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-app relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-primary/25 blur-3xl"
        animate={{ y: [0, 24, 0], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -right-16 bottom-10 h-80 w-80 rounded-full bg-emerald-400/20 blur-3xl"
        animate={{ y: [0, -20, 0], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md"
      >
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex justify-center">
            <BrandMark size="md" className="shadow-xl shadow-primary/30" />
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
            <BrandMark variant="wordmark" wordmarkClassName="text-3xl" />
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Admin Dashboard · {APP_DESCRIPTION}
          </p>
        </div>

        <Card className="border-white/30 shadow-2xl shadow-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Staff Sign In
            </CardTitle>
            <CardDescription>
              Role-based access for Super Admin, Manager, Cashier, Receptionist, and Coach.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login">
              <TabsList className="mb-4 w-full">
                <TabsTrigger value="login" className="flex-1">
                  Login
                </TabsTrigger>
                <TabsTrigger value="demo" className="flex-1">
                  Demo Mode
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={onSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@email.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? <Loader2 className="animate-spin" /> : null}
                    Sign in
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="demo" className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Explore the full admin experience with sample club data. Choose a role to preview permissions.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {DEMO_ROLES.map((r) => (
                    <Button
                      key={r}
                      type="button"
                      variant={role === r ? "default" : "outline"}
                      onClick={() => setRole(r)}
                      className="justify-start"
                    >
                      {ROLE_LABELS[r]}
                    </Button>
                  ))}
                </div>
                <Button
                  className="w-full"
                  disabled={loading}
                  onClick={() => enterDemo(role)}
                >
                  {loading ? <Loader2 className="animate-spin" /> : null}
                  Enter as {ROLE_LABELS[role]}
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
