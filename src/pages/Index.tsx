import { Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  GraduationCap,
  Shield,
  Users,
  FileCheck,
  BarChart3,
  Bot,
  MessageSquare,
  Calendar,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

const features = [
  {
    icon: Users,
    title: "Student Information",
    desc: "Centralized student records, classes, and profiles.",
  },
  {
    icon: Shield,
    title: "Discipline Tracking",
    desc: "Report incidents, manage marks, and grant permissions.",
  },
  {
    icon: BarChart3,
    title: "Live Analytics",
    desc: "Trends and reports for leadership decisions.",
  },
  {
    icon: Bot,
    title: "AI Assistant",
    desc: "Role-aware agent that takes actions on your behalf.",
  },
  {
    icon: MessageSquare,
    title: "Real-time Chat",
    desc: "Direct and group conversations across staff.",
  },
  {
    icon: Calendar,
    title: "Events Calendar",
    desc: "School-wide events organized by the Principal.",
  },
];

const roles = [
  {
    name: "Principal",
    duties: "Approve accounts, manage events, view analytics.",
  },
  {
    name: "Director of Studies",
    duties: "Manage students, classes, and academic data.",
  },
  {
    name: "Dean of Discipline",
    duties: "Review incidents, grant permissions, adjust marks.",
  },
  {
    name: "Teacher / Discipline Staff",
    duties: "Report incidents and follow up on students.",
  },
];

const Landing = () => {
  useDocumentTitle("Welcome");
  const navigate = useNavigate();
  const { session, isLoading } = useAuth();

  useEffect(() => {
    // If already signed in, send to dashboard
    if (!isLoading && session) navigate("/dashboard", { replace: true });
  }, [isLoading, session, navigate]);

  return (
    <div className="min-h-screen bg-transparent">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shrink-0 shadow-[var(--shadow-glow)]">
              <GraduationCap className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <p className="font-brand text-base sm:text-lg leading-tight truncate">
                Ecole des Sciences
              </p>

              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                Byimana — SDMS
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/auth">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="sm" className="gap-1 rounded-full">
                Get started <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero — midnight band */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 bg-dot-grid opacity-[0.35]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -top-40 left-1/2 h-[420px] w-[820px] -translate-x-1/2 rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle, hsl(190 90% 55% / 0.28), transparent 65%)",
          }}
          aria-hidden
        />
        {/* Indicator card */}
        <div
          className="pointer-events-none absolute right-6 top-24 hidden w-52 rounded-2xl border border-white/10 bg-[hsl(215_40%_16%/0.75)] p-4 backdrop-blur lg:block"
          aria-hidden
        >
          {[
            { c: "hsl(45 93% 58%)", w: "w-24" },
            { c: "hsl(199 89% 62%)", w: "w-32" },
            { c: "hsl(158 64% 60%)", w: "w-20" },
          ].map((r) => (
            <div key={r.c} className="flex items-center gap-3 py-2">
              <div className={`h-px flex-1 bg-white/15 ${r.w}`} />
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: r.c, boxShadow: `0 0 12px ${r.c}` }}
              />
            </div>
          ))}
        </div>

        <div className="container relative mx-auto px-4 pt-16 pb-20 sm:pt-24 sm:pb-28 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/15 bg-white/5 text-foreground/80 text-xs font-medium mb-6 backdrop-blur">
            <CheckCircle2 className="w-3.5 h-3.5" /> Built for Ecole des
            Sciences Byimana
          </div>
          <h1 className="font-display text-4xl sm:text-6xl font-bold max-w-3xl mx-auto leading-[1.05] text-foreground">
            School discipline,
            <span className="block bg-gradient-to-r from-foreground via-[hsl(252_83%_82%)] to-[hsl(160_84%_60%)] bg-clip-text text-transparent">
              managed intelligently.
            </span>
          </h1>
          <p className="mt-5 text-base sm:text-lg text-foreground/65 max-w-2xl mx-auto px-2">
            One secure platform for staff and leadership to record incidents,
            manage permissions, and act faster — assisted by a role-aware AI
            agent.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/auth">
              <Button
                size="lg"
                className="w-full sm:w-auto gap-2 rounded-full px-7 shadow-[var(--shadow-glow)]"
              >
                Create your account <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/auth">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto rounded-full px-7 border-white/20 bg-white/5 text-foreground hover:bg-white/10 hover:text-foreground"
              >
                I already have an account
              </Button>
            </Link>
          </div>
          <p className="mt-5 text-xs text-foreground/45">
            New accounts require Principal approval before access.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-14 sm:py-20">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-primary mb-3">
          Capabilities
        </p>
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-center mb-8 sm:mb-12">
          What you can do
        </h2>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <Card
                key={f.title}
                className="group rounded-2xl border-border/70 hover-lift"
              >
                <CardContent className="p-6">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4 transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-display font-semibold mb-1.5">
                    {f.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {f.desc}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Roles */}
      <section className="border-y border-border/70 bg-muted/40">
        <div className="container mx-auto px-4 py-14 sm:py-20">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-center mb-2">
            Roles in the system
          </h2>
          <p className="text-center text-sm text-muted-foreground mb-10">
            Every account is approved and assigned a role by the Principal.
          </p>
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 max-w-3xl mx-auto">
            {roles.map((r) => (
              <div
                key={r.name}
                className="flex items-start gap-3 p-5 rounded-2xl border border-border/70 bg-card shadow-[var(--shadow-xs)] hover-lift"
              >
                <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <FileCheck className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-display font-semibold text-sm">{r.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {r.duties}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-14 sm:py-20">
        <div className="relative overflow-hidden rounded-3xl bg-midnight px-6 py-14 text-center">
          <div
            className="absolute inset-0 bg-dot-grid opacity-30"
            aria-hidden
          />
          <div className="relative">
            <h2 className="font-display text-2xl sm:text-3xl font-bold mb-3 text-foreground">
              Ready to begin?
            </h2>
            <p className="text-sm text-foreground/60 mb-7 max-w-md mx-auto">
              Sign up in under a minute. The Principal will be notified to
              review your request.
            </p>
            <Link to="/auth">
              <Button
                size="lg"
                className="gap-2 rounded-full px-7 shadow-[var(--shadow-glow)]"
              >
                Create an account <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/70 py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Ecole des Sciences Byimana — SDMS
      </footer>
    </div>
  );
};

export default Landing;
