import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Clock, LogOut, RefreshCw, GraduationCap, Shield, Users,
  FileCheck, BarChart3, Bot, MessageSquare, Calendar, CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

const tour = [
  { icon: Users, title: "Student Information", desc: "Browse classes and individual student profiles once approved." },
  { icon: Shield, title: "Incidents & Discipline", desc: "Report and review discipline incidents with full audit trail." },
  { icon: FileCheck, title: "Permissions", desc: "Late entry, leave, and other student permissions tracked with expiry." },
  { icon: BarChart3, title: "Analytics", desc: "Trends across classes, gender, and severity — for leadership only." },
  { icon: MessageSquare, title: "Real-time Chat", desc: "Direct and group conversations among approved staff." },
  { icon: Calendar, title: "Events", desc: "School-wide events scheduled by the Principal." },
  { icon: Bot, title: "AI Assistant", desc: "A role-aware agent that takes actions for you — appears after approval." },
];

const Pending = () => {
  useDocumentTitle("Account Pending Approval");
  const navigate = useNavigate();
  const { user, profile, isLoading } = useAuth();
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [isLoading, user, navigate]);

  const refresh = async () => {
    if (!user) return;
    setChecking(true);
    try {
      const { data, error } = await supabase
        .from("profiles").select("status").eq("id", user.id).single();
      if (error) throw error;
      setStatus(data?.status || null);
      if (data?.status === "approved") {
        toast.success("Your account has been approved! Redirecting...");
        setTimeout(() => navigate("/dashboard", { replace: true }), 800);
      } else if (data?.status === "rejected") {
        toast.error("Your account request was rejected.");
      } else {
        toast.info("Still pending approval. Please check again later.");
      }
    } catch (e: any) {
      toast.error(e.message || "Could not check status");
    } finally {
      setChecking(false);
    }
  };

  // Auto-check on mount
  useEffect(() => { if (user) refresh(); /* eslint-disable-line */ }, [user]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur sticky top-0 z-30">
        <div className="container mx-auto flex h-14 sm:h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm sm:text-base truncate">Ecole des Sciences</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Byimana — SDMS</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2">
            <LogOut className="w-4 h-4" /> Sign out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 sm:py-12 max-w-4xl">
        {/* Status card */}
        <Card className="border-primary/30">
          <CardContent className="p-6 sm:p-8 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Clock className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold">
              {status === "rejected" ? "Account not approved" : "Your account is pending approval"}
            </h1>
            <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-md mx-auto">
              {status === "rejected"
                ? "Please contact the school administration for more details."
                : `Hi ${profile?.full_name?.split(" ")[0] || "there"}, the Principal will review your account shortly. You'll get access as soon as it's approved.`}
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={refresh} disabled={checking} className="gap-2">
                <RefreshCw className={`w-4 h-4 ${checking ? "animate-spin" : ""}`} />
                {checking ? "Checking..." : "Check approval status"}
              </Button>
              <Button variant="outline" onClick={handleSignOut} className="gap-2">
                <LogOut className="w-4 h-4" /> Sign out
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
              Tip: this page checks automatically when you open it.
            </p>
          </CardContent>
        </Card>

        {/* Tour */}
        <section className="mt-10">
          <h2 className="text-lg sm:text-xl font-bold mb-1">While you wait — what's inside SDMS</h2>
          <p className="text-sm text-muted-foreground mb-5">A quick tour of what you'll unlock once approved.</p>
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
            {tour.map(t => {
              const Icon = t.icon;
              return (
                <Card key={t.title} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm">{t.title}</p>
                      <p className="text-xs text-muted-foreground">{t.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* FAQ */}
        <section className="mt-10 mb-6">
          <h2 className="text-lg sm:text-xl font-bold mb-3">Frequently asked</h2>
          <div className="space-y-3">
            <Card><CardContent className="p-4">
              <p className="font-medium text-sm">How long does approval take?</p>
              <p className="text-xs text-muted-foreground mt-1">Typically the same day. The Principal is notified the moment you sign up.</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="font-medium text-sm">Will I get an email?</p>
              <p className="text-xs text-muted-foreground mt-1">Yes — and you can also sign in again anytime to check, or just refresh this page.</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="font-medium text-sm">What if my role is wrong?</p>
              <p className="text-xs text-muted-foreground mt-1">The Principal assigns the appropriate role on approval. Reach out if it needs changing.</p>
            </CardContent></Card>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Pending;
