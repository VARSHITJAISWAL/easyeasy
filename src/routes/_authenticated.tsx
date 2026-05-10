import { createFileRoute, Outlet, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Sparkles, LayoutDashboard, Users, Share2, LogOut, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated")({
  component: AuthLayout,
});

function AuthLayout() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  // Redirect to onboarding if user has no client business
  const { data: clients, isLoading: clientsLoading } = useQuery({
    queryKey: ["my-clients", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("id, business_name").eq("owner_id", user!.id);
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!clientsLoading && clients && clients.length === 0 && pathname !== "/onboarding") {
      navigate({ to: "/onboarding" });
    }
  }, [clientsLoading, clients, pathname, navigate]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading...</div>
    );
  }

  // Onboarding gets a clean layout
  if (pathname === "/onboarding") {
    return <Outlet />;
  }

  const navItems = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/subscribers", label: "Subscribers", icon: Users },
    { to: "/share", label: "Share & Grow", icon: Share2 },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center gap-4 px-4">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-hero shadow-glow">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold">DailyNeeds</span>
          </Link>
          {clients && clients.length > 0 && (
            <Badge variant="secondary" className="hidden sm:inline-flex">{clients[0].business_name}</Badge>
          )}
          <nav className="ml-auto hidden items-center gap-1 md:flex">
            {navItems.map((n) => {
              const Icon = n.icon;
              const active = pathname === n.to || (n.to !== "/dashboard" && pathname.startsWith(n.to));
              return (
                <Link key={n.to} to={n.to as any}>
                  <Button variant={active ? "secondary" : "ghost"} size="sm" className="gap-2">
                    <Icon className="h-4 w-4" /> {n.label}
                  </Button>
                </Link>
              );
            })}
          </nav>
          <Button variant="ghost" size="icon" className="ml-auto md:ml-0" aria-label="Notifications">
            <Bell className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => signOut()} className="gap-2">
            <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
        {/* mobile nav */}
        <nav className="container mx-auto flex gap-1 overflow-x-auto px-4 pb-2 md:hidden">
          {navItems.map((n) => {
            const active = pathname === n.to || (n.to !== "/dashboard" && pathname.startsWith(n.to));
            return (
              <Link key={n.to} to={n.to as any} className={cn("rounded-md px-3 py-1.5 text-sm font-medium", active ? "bg-secondary text-secondary-foreground" : "text-muted-foreground")}>
                {n.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="container mx-auto flex-1 px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
