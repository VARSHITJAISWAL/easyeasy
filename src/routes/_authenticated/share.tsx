import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SERVICES } from "@/lib/services";
import { Copy, Share2, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/share")({
  component: SharePage,
  head: () => ({ meta: [{ title: "Share & invite — DailyNeeds" }] }),
});

function SharePage() {
  const { user } = useAuth();
  const [copied, setCopied] = useState<string | null>(null);

  const { data: services } = useQuery({
    queryKey: ["share-services", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: client } = await supabase.from("clients").select("id, business_name").eq("owner_id", user!.id).single();
      if (!client) return null;
      const { data: services } = await supabase.from("client_services").select("*").eq("client_id", client.id);
      return { client, services: services ?? [] };
    },
  });

  const copy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    toast.success("Code copied to clipboard");
    setTimeout(() => setCopied(null), 1500);
  };

  const shareWhatsapp = (code: string, label: string) => {
    const message = encodeURIComponent(
      `Hi! 🌟 We're now on DailyNeeds — get your daily ${label} updates, billing & delivery alerts in one app.\n\nDownload DailyNeeds and enter our code: *${code}* during signup to get FREE access for life.\n\nThanks!`
    );
    window.open(`https://wa.me/?text=${message}`, "_blank");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Share & grow</h1>
        <p className="text-sm text-muted-foreground">When customers sign up using your code, they get the app FREE for life — and join your service automatically.</p>
      </div>

      <Card className="border-primary/20 bg-gradient-card p-6 shadow-soft">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <Share2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold">Your unique service codes</h2>
            <p className="mt-1 text-sm text-muted-foreground">Send these to your existing customers. One tap to copy or share via WhatsApp.</p>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {(services?.services ?? []).map((svc) => {
          const meta = SERVICES[svc.service_type as keyof typeof SERVICES];
          const Icon = meta.icon;
          return (
            <Card key={svc.id} className="p-6 shadow-soft">
              <div className="flex items-center gap-3">
                <div className={`grid h-12 w-12 place-items-center rounded-xl ${meta.bgClass}`}><Icon className="h-6 w-6" /></div>
                <div>
                  <div className="font-semibold">{meta.label}</div>
                  <Badge variant="outline" className="mt-1">{meta.shortLabel}</Badge>
                </div>
              </div>
              <div className="mt-5 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-5 text-center">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Your code</div>
                <div className="mt-1 font-mono text-3xl font-bold text-primary">{svc.unique_code}</div>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <Button variant="outline" onClick={() => copy(svc.unique_code)}>
                  {copied === svc.unique_code ? <Check className="mr-1 h-4 w-4" /> : <Copy className="mr-1 h-4 w-4" />}
                  {copied === svc.unique_code ? "Copied" : "Copy code"}
                </Button>
                <Button onClick={() => shareWhatsapp(svc.unique_code, meta.shortLabel.toLowerCase())}>
                  <Share2 className="mr-1 h-4 w-4" /> Share on WhatsApp
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
