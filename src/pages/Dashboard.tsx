import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  AlertTriangle,
  Calendar,
  FileCheck,
  Clock,
  MessageSquare,
  BarChart3,
  ArrowRight,
  ChevronRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { StatsSkeleton } from "@/components/Skeletons";
import { toast } from "sonner";
import heroBg from "@/assets/golden-rule-hero.png.asset.json";

interface RecentActivity {
  id: string;
  action: string;
  details: string | null;
  created_at: string;
}

const Dashboard = () => {
  useDocumentTitle("Dashboard");
  const { hasRole, userRole, profile } = useAuth();
  const [stats, setStats] = useState({
    totalStudents: 0,
    pendingIncidents: 0,
    activePermissions: 0,
    upcomingEvents: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchStats(), fetchActivity()]).finally(() =>
      setIsLoading(false),
    );
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

  const fetchActivity = async () => {
    try {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("id, action, details, created_at")
        .order("created_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      setRecentActivity(data || []);
    } catch {
      /* non-critical */
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
      {/* Home background artwork — fits the page, content slides over it */}
      <div
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
        aria-hidden
      >
        <img
          src={heroBg.url}
          alt=""
          className="w-full h-full object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background" />
      </div>

      <div className="relative z-10 space-y-8">
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
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 stagger">
            {statCards.map((stat) => {
              const Icon = stat.icon;
              return (
                <Card
                  key={stat.title}
                  className="stat-glow shine transition-all"
                >
                  <CardContent className="p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                        {stat.title}
                      </p>
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center ${stat.ring}`}
                      >
                        <Icon className={`h-4 w-4 ${stat.tone}`} />
                      </div>
                    </div>
                    <div className="mt-3 text-3xl font-bold tracking-tight text-foreground">
                      {stat.value}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {stat.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2 stagger">
          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Quick Actions</CardTitle>
              <CardDescription className="text-muted-foreground">
                Shortcuts based on your role
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <ul className="divide-y divide-border rounded-lg border border-border overflow-hidden">
                {quickActions.map((a) => {
                  const Icon = a.icon;
                  return (
                    <li key={a.to}>
                      <Link
                        to={a.to}
                        className="group flex items-center gap-3 px-4 py-3 hover:bg-primary/10  transition-colors"
                      >
                        <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="flex-1 text-sm font-medium text-foreground">
                          {a.label}
                        </span>
                        <ChevronRight className="w-4 h-4 text-muted-foreground/70 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>

          {/* Recent Activity — entire card and items are links */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-start justify-between gap-2 space-y-0">
              <div>
                <CardTitle className="text-lg">Recent Activity</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Latest actions across the system
                </CardDescription>
              </div>
              {hasRole("principal", "dos", "dod") && (
                <Link to="/audit-logs">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-primary hover:text-primary hover:bg-primary/5"
                  >
                    View all <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              )}
            </CardHeader>
            <CardContent>
              {recentActivity.length === 0 ? (
                <div className="py-8 text-center">
                  <Clock className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No recent activity yet.
                  </p>
                </div>
              ) : (
                <div className="timeline-track space-y-4">
                  {recentActivity.map((a) => {
                    const Inner = (
                      <div className="group flex items-start gap-3 -ml-1 pl-1 pr-2 py-1 rounded-md hover:bg-muted/50  transition-colors cursor-pointer">
                        <span className="absolute -ml-[1.35rem] mt-1.5 w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-background" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold capitalize text-foreground">
                            {a.action.replace(/_/g, " ")}
                          </p>
                          {a.details && (
                            <p className="text-xs text-muted-foreground truncate">
                              {a.details}
                            </p>
                          )}
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {new Date(a.created_at).toLocaleString()}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground/70 group-hover:text-primary mt-1 shrink-0" />
                      </div>
                    );
                    return hasRole("principal", "dos", "dod") ? (
                      <Link
                        key={a.id}
                        to="/audit-logs"
                        className="relative block"
                      >
                        {Inner}
                      </Link>
                    ) : (
                      <div key={a.id} className="relative">
                        {Inner}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
