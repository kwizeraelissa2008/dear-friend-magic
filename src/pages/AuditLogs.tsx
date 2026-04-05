import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollText, Clock, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface AuditLog {
  id: string;
  action: string;
  performed_by: string;
  target_id: string | null;
  details: string | null;
  created_at: string;
  performer_name?: string;
  performer_role?: string;
}

const AuditLogs = () => {
  const { hasRole } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { fetchLogs(); }, []);

  const fetchLogs = async () => {
    setIsLoading(true);
    const { data } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(200);

    const performerIds = [...new Set((data || []).map(d => d.performed_by))];
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("id, full_name").in("id", performerIds),
      supabase.from("user_roles").select("user_id, role").in("user_id", performerIds),
    ]);
    const nameMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);
    const roleMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);

    setLogs((data || []).map(d => ({
      ...d,
      performer_name: nameMap.get(d.performed_by) || "Unknown",
      performer_role: roleMap.get(d.performed_by) || "",
    })));
    setIsLoading(false);
  };

  if (!hasRole("principal", "dos", "dod")) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <AlertTriangle className="w-12 h-12 mx-auto text-destructive mb-4" />
          <h2 className="text-xl font-bold">Access Denied</h2>
          <p className="text-muted-foreground">Only administrators can view audit logs.</p>
        </div>
      </DashboardLayout>
    );
  }

  const actionColor = (action: string) => {
    if (action.includes("approved")) return "default";
    if (action.includes("rejected")) return "destructive";
    if (action.includes("reported")) return "secondary";
    return "outline";
  };

  const formatRole = (role?: string) => role ? role.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase()) : "";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><ScrollText className="w-8 h-8" /> Audit Logs</h1>
          <p className="text-muted-foreground">Complete history of all system actions</p>
        </div>

        {isLoading ? (
          <p className="text-center py-12 text-muted-foreground">Loading audit logs...</p>
        ) : logs.length === 0 ? (
          <Card><CardContent className="py-12 text-center"><p className="text-muted-foreground">No audit logs yet.</p></CardContent></Card>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {logs.map(log => (
                  <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg border">
                    <Clock className="w-4 h-4 text-muted-foreground mt-1 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={actionColor(log.action) as any} className="capitalize">{log.action.replace(/_/g, " ")}</Badge>
                        <span className="text-xs font-medium">
                          {log.performer_name}
                          {log.performer_role && ` (${formatRole(log.performer_role)})`}
                        </span>
                        <span className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString()}</span>
                      </div>
                      {log.details && <p className="text-sm text-muted-foreground mt-1 truncate">{log.details}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AuditLogs;
