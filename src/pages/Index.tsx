import { Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  GraduationCap, Shield, Users, FileCheck, BarChart3, Bot,
  MessageSquare, Calendar, ArrowRight, CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

const features = [
  { icon: Users, title: "Student Information", desc: "Centralized student records, classes, and profiles." },
  { icon: Shield, title: "Discipline Tracking", desc: "Report incidents, manage marks, and grant permissions." },
  { icon: BarChart3, title: "Live Analytics", desc: "Trends and reports for leadership decisions." },
  { icon: Bot, title: "AI Assistant", desc: "Role-aware agent that takes actions on your behalf." },
  { icon: MessageSquare, title: "Real-time Chat", desc: "Direct and group conversations across staff." },
  { icon: Calendar, title: "Events Calendar", desc: "School-wide events organized by the Principal." },
];

const roles = [
  { name: "Principal", duties: "Approve accounts, manage events, view analytics." },
  { name: "Director of Studies", duties: "Manage students, classes, and academic data." },
  { name: "Dean of Discipline", duties: "Review incidents, grant permissions, adjust marks." },
  { name: "Teacher / Discipline Staff", duties: "Report incidents and follow up on students." },
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
    <div className="min-h-screen bg-hero-glow">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="container mx-auto flex h-14 sm:h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm sm:text-base leading-tight truncate">Ecole des Sciences</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Byimana — SDMS</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/auth"><Button variant="ghost" size="sm">Sign in</Button></Link>
            <Link to="/auth"><Button size="sm" className="gap-1">Get started <ArrowRight className="w-4 h-4" /></Button></Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 pt-12 pb-10 sm:pt-20 sm:pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-5">
          <CheckCircle2 className="w-3.5 h-3.5" /> Built for Ecole des Sciences Byimana
        </div>
        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight max-w-3xl mx-auto leading-tight">
          School Discipline Management, simplified.
        </h1>
        <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto px-2">
          A single secure platform for students, staff and leadership to record incidents,
          manage permissions, and act faster — assisted by an AI agent.
        </p>
        <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/auth"><Button size="lg" className="w-full sm:w-auto gap-2">Create your account <ArrowRight className="w-4 h-4" /></Button></Link>
          <Link to="/auth"><Button size="lg" variant="outline" className="w-full sm:w-auto">I already have an account</Button></Link>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">New accounts require Principal approval before access.</p>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 pb-12 sm:pb-16">
        <h2 className="text-xl sm:text-2xl font-bold text-center mb-6 sm:mb-10">What you can do</h2>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(f => {
            const Icon = f.icon;
            return (
              <Card key={f.title} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold mb-1">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Roles */}
      <section className="bg-card border-y">
        <div className="container mx-auto px-4 py-12 sm:py-16">
          <h2 className="text-xl sm:text-2xl font-bold text-center mb-2">Roles in the system</h2>
          <p className="text-center text-sm text-muted-foreground mb-8">Every account is approved and assigned a role by the Principal.</p>
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 max-w-3xl mx-auto">
            {roles.map(r => (
              <div key={r.name} className="flex items-start gap-3 p-4 rounded-lg border bg-background">
                <FileCheck className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-sm">{r.name}</p>
                  <p className="text-xs text-muted-foreground">{r.duties}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-12 sm:py-16 text-center">
        <h2 className="text-xl sm:text-2xl font-bold mb-3">Ready to begin?</h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
          Sign up in under a minute. The Principal will be notified to review your request.
        </p>
        <Link to="/auth"><Button size="lg" className="gap-2">Create an account <ArrowRight className="w-4 h-4" /></Button></Link>
      </section>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Ecole des Sciences Byimana — SDMS
      </footer>
    </div>
  );
};

export default Landing;
