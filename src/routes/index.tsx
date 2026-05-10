import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SERVICE_LIST } from "@/lib/services";
import { ArrowRight, CheckCircle2, IndianRupee, Share2, Sparkles, TrendingUp, Users } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "DailyNeeds — Run your daily delivery business digitally" },
      { name: "description", content: "All-in-one app for water, milk, tiffin and newspaper suppliers. Manage subscribers, deliveries, billing and grow your customer base — at just 2 paise per user per month." },
    ],
  }),
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-hero shadow-glow">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight">DailyNeeds</span>
            <Badge variant="secondary" className="ml-1 hidden sm:inline-flex">for Suppliers</Badge>
          </Link>
          <nav className="flex items-center gap-2">
            <Link to="/auth"><Button variant="ghost" size="sm">Sign in</Button></Link>
            <Link to="/auth" search={{ mode: "signup" } as never}>
              <Button size="sm" className="shadow-soft">Get started</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background" />
        <div className="container relative mx-auto px-4 pb-20 pt-16 sm:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-5 gap-1.5">
              <Sparkles className="h-3.5 w-3.5" /> Built for local service providers
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
              Replace pen-and-paper with a{" "}
              <span className="bg-gradient-hero bg-clip-text text-transparent">delivery business</span> in your pocket
            </h1>
            <p className="mt-5 text-lg text-muted-foreground sm:text-xl">
              Manage subscribers, daily deliveries, billing and customer alerts for your water, milk, tiffin or newspaper business — all in one app.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/auth" search={{ mode: "signup" } as never}>
                <Button size="lg" className="shadow-elegant">
                  Register your business <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="lg" variant="outline">I already have an account</Button>
              </Link>
            </div>
            <p className="mt-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <IndianRupee className="h-4 w-4" /> Just <span className="font-semibold text-foreground">2 paise per active user / month</span> — that's ₹10 for 500 customers.
            </p>
          </div>

          {/* Service cards */}
          <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SERVICE_LIST.map((s) => {
              const Icon = s.icon;
              return (
                <Card key={s.type} className="group relative overflow-hidden border-border/60 bg-gradient-card p-6 shadow-soft transition-all hover:shadow-elegant hover:-translate-y-1">
                  <div className={`mb-4 grid h-12 w-12 place-items-center rounded-xl ${s.bgClass}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-semibold text-foreground">{s.label}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Why */}
      <section className="border-t bg-secondary/40 py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">Everything you used to track in a notebook — now automatic</h2>
            <p className="mt-3 text-muted-foreground">Designed for water, milk, tiffin and newspaper suppliers from day one.</p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              { icon: Users, title: "Subscriber CRM", desc: "Add subscribers, set quantities, slots, addresses. Filter by area to plan zone-wise routes." },
              { icon: CheckCircle2, title: "One-tap daily deliveries", desc: "Mark each subscriber Delivered / Skipped / Missed. Bills auto-adjust at month end." },
              { icon: IndianRupee, title: "Auto monthly billing", desc: "Quantity × price × delivery days. Track Paid, Partial and Pending against every customer." },
              { icon: Share2, title: "Your unique share code", desc: "Share your code (e.g. WS-4821) on WhatsApp — your existing customers join, free for life." },
              { icon: TrendingUp, title: "Live water requests", desc: "Customers tap “Need Water” — you get it instantly with name, area and distance." },
              { icon: Sparkles, title: "Worker absence alerts", desc: "Newspaper agents inform every subscriber on a route at once when delivery is delayed." },
            ].map((f) => {
              const Icon = f.icon;
              return (
                <Card key={f.title} className="border-border/60 p-6 shadow-soft">
                  <div className="mb-3 grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold">{f.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <Card className="mx-auto max-w-3xl overflow-hidden border-primary/20 bg-gradient-card p-10 shadow-elegant">
            <div className="text-center">
              <Badge className="mb-4">Pricing</Badge>
              <h2 className="text-3xl font-bold sm:text-4xl">Pay as you grow — literally</h2>
              <p className="mt-3 text-muted-foreground">No setup fees. No per-feature locks. Just a tiny per-user platform fee.</p>
              <div className="mt-8 flex items-baseline justify-center gap-2">
                <span className="text-6xl font-bold text-primary">₹0.02</span>
                <span className="text-muted-foreground">/ active user / month</span>
              </div>
              <div className="mt-6 grid gap-3 text-left sm:grid-cols-2">
                {[
                  "Unlimited subscribers across all 4 services",
                  "Daily delivery & billing tools",
                  "Unique share code with free user onboarding",
                  "Real-time water request notifications",
                ].map((b) => (
                  <div key={b} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                    <span className="text-sm">{b}</span>
                  </div>
                ))}
              </div>
              <Link to="/auth" search={{ mode: "signup" } as never}>
                <Button size="lg" className="mt-8 shadow-elegant">
                  Start free — register your business <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </section>

      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} DailyNeeds. Empowering local service providers.
        </div>
      </footer>
    </div>
  );
}
