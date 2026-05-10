import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, ArrowRight, Check } from "lucide-react";
import { SERVICE_LIST, type ServiceType } from "@/lib/services";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: Onboarding,
  head: () => ({ meta: [{ title: "Set up your business — DailyNeeds" }] }),
});

function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<1 | 2>(1);
  const [businessName, setBusinessName] = useState("");
  const [ownerName, setOwnerName] = useState(user?.user_metadata?.full_name ?? "");
  const [phone, setPhone] = useState(user?.user_metadata?.phone ?? "");
  const [areas, setAreas] = useState("");
  const [selected, setSelected] = useState<Set<ServiceType>>(new Set());
  const [saving, setSaving] = useState(false);

  const toggle = (t: ServiceType) => {
    const next = new Set(selected);
    if (next.has(t)) next.delete(t); else next.add(t);
    setSelected(next);
  };

  const handleFinish = async () => {
    if (!user) return;
    if (selected.size === 0) {
      toast.error("Pick at least one service");
      return;
    }
    setSaving(true);
    try {
      const { data: client, error: cErr } = await supabase.from("clients").insert({
        owner_id: user.id,
        business_name: businessName,
        owner_name: ownerName,
        phone,
        email: user.email,
      }).select().single();
      if (cErr) throw cErr;

      const areaList = areas.split(",").map((a) => a.trim()).filter(Boolean);
      const services = await Promise.all(
        Array.from(selected).map(async (svc) => {
          const { data: code, error: codeErr } = await supabase.rpc("generate_service_code" as any, { svc });
          // RPC may be revoked from authenticated; fallback
          let unique_code = code as string | null;
          if (codeErr || !unique_code) {
            const prefix = SERVICE_LIST.find((s) => s.type === svc)!.prefix;
            unique_code = `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
          }
          return { client_id: client.id, service_type: svc, unique_code, areas: areaList };
        })
      );
      const { error: sErr } = await supabase.from("client_services").insert(services);
      if (sErr) throw sErr;

      await queryClient.invalidateQueries({ queryKey: ["my-clients"] });
      toast.success("Business set up! Welcome to DailyNeeds.");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Setup failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background">
      <div className="container mx-auto max-w-2xl px-4 py-12">
        <div className="mb-8 flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-hero shadow-glow">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-bold">DailyNeeds</span>
        </div>

        <Card className="overflow-hidden p-8 shadow-elegant">
          <div className="mb-6 flex items-center gap-2 text-sm">
            <span className={cn("rounded-full px-3 py-1", step === 1 ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground")}>Step 1 — Business</span>
            <span className="text-muted-foreground">→</span>
            <span className={cn("rounded-full px-3 py-1", step === 2 ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground")}>Step 2 — Services</span>
          </div>

          {step === 1 ? (
            <div className="space-y-4">
              <h1 className="text-2xl font-bold">Tell us about your business</h1>
              <p className="text-sm text-muted-foreground">This is what your customers will see.</p>
              <div className="space-y-1.5">
                <Label htmlFor="biz">Business Name</Label>
                <Input id="biz" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="e.g. Sharma RO Water Supply" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="owner">Owner Name</Label>
                  <Input id="owner" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ph">Phone</Label>
                  <Input id="ph" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="areas">Delivery Areas (comma separated)</Label>
                <Input id="areas" value={areas} onChange={(e) => setAreas(e.target.value)} placeholder="Sector 14, Civil Lines, 110001" />
              </div>
              <Button
                className="mt-2 w-full"
                onClick={() => setStep(2)}
                disabled={!businessName || !ownerName || !phone}
              >
                Continue <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <h1 className="text-2xl font-bold">Which services do you offer?</h1>
              <p className="text-sm text-muted-foreground">Pick one or more — you can add more later.</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {SERVICE_LIST.map((s) => {
                  const Icon = s.icon;
                  const isSel = selected.has(s.type);
                  return (
                    <button
                      type="button"
                      key={s.type}
                      onClick={() => toggle(s.type)}
                      className={cn(
                        "relative rounded-xl border-2 p-4 text-left transition-all",
                        isSel ? "border-primary bg-primary/5 shadow-soft" : "border-border hover:border-primary/40"
                      )}
                    >
                      <div className={cn("mb-3 grid h-10 w-10 place-items-center rounded-lg", s.bgClass)}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="font-semibold">{s.label}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{s.description}</div>
                      {isSel && (
                        <div className="absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full bg-primary text-primary-foreground">
                          <Check className="h-3.5 w-3.5" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                <Button className="flex-1" onClick={handleFinish} disabled={saving || selected.size === 0}>
                  {saving ? "Setting up..." : "Finish setup"}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
