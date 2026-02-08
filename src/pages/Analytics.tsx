import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertTriangle, BarChart3 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS = ["hsl(200,95%,40%)", "hsl(155,60%,45%)", "hsl(38,92%,50%)", "hsl(0,84%,60%)", "hsl(270,60%,50%)"];

const Analytics = () => {
  const { hasRole } = useAuth();
  const [severityData, setSeverityData] = useState<{ name: string; count: number }[]>([]);
  const [classData, setClassData] = useState<{ name: string; incidents: number }[]>([]);
  const [monthlyData, setMonthlyData] = useState<{ month: string; count: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setIsLoading(true);

    // Incidents by severity
    const { data: incidents } = await supabase.from("incidents").select("severity, student_id, created_at, students(class_id, classes(name))");

    if (incidents) {
      // Severity distribution
      const sevMap: Record<string, number> = {};
      incidents.forEach(i => { sevMap[i.severity] = (sevMap[i.severity] || 0) + 1; });
      setSeverityData(Object.entries(sevMap).map(([name, count]) => ({ name, count })));

      // Incidents by class
      const classMap: Record<string, number> = {};
      incidents.forEach(i => {
        const cls = (i as any).students?.classes?.name || "Unknown";
        classMap[cls] = (classMap[cls] || 0) + 1;
      });
      setClassData(Object.entries(classMap).map(([name, incidents]) => ({ name, incidents })).sort((a, b) => b.incidents - a.incidents));

      // Monthly trend
      const monthMap: Record<string, number> = {};
      incidents.forEach(i => {
        const month = new Date(i.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short" });
        monthMap[month] = (monthMap[month] || 0) + 1;
      });
      setMonthlyData(Object.entries(monthMap).map(([month, count]) => ({ month, count })));
    }
    setIsLoading(false);
  };

  if (!hasRole("principal", "dos")) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <AlertTriangle className="w-12 h-12 mx-auto text-destructive mb-4" />
          <h2 className="text-xl font-bold">Access Denied</h2>
          <p className="text-muted-foreground">Only Principal and Dean of Studies can view analytics.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><BarChart3 className="w-8 h-8" /> Analytics</h1>
          <p className="text-muted-foreground">Student discipline trends and insights</p>
        </div>

        {isLoading ? (
          <p className="text-center py-12 text-muted-foreground">Loading analytics...</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Incidents by Severity</CardTitle>
                <CardDescription>Distribution of incident severity levels</CardDescription>
              </CardHeader>
              <CardContent>
                {severityData.length === 0 ? <p className="text-sm text-muted-foreground">No data yet.</p> : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={severityData} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                        {severityData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Incidents by Class</CardTitle>
                <CardDescription>Number of reports per class</CardDescription>
              </CardHeader>
              <CardContent>
                {classData.length === 0 ? <p className="text-sm text-muted-foreground">No data yet.</p> : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={classData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" fontSize={12} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="incidents" fill="hsl(200,95%,40%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Monthly Incident Trend</CardTitle>
                <CardDescription>Number of incidents over time</CardDescription>
              </CardHeader>
              <CardContent>
                {monthlyData.length === 0 ? <p className="text-sm text-muted-foreground">No data yet.</p> : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" fontSize={12} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="hsl(155,60%,45%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Analytics;
