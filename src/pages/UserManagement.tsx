import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, CheckCircle, XCircle, Loader2, Users, Shield } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  status: string;
  desired_role: string | null;
  created_at: string;
  current_role?: string | null;
}

const roleLabels: Record<string, string> = {
  dod: "Dean of Discipline",
  dos: "Dean of Studies",
  principal: "Principal",
  teacher: "Teacher",
  discipline_staff: "Discipline Staff",
};

const groupConversations: Record<string, string[]> = {
  "00000000-0000-0000-0000-000000000001": ["dod", "dos", "principal", "teacher", "discipline_staff"], // All Staff
  "00000000-0000-0000-0000-000000000002": ["teacher"], // Teachers
  "00000000-0000-0000-0000-000000000003": ["dod", "discipline_staff"], // Discipline Team
};

const UserManagement = () => {
  const { hasRole, user } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    const { data: profiles } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    const { data: roles } = await supabase.from("user_roles").select("user_id, role");
    
    const roleMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);
    const enriched = (profiles || []).map(p => ({
      ...p,
      current_role: roleMap.get(p.id) || null,
    }));
    setUsers(enriched as UserProfile[]);
    setIsLoading(false);
  };

  const handleApprove = async (u: UserProfile, assignRole: string) => {
    if (!user) return;
    setProcessingId(u.id);
    try {
      // Update profile status
      await supabase.from("profiles").update({ status: "approved" }).eq("id", u.id);
      
      // Assign role (upsert)
      if (u.current_role) {
        await supabase.from("user_roles").update({ role: assignRole as any }).eq("user_id", u.id);
      } else {
        await supabase.from("user_roles").insert({ user_id: u.id, role: assignRole as any });
      }

      // Add to group conversations based on role
      for (const [convId, convRoles] of Object.entries(groupConversations)) {
        if (convRoles.includes(assignRole)) {
          await supabase.from("conversation_members").upsert(
            { conversation_id: convId, user_id: u.id },
            { onConflict: "conversation_id,user_id" }
          );
        }
      }

      // Notify user
      await supabase.from("notifications").insert({
        user_id: u.id,
        title: "Account Approved",
        message: `Your account has been approved as ${roleLabels[assignRole] || assignRole}. You can now log in.`,
        type: "approval",
      });

      await supabase.from("audit_logs").insert({
        action: "user_approved",
        performed_by: user.id,
        target_id: u.id,
        details: `Approved ${u.full_name} as ${roleLabels[assignRole]}`,
      });

      toast.success(`${u.full_name} approved as ${roleLabels[assignRole]}`);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || "Failed to approve user");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (u: UserProfile) => {
    if (!user) return;
    setProcessingId(u.id);
    try {
      await supabase.from("profiles").update({ status: "rejected" }).eq("id", u.id);

      await supabase.from("notifications").insert({
        user_id: u.id,
        title: "Account Rejected",
        message: "Your account request has been rejected by the Principal.",
        type: "rejection",
      });

      await supabase.from("audit_logs").insert({
        action: "user_rejected",
        performed_by: user.id,
        target_id: u.id,
        details: `Rejected ${u.full_name}`,
      });

      toast.success(`${u.full_name} rejected`);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || "Failed to reject user");
    } finally {
      setProcessingId(null);
    }
  };

  if (!hasRole("principal")) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <AlertTriangle className="w-12 h-12 mx-auto text-destructive mb-4" />
          <h2 className="text-xl font-bold">Access Denied</h2>
          <p className="text-muted-foreground">Only the Principal can manage users.</p>
        </div>
      </DashboardLayout>
    );
  }

  const filtered = statusFilter === "all" ? users : users.filter(u => u.status === statusFilter);
  const pendingCount = users.filter(u => u.status === "pending").length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Shield className="w-8 h-8" /> User Management
            </h1>
            <p className="text-muted-foreground">
              {pendingCount > 0 ? `${pendingCount} pending approval${pendingCount > 1 ? "s" : ""}` : "All users processed"}
            </p>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <p className="text-center py-12 text-muted-foreground">Loading users...</p>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No Users Found</h3>
              <p className="text-muted-foreground">No users match the current filter.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map(u => (
              <UserCard
                key={u.id}
                user={u}
                isProcessing={processingId === u.id}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

function UserCard({ user: u, isProcessing, onApprove, onReject }: {
  user: UserProfile;
  isProcessing: boolean;
  onApprove: (u: UserProfile, role: string) => void;
  onReject: (u: UserProfile) => void;
}) {
  const [selectedRole, setSelectedRole] = useState(u.desired_role || u.current_role || "teacher");

  const statusBadge = u.status === "approved" ? "default" : u.status === "rejected" ? "destructive" : "secondary";

  return (
    <Card className={u.status === "pending" ? "border-primary/50 bg-primary/5" : ""}>
      <CardContent className="pt-4 pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-semibold">{u.full_name}</h4>
              <Badge variant={statusBadge} className="capitalize">{u.status}</Badge>
              {u.current_role && (
                <Badge variant="outline">{roleLabels[u.current_role] || u.current_role}</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{u.email}</p>
            {u.desired_role && u.status === "pending" && (
              <p className="text-xs text-muted-foreground">Requested role: <strong>{roleLabels[u.desired_role] || u.desired_role}</strong></p>
            )}
            <p className="text-xs text-muted-foreground">Registered: {new Date(u.created_at).toLocaleDateString()}</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {(u.status === "pending" || u.status === "approved") && (
              <>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(roleLabels).map(([val, label]) => (
                      <SelectItem key={val} value={val}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" className="gap-1" disabled={isProcessing} onClick={() => onApprove(u, selectedRole)}>
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  {u.status === "approved" ? "Update Role" : "Approve"}
                </Button>
              </>
            )}
            {u.status === "pending" && (
              <Button size="sm" variant="destructive" className="gap-1" disabled={isProcessing} onClick={() => onReject(u)}>
                <XCircle className="w-4 h-4" /> Reject
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default UserManagement;
