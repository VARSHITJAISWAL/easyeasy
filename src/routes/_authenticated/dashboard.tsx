import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SERVICES } from "@/lib/services";
import { ArrowRight, Users, Truck, Wallet, Bell } from "lucide-react";
import { todayISO, monthStartISO } from "@/lib/services";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Dashboard — DailyNeeds" }] }),
});

function Dashboard() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: client } = await supabase.from("clients").select("*").eq("owner_id", user!.id).single();
      if (!client) return null;
      const { data: services } = await supabase.from("client_services").select("*").eq("client_id", client.id);
      const serviceIds = (services ?? []).map((s) => s.id);
      const [subsRes, todayDelivRes, waterReqRes, billsRes] = await Promise.all([
        supabase.from("subscribers").select("id, client_service_id, active").in("client_service_id", serviceIds.length ? serviceIds : ["00000000-0000-0000-0000-000000000000"]),
        supabase.from("deliveries").select("id, client_service_id, status").in("client_service_id", serviceIds.length ? serviceIds : ["00000000-0000-0000-0000-000000000000"]).eq("delivery_date", todayISO()),
        supabase.from("water_requests").select("id, client_service_id, status, created_at, requester_name, address, area, water_type").in("client_service_id", serviceIds.length ? serviceIds : ["00000000-0000-0000-0000-000000000000"]).eq("status", "pending").order("created_at", { ascending: false }),
        supabase.from("bills").select("total_paise, paid_paise, client_service_id").in("client_service_id", serviceIds.length ? serviceIds : ["00000000-0000-0000-0000-000000000000"]).gte("period_month", monthStartISO()),
      ]);
      return {
        client,
        services: services ?? [],
        subscribers: subsRes.data ?? [],
        todayDeliveries: todayDelivRes.data ?? [],
        waterRequests: waterReqRes.data ?? [],
        bills: billsRes.data ?? [],
      };
    },
  });

  if (isLoading || !data) {
    return <div className="text-muted-foreground">Loading dashboard...</div>;
  }

  const totalSubs = data.subscribers.filter((s) => s.active).length;
  const todayDelivered = data.todayDeliveries.filter((d) => d.status === "delivered").length;
  const todayPending = data.todayDeliveries.filter((d) => d.status === "pending").length;
  const monthBilled = data.bills.reduce((sum, b) => sum + (b.total_paise ?? 0), 0);
  const monthPaid = data.bills.reduce((sum, b) => sum + (b.paid_paise ?? 0), 0);
  const platformDue = totalSubs * 2; // 2 paise per active user

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Welcome back, {data.client.owner_name.split(" ")[0]} 👋</h1>
          <p className="text-sm text-muted-foreground">Here's what's happening across your services today.</p>
        </div>
        <Link to="/share"><Button variant="outline" size="sm">Share & invite customers</Button></Link>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={Users} label="Active Subscribers" value={totalSubs} accent="primary" />
        <KpiCard icon={Truck} label="Today's Deliveries" value={`${todayDelivered}/${todayDelivered + todayPending}`} sub={`${todayPending} pending`} accent="info" />
        <KpiCard icon={Wallet} label="This Month Billed" value={formatRupees(monthBilled)} sub={`Paid ${formatRupees(monthPaid)}`} accent="success" />
        <KpiCard icon={Bell} label="Platform Fee" value={`₹${(platformDue / 100).toFixed(2)}`} sub="@ ₹0.02 per active user / mo" accent="warning" />
      </div>

      {/* Live water requests (only if water service exists) */}
      {data.services.some((s) => s.service_type === "water") && (
        <Card className="p-6 shadow-soft">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Live water requests</h2>
              <p className="text-xs text-muted-foreground">New &quot;Need Water&quot; pings from nearby customers</p>
            </div>
            <Badge variant="secondary">{data.waterRequests.length} pending</Badge>
          </div>
          {data.waterRequests.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No active requests. New ones will appear here in real time.
            </div>
          ) : (
            <ul className="divide-y">
              {data.waterRequests.slice(0, 5).map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <div className="font-medium">{r.requester_name}</div>
                    <div className="text-xs text-muted-foreground">{r.area} · {r.water_type}</div>
                  </div>
                  <Badge variant="outline" className="bg-water/10 text-water border-water/30">Pending</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {/* Services */}
      <div>
        <h2 className="mb-3 font-semibold">Your services</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {data.services.map((svc) => {
            const meta = SERVICES[svc.service_type as keyof typeof SERVICES];
            const Icon = meta.icon;
            const subCount = data.subscribers.filter((s) => s.client_service_id === svc.id && s.active).length;
            return (
              <Link key={svc.id} to="/services/$serviceId" params={{ serviceId: svc.id }}>
                <Card className="group flex items-center gap-4 p-5 shadow-soft transition-all hover:shadow-elegant hover:-translate-y-0.5">
                  <div className={`grid h-12 w-12 place-items-center rounded-xl ${meta.bgClass}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">{meta.label}</div>
                    <div className="text-xs text-muted-foreground">Code <span className="font-mono font-semibold text-foreground">{svc.unique_code}</span> · {subCount} subscribers</div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function formatRupees(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function KpiCard({ icon: Icon, label, value, sub, accent }: { icon: typeof Users; label: string; value: string | number; sub?: string; accent: "primary" | "info" | "success" | "warning" }) {
  const accentMap = {
    primary: "bg-primary/10 text-primary",
    info: "bg-info/10 text-info",
    success: "bg-success/10 text-success",
    warning: "bg-warning/15 text-warning",
  } as const;
  return (
    <Card className="p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className={`grid h-8 w-8 place-items-center rounded-lg ${accentMap[accent]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </Card>
  );
}
