import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, AlertTriangle, Calendar, FileCheck } from "lucide-react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";

const Dashboard = () => {
  const { hasRole } = useAuth();
  const [stats, setStats] = useState({
    totalStudents: 0,
    pendingIncidents: 0,
    activePermissions: 0,
    upcomingEvents: 0,
  });

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    const [students, incidents, permissions, events] = await Promise.all([
      supabase.from("students").select("*", { count: "exact", head: true }),
      supabase.from("incidents").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("permissions").select("*", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("events").select("*", { count: "exact", head: true }).gte("event_date", new Date().toISOString().split("T")[0]),
    ]);
    setStats({
      totalStudents: students.count || 0,
      pendingIncidents: incidents.count || 0,
      activePermissions: permissions.count || 0,
      upcomingEvents: events.count || 0,
    });
  };

  const statCards = [
    { title: "Total Students", value: stats.totalStudents, description: "Registered in the system", icon: Users, color: "text-primary" },
    { title: "Pending Incidents", value: stats.pendingIncidents, description: "Awaiting review", icon: AlertTriangle, color: "text-warning" },
    { title: "Active Permissions", value: stats.activePermissions, description: "Currently valid", icon: FileCheck, color: "text-success" },
    { title: "Upcoming Events", value: stats.upcomingEvents, description: "Scheduled events", icon: Calendar, color: "text-info" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Welcome to School Discipline Management System</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map(stat => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Frequently used features</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link to="/sis"><Button variant="outline" className="w-full justify-start gap-2"><Users className="w-4 h-4" /> View Students</Button></Link>
              {hasRole("teacher", "discipline_staff") && (
                <Link to="/report"><Button variant="outline" className="w-full justify-start gap-2"><AlertTriangle className="w-4 h-4" /> Report Incident</Button></Link>
              )}
              {hasRole("dod") && (
                <Link to="/reports"><Button variant="outline" className="w-full justify-start gap-2"><FileCheck className="w-4 h-4" /> Review Reports</Button></Link>
              )}
              <Link to="/calendar"><Button variant="outline" className="w-full justify-start gap-2"><Calendar className="w-4 h-4" /> View Calendar</Button></Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest updates in the system</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Activity feed will appear here as actions are performed in the system.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
