import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  AlertTriangle,
  Calendar,
  FileCheck,
  MessageSquare,
  BarChart3,
  ChevronRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { StatsSkeleton } from "@/components/Skeletons";
import { toast } from "sonner";
import heroBg from "@/assets/golden-rule-hero.png.asset.json";

const Dashboard = () => {
  useDocumentTitle("Dashboard");
  const { hasRole, userRole, profile } = useAuth();
  const [stats, setStats] = useState({
    totalStudents: 0,
    pendingIncidents: 0,
    activePermissions: 0,
    upcomingEvents: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats().finally(() => setIsLoading(false));
  }, []);

  const fetchStats = async () => {
    try {
      const [students, incidents, permissions, events] = await Promise.all([
        supabase.from("students").select("*", { count: "exact", head: true }),
        supabase
          .from("incidents")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase
          .from("permissions")
          .select("*", { count: "exact", head: true })
          .eq("status", "active"),
        supabase
          .from("events")
          .select("*", { count: "exact", head: true })
          .gte("event_date", new Date().toISOString().split("T")[0]),
      ]);
      setStats({
        totalStudents: students.count || 0,
        pendingIncidents: incidents.count || 0,
        activePermissions: permissions.count || 0,
        upcomingEvents: events.count || 0,
      });
    } catch {
      toast.error("Failed to load dashboard stats");
    }
  };

  const statCards = [
    {
      title: "Total Students",
      value: stats.totalStudents,
      description: "Registered in the system",
      icon: Users,
      tone: "text-primary",
      ring: "bg-primary/10",
    },
    {
      title: "Pending Incidents",
      value: stats.pendingIncidents,
      description: "Awaiting review",
      icon: AlertTriangle,
      tone: "text-destructive",
      ring: "bg-destructive/10",
    },
    {
      title: "Active Permissions",
      value: stats.activePermissions,
      description: "Currently valid",
      icon: FileCheck,
      tone: "text-accent",
      ring: "bg-accent/10",
    },
    {
      title: "Upcoming Events",
      value: stats.upcomingEvents,
      description: "Scheduled events",
      icon: Calendar,
      tone: "text-primary",
      ring: "bg-primary/10",
    },
  ];

  const roleLabel = userRole
    ? userRole.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "";

  const quickActions = [
    { to: "/sis", icon: Users, label: "View Students", show: true },
    { to: "/chat", icon: MessageSquare, label: "Open Chat", show: true },
    {
      to: "/report",
      icon: AlertTriangle,
      label: "Report Incident",
      show: hasRole("teacher", "discipline_staff"),
    },
    {
      to: "/reports",
      icon: FileCheck,
      label: "Review Reports",
      show: hasRole("dod"),
    },
    {
      to: "/analytics",
      icon: BarChart3,
      label: "View Analytics",
      show: hasRole("principal", "dos"),
    },
    { to: "/calendar", icon: Calendar, label: "Event Calendar", show: true },
  ].filter((a) => a.show);

  return (
    <DashboardLayout>
      {/* Fixed background artwork */}
      <div
        className="pointer-events-none fixed inset-0 z-0 select-none"
        aria-hidden
      >
        <img
          src={heroBg.url}
          alt=""
          className="h-full w-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/60 to-background/85" />
      </div>

      <div className="relative z-10 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold page-title tracking-tight text-foreground">
            Welcome, {profile?.full_name || "User"}
          </h1>
          <div className="text-sm text-muted-foreground flex items-center flex-wrap gap-2 mt-2">
            {roleLabel && (
              <Badge variant="secondary" className="font-medium">
                {roleLabel}
              </Badge>
            )}
            <span>School Discipline Management System</span>
          </div>
        </div>

        {isLoading ? (
          <StatsSkeleton />
        ) : (
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 stagger">
            {statCards.map((stat) => {
              const Icon = stat.icon;
              return (
                <Card
                  key={stat.title}
                  className="stat-glow shine transition-all rounded-2xl"
                >
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] sm:text-xs font-medium text-muted-foreground leading-tight">
                        {stat.title}
                      </p>
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${stat.ring}`}
                      >
                        <Icon className={`h-3.5 w-3.5 ${stat.tone}`} />
                      </div>
                    </div>
                    <div className="mt-1.5 text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                      {stat.value}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Quick Actions — enlarged */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xl">Quick Actions</CardTitle>
            <CardDescription className="text-muted-foreground">
              Shortcuts based on your role
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {quickActions.map((a) => {
                const Icon = a.icon;
                return (
                  <Link
                    key={a.to}
                    to={a.to}
                    className="group flex items-center gap-4 rounded-2xl border border-border bg-background/30 px-5 py-5 transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary/10"
                  >
                    <div className="icon-tile h-12 w-12 shrink-0">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="flex-1 text-base font-semibold text-foreground">
                      {a.label}
                    </span>
                    <ChevronRight className="h-5 w-5 text-muted-foreground/70 transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;

