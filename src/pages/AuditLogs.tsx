import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ScrollText, Clock, AlertTriangle, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

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
  const isPrincipal = hasRole("principal");

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    const performerIds = [...new Set((data || []).map((d) => d.performed_by))];
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("id, full_name").in("id", performerIds),
      supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", performerIds),
    ]);
    const nameMap = new Map(profiles?.map((p) => [p.id, p.full_name]) || []);
    const roleMap = new Map(roles?.map((r) => [r.user_id, r.role]) || []);

    setLogs(
      (data || []).map((d) => ({
        ...d,
        performer_name: nameMap.get(d.performed_by) || "Unknown",
        performer_role: roleMap.get(d.performed_by) || "",
      })),
    );
    setIsLoading(false);
  };

  const deleteOne = async (id: string) => {
    const { error } = await supabase.from("audit_logs").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Log entry deleted");
    setLogs((prev) => prev.filter((l) => l.id !== id));
  };

  const clearAll = async () => {
    const { error } = await supabase
      .from("audit_logs")
      .delete()
      .not("id", "is", null);
    if (error) return toast.error(error.message);
    toast.success("All audit logs cleared");
    setLogs([]);
  };

  if (!hasRole("principal", "dos", "dod")) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <AlertTriangle className="w-12 h-12 mx-auto text-destructive mb-4" />
          <h2 className="text-xl font-bold">Access Denied</h2>
          <p className="text-muted-foreground">
            Only administrators can view audit logs.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  const actionColor = (action: string) => {
    if (action.includes("approved")) return "default";
    if (action.includes("rejected") || action.includes("deleted"))
      return "destructive";
    if (action.includes("reported")) return "secondary";
    return "outline";
  };

  const formatRole = (role?: string) =>
    role ? role.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold page-title tracking-tight flex items-center gap-2 text-foreground">
              <ScrollText className="w-7 h-7 text-primary" /> Audit Logs
            </h1>
            <p className="text-muted-foreground mt-1">
              Complete history of all system actions
            </p>
          </div>
          {isPrincipal && logs.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" /> Clear all
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear all audit logs?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently removes every log entry. This action cannot
                    be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={clearAll}
                  >
                    Clear all
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {isLoading ? (
          <p className="text-center py-12 text-muted-foreground">
            Loading audit logs...
          </p>
        ) : logs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Clock className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No audit logs yet.</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-sm">
            <CardContent className="pt-6">
              <div className="timeline-track space-y-4">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="relative flex items-start gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <span className="absolute -ml-[1.35rem] mt-2 w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-background" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant={actionColor(log.action) as any}
                          className="capitalize"
                        >
                          {log.action.replace(/_/g, " ")}
                        </Badge>
                        <span className="text-xs font-semibold text-foreground">
                          {log.performer_name}
                          {log.performer_role && (
                            <span className="text-muted-foreground font-normal">
                              {" "}
                              ({formatRole(log.performer_role)})
                            </span>
                          )}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </div>
                      {log.details && (
                        <p className="text-sm text-muted-foreground mt-1 truncate">
                          {log.details}
                        </p>
                      )}
                    </div>
                    {isPrincipal && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground/70 hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Delete this log entry?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => deleteOne(log.id)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
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
