import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SERVICES, formatINR, todayISO, monthStartISO } from "@/lib/services";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Check, Plus, X, Clock, IndianRupee } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/services/$serviceId")({
  component: ServiceDetail,
  head: () => ({ meta: [{ title: "Manage service — DailyNeeds" }] }),
});

type Subscriber = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  area: string | null;
  active: boolean;
  settings: Record<string, any>;
};
type Delivery = { id: string; subscriber_id: string; status: "pending" | "delivered" | "skipped" | "missed"; notes: string | null };
type Bill = { id: string; subscriber_id: string; total_paise: number; paid_paise: number; status: "pending" | "partial" | "paid"; period_month: string };

function ServiceDetail() {
  const { serviceId } = Route.useParams();
  const qc = useQueryClient();

  const { data: service } = useQuery({
    queryKey: ["service", serviceId],
    queryFn: async () => {
      const { data, error } = await supabase.from("client_services").select("*").eq("id", serviceId).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: subscribers } = useQuery({
    queryKey: ["subs", serviceId],
    queryFn: async () => {
      const { data, error } = await supabase.from("subscribers").select("*").eq("client_service_id", serviceId).order("name");
      if (error) throw error;
      return (data ?? []) as Subscriber[];
    },
  });

  const { data: todayDeliveries } = useQuery({
    queryKey: ["deliveries", serviceId, todayISO()],
    queryFn: async () => {
      const { data, error } = await supabase.from("deliveries").select("*").eq("client_service_id", serviceId).eq("delivery_date", todayISO());
      if (error) throw error;
      return (data ?? []) as Delivery[];
    },
  });

  const { data: bills } = useQuery({
    queryKey: ["bills", serviceId, monthStartISO()],
    queryFn: async () => {
      const { data, error } = await supabase.from("bills").select("*").eq("client_service_id", serviceId).eq("period_month", monthStartISO());
      if (error) throw error;
      return (data ?? []) as Bill[];
    },
  });

  if (!service) return <div className="text-muted-foreground">Loading...</div>;

  const meta = SERVICES[service.service_type as keyof typeof SERVICES];
  const Icon = meta.icon;

  const markDelivery = async (subscriberId: string, status: Delivery["status"]) => {
    const existing = todayDeliveries?.find((d) => d.subscriber_id === subscriberId);
    if (existing) {
      await supabase.from("deliveries").update({ status }).eq("id", existing.id);
    } else {
      await supabase.from("deliveries").insert({
        subscriber_id: subscriberId,
        client_service_id: serviceId,
        delivery_date: todayISO(),
        status,
      });
    }
    qc.invalidateQueries({ queryKey: ["deliveries", serviceId] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const generateBill = async (sub: Subscriber) => {
    // Count delivered days this month
    const { data: monthDel } = await supabase
      .from("deliveries").select("status").eq("subscriber_id", sub.id)
      .gte("delivery_date", monthStartISO()).lte("delivery_date", todayISO());
    const deliveredDays = (monthDel ?? []).filter((d) => d.status === "delivered").length;
    const dailyPrice = Number(sub.settings?.daily_price_paise ?? 0);
    const total = deliveredDays * dailyPrice;
    const existing = bills?.find((b) => b.subscriber_id === sub.id);
    if (existing) {
      await supabase.from("bills").update({ total_paise: total }).eq("id", existing.id);
    } else {
      await supabase.from("bills").insert({
        subscriber_id: sub.id,
        client_service_id: serviceId,
        period_month: monthStartISO(),
        total_paise: total,
      });
    }
    qc.invalidateQueries({ queryKey: ["bills", serviceId] });
    toast.success(`Bill: ${formatINR(total)} for ${deliveredDays} days`);
  };

  const markPaid = async (bill: Bill) => {
    await supabase.from("bills").update({ paid_paise: bill.total_paise, status: "paid" }).eq("id", bill.id);
    qc.invalidateQueries({ queryKey: ["bills", serviceId] });
  };

  return (
    <div className="space-y-6">
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to dashboard
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`grid h-12 w-12 place-items-center rounded-xl ${meta.bgClass}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{meta.label}</h1>
            <div className="text-sm text-muted-foreground">
              Share code <Badge variant="secondary" className="ml-1 font-mono">{service.unique_code}</Badge>
            </div>
          </div>
        </div>
        <AddSubscriberDialog serviceId={serviceId} />
      </div>

      <Tabs defaultValue="deliveries" className="w-full">
        <TabsList>
          <TabsTrigger value="deliveries">Today's Deliveries</TabsTrigger>
          <TabsTrigger value="subscribers">Subscribers ({subscribers?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        <TabsContent value="deliveries" className="mt-4">
          <Card className="p-0 shadow-soft">
            {(subscribers ?? []).length === 0 ? (
              <EmptyState message="No subscribers yet — add one to start tracking deliveries." />
            ) : (
              <ul className="divide-y">
                {subscribers!.filter((s) => s.active).map((sub) => {
                  const d = todayDeliveries?.find((x) => x.subscriber_id === sub.id);
                  return (
                    <li key={sub.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <div className="font-medium">{sub.name}</div>
                        <div className="text-xs text-muted-foreground">{sub.area} · {sub.phone}</div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <DeliveryBadge status={d?.status ?? "pending"} />
                        <Button size="sm" variant={d?.status === "delivered" ? "default" : "outline"} onClick={() => markDelivery(sub.id, "delivered")}>
                          <Check className="mr-1 h-3.5 w-3.5" /> Delivered
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => markDelivery(sub.id, "skipped")}>
                          <Clock className="mr-1 h-3.5 w-3.5" /> Skip
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => markDelivery(sub.id, "missed")}>
                          <X className="mr-1 h-3.5 w-3.5" /> Missed
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="subscribers" className="mt-4">
          <Card className="p-0 shadow-soft">
            {(subscribers ?? []).length === 0 ? (
              <EmptyState message="No subscribers yet." />
            ) : (
              <ul className="divide-y">
                {subscribers!.map((sub) => (
                  <li key={sub.id} className="flex items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <div className="font-medium">{sub.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {sub.phone} · {sub.address ?? sub.area} · ₹{((sub.settings?.daily_price_paise ?? 0) / 100).toFixed(2)}/day
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {sub.active ? <Badge variant="secondary">Active</Badge> : <Badge variant="outline">Paused</Badge>}
                      <Button size="sm" variant="ghost" onClick={async () => {
                        await supabase.from("subscribers").update({ active: !sub.active }).eq("id", sub.id);
                        qc.invalidateQueries({ queryKey: ["subs", serviceId] });
                      }}>{sub.active ? "Pause" : "Resume"}</Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="mt-4">
          <Card className="p-0 shadow-soft">
            <div className="border-b p-4">
              <h3 className="font-semibold">Billing — {new Date().toLocaleString("en-IN", { month: "long", year: "numeric" })}</h3>
              <p className="text-xs text-muted-foreground">Click <em>Generate</em> to recalculate from delivered days × daily price.</p>
            </div>
            {(subscribers ?? []).length === 0 ? (
              <EmptyState message="Add subscribers first to bill them." />
            ) : (
              <ul className="divide-y">
                {subscribers!.map((sub) => {
                  const bill = bills?.find((b) => b.subscriber_id === sub.id);
                  return (
                    <li key={sub.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                      <div>
                        <div className="font-medium">{sub.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {bill ? `Bill ${formatINR(bill.total_paise)} · paid ${formatINR(bill.paid_paise)}` : "No bill generated yet"}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {bill && <BillBadge status={bill.status} />}
                        <Button size="sm" variant="outline" onClick={() => generateBill(sub)}>
                          <IndianRupee className="mr-1 h-3.5 w-3.5" /> {bill ? "Recalculate" : "Generate"}
                        </Button>
                        {bill && bill.status !== "paid" && (
                          <Button size="sm" onClick={() => markPaid(bill)}>Mark paid</Button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <div className="p-10 text-center text-sm text-muted-foreground">{message}</div>;
}

function DeliveryBadge({ status }: { status: Delivery["status"] }) {
  const map: Record<Delivery["status"], string> = {
    pending: "bg-muted text-muted-foreground",
    delivered: "bg-success/15 text-success",
    skipped: "bg-warning/20 text-warning",
    missed: "bg-destructive/15 text-destructive",
  };
  return <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium capitalize", map[status])}>{status}</span>;
}

function BillBadge({ status }: { status: Bill["status"] }) {
  const map = {
    pending: "bg-warning/20 text-warning",
    partial: "bg-info/15 text-info",
    paid: "bg-success/15 text-success",
  } as const;
  return <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium capitalize", map[status])}>{status}</span>;
}

function AddSubscriberDialog({ serviceId }: { serviceId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [area, setArea] = useState("");
  const [dailyPriceRupees, setDailyPriceRupees] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const daily_price_paise = Math.round((Number(dailyPriceRupees) || 0) * 100);
      const { error } = await supabase.from("subscribers").insert({
        client_service_id: serviceId,
        name, phone, address, area,
        settings: { daily_price_paise },
      });
      if (error) throw error;
      toast.success("Subscriber added");
      setName(""); setPhone(""); setAddress(""); setArea(""); setDailyPriceRupees("");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["subs", serviceId] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" /> Add subscriber</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add a subscriber</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Area</Label><Input value={area} onChange={(e) => setArea(e.target.value)} placeholder="Sector 14" /></div>
          </div>
          <div className="space-y-1.5"><Label>Address</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} /></div>
          <div className="space-y-1.5">
            <Label>Daily price (₹)</Label>
            <Input type="number" step="0.5" min="0" value={dailyPriceRupees} onChange={(e) => setDailyPriceRupees(e.target.value)} placeholder="e.g. 50" />
            <p className="text-xs text-muted-foreground">Used to calculate the monthly bill from delivered days.</p>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={saving || !name}>{saving ? "Saving..." : "Add subscriber"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
