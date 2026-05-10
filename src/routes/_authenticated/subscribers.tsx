import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SERVICES } from "@/lib/services";
import { useState } from "react";
import { Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/subscribers")({
  component: SubscribersPage,
  head: () => ({ meta: [{ title: "Subscribers — DailyNeeds" }] }),
});

function SubscribersPage() {
  const { user } = useAuth();
  const [q, setQ] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["all-subs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: client } = await supabase.from("clients").select("id").eq("owner_id", user!.id).single();
      if (!client) return [];
      const { data: services } = await supabase.from("client_services").select("id, service_type, unique_code").eq("client_id", client.id);
      const ids = (services ?? []).map((s) => s.id);
      if (ids.length === 0) return [];
      const { data: subs } = await supabase.from("subscribers").select("*").in("client_service_id", ids).order("name");
      return (subs ?? []).map((s) => ({
        ...s,
        service: services!.find((sv) => sv.id === s.client_service_id),
      }));
    },
  });

  const filtered = (data ?? []).filter((s) =>
    !q || s.name.toLowerCase().includes(q.toLowerCase()) || (s.area ?? "").toLowerCase().includes(q.toLowerCase()) || (s.phone ?? "").includes(q)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">All subscribers</h1>
        <p className="text-sm text-muted-foreground">Combined view across every service you run.</p>
      </div>
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, area, phone" className="pl-9" />
      </div>
      <Card className="p-0 shadow-soft">
        {isLoading ? (
          <div className="p-10 text-center text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">No subscribers found.</div>
        ) : (
          <ul className="divide-y">
            {filtered.map((sub) => {
              const meta = sub.service ? SERVICES[sub.service.service_type as keyof typeof SERVICES] : null;
              const Icon = meta?.icon;
              return (
                <li key={sub.id} className="flex items-center justify-between gap-3 p-4">
                  <div className="flex items-center gap-3 min-w-0">
                    {meta && Icon && (
                      <Link to="/services/$serviceId" params={{ serviceId: sub.client_service_id }}>
                        <div className={`grid h-10 w-10 place-items-center rounded-lg ${meta.bgClass}`}><Icon className="h-5 w-5" /></div>
                      </Link>
                    )}
                    <div className="min-w-0">
                      <div className="font-medium">{sub.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{sub.phone} · {sub.area} · {sub.address}</div>
                    </div>
                  </div>
                  {meta && <Badge variant="secondary">{meta.shortLabel}</Badge>}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
