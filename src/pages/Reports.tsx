import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, CheckCircle, Loader2, FileText, XCircle, Download, Filter, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface IncidentWithStudent {
  id: string;
  description: string;
  severity: string;
  status: string;
  location: string | null;
  evidence_url: string | null;
  marks_deducted: number | null;
  deduction_reason: string | null;
  created_at: string;
  reporter_id: string;
  student_id: string;
  students: { id: string; name: string; photo_url: string | null; student_id: string; total_marks: number } | null;
}

const markOptions = [2, 3, 4, 5, 10];
const deductionReasons = [
  "Disruptive behavior", "Uniform violation", "Late to class", "Fighting",
  "Vandalism", "Academic dishonesty", "Insubordination", "Bullying", "Other",
];

const Reports = () => {
  const { hasRole, user } = useAuth();
  const [incidents, setIncidents] = useState<IncidentWithStudent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [approvalDialog, setApprovalDialog] = useState<IncidentWithStudent | null>(null);
  const [selectedMarks, setSelectedMarks] = useState<number | null>(null);
  const [selectedReason, setSelectedReason] = useState("");
  const [isApproving, setIsApproving] = useState(false);
  const [rejectDialog, setRejectDialog] = useState<IncidentWithStudent | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => { fetchIncidents(); }, []);

  const fetchIncidents = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from("incidents")
      .select("*, students(id, name, photo_url, student_id, total_marks)")
      .order("created_at", { ascending: false });
    setIncidents((data as any) || []);
    setIsLoading(false);
  };

  const handleApprove = async () => {
    if (!approvalDialog || !selectedMarks || !selectedReason || !user) return;
    setIsApproving(true);
    try {
      await supabase.from("incidents").update({
        status: "approved", marks_deducted: selectedMarks, deduction_reason: selectedReason,
        approved_by: user.id, approved_at: new Date().toISOString(),
      }).eq("id", approvalDialog.id);

      if (approvalDialog.students) {
        const newMarks = Math.max(0, approvalDialog.students.total_marks - selectedMarks);
        await supabase.from("students").update({ total_marks: newMarks }).eq("id", approvalDialog.student_id);
      }

      await supabase.from("notifications").insert({
        user_id: approvalDialog.reporter_id,
        title: "Incident Approved",
        message: `${approvalDialog.students?.name}: ${selectedMarks} marks deducted for ${selectedReason}`,
        type: "approval",
      });

      await supabase.from("audit_logs").insert({
        action: "incident_approved", performed_by: user.id, target_id: approvalDialog.id,
        details: `Approved incident for ${approvalDialog.students?.name}. -${selectedMarks} marks.`,
      });

      toast.success("Incident approved and marks deducted");
      setApprovalDialog(null); setSelectedMarks(null); setSelectedReason("");
      fetchIncidents();
    } catch (error: any) {
      toast.error(error.message || "Failed to approve");
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectDialog || !user) return;
    setIsApproving(true);
    try {
      await supabase.from("incidents").update({
        status: "rejected", deduction_reason: rejectReason || "Rejected by DOD",
        approved_by: user.id, approved_at: new Date().toISOString(),
      }).eq("id", rejectDialog.id);

      await supabase.from("notifications").insert({
        user_id: rejectDialog.reporter_id,
        title: "Incident Rejected",
        message: `Incident for ${rejectDialog.students?.name} was rejected. ${rejectReason || ""}`,
        type: "rejection",
      });

      await supabase.from("audit_logs").insert({
        action: "incident_rejected", performed_by: user.id, target_id: rejectDialog.id,
        details: `Rejected incident for ${rejectDialog.students?.name}. Reason: ${rejectReason}`,
      });

      toast.success("Incident rejected");
      setRejectDialog(null); setRejectReason("");
      fetchIncidents();
    } catch (error: any) {
      toast.error(error.message || "Failed to reject");
    } finally {
      setIsApproving(false);
    }
  };

  const exportCSV = () => {
    const rows = [["Student", "Severity", "Status", "Location", "Marks Deducted", "Reason", "Date", "Description"]];
    filteredIncidents.forEach(inc => {
      rows.push([
        inc.students?.name || "Unknown", inc.severity, inc.status, inc.location || "",
        String(inc.marks_deducted || ""), inc.deduction_reason || "",
        new Date(inc.created_at).toLocaleDateString(), inc.description,
      ]);
    });
    const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `incidents_${new Date().toISOString().split("T")[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (!hasRole("dod")) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <AlertTriangle className="w-12 h-12 mx-auto text-destructive mb-4" />
          <h2 className="text-xl font-bold">Access Denied</h2>
          <p className="text-muted-foreground">Only the Dean of Discipline can access reports.</p>
        </div>
      </DashboardLayout>
    );
  }

  const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  const filteredIncidents = statusFilter === "all" ? incidents : incidents.filter(i => i.status === statusFilter);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><FileText className="w-8 h-8" /> Incident Reports</h1>
            <p className="text-muted-foreground">Review, approve or reject incident reports</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36"><Filter className="w-4 h-4 mr-2" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={exportCSV} className="gap-2"><Download className="w-4 h-4" /> Export CSV</Button>
          </div>
        </div>

        {isLoading ? (
          <p className="text-center py-12 text-muted-foreground">Loading reports...</p>
        ) : filteredIncidents.length === 0 ? (
          <Card><CardContent className="py-12 text-center"><p className="text-muted-foreground">No incident reports found.</p></CardContent></Card>
        ) : (
          <div className="space-y-4">
            {filteredIncidents.map(inc => (
              <Card key={inc.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row gap-4">
                    <Avatar className="w-16 h-16 shrink-0">
                      <AvatarImage src={inc.students?.photo_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">{inc.students ? getInitials(inc.students.name) : "?"}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <h3 className="font-semibold text-lg">{inc.students?.name || "Unknown"}</h3>
                        <div className="flex items-center gap-2">
                          <Badge variant={inc.status === "approved" ? "default" : inc.status === "rejected" ? "destructive" : "secondary"}>{inc.status}</Badge>
                          <Badge variant="outline" className="capitalize">{inc.severity}</Badge>
                          {inc.location && <Badge variant="outline">{inc.location}</Badge>}
                        </div>
                      </div>
                      <p className="text-sm">{inc.description}</p>
                      {inc.evidence_url && (
                        <a href={inc.evidence_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                          <ImageIcon className="w-4 h-4" /> View Evidence
                        </a>
                      )}
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-xs text-muted-foreground">{new Date(inc.created_at).toLocaleString()}</span>
                        <div className="flex gap-2">
                          {inc.status === "pending" && (
                            <>
                              <Button size="sm" className="gap-2" onClick={() => setApprovalDialog(inc)}>
                                <CheckCircle className="w-4 h-4" /> Approve
                              </Button>
                              <Button size="sm" variant="destructive" className="gap-2" onClick={() => setRejectDialog(inc)}>
                                <XCircle className="w-4 h-4" /> Reject
                              </Button>
                            </>
                          )}
                          {inc.status === "approved" && inc.marks_deducted && (
                            <span className="text-sm font-medium text-destructive">-{inc.marks_deducted} marks ({inc.deduction_reason})</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Approval Dialog */}
        <Dialog open={!!approvalDialog} onOpenChange={open => !open && setApprovalDialog(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Approve Incident & Deduct Marks</DialogTitle></DialogHeader>
            {approvalDialog && (
              <div className="space-y-6">
                <div className="flex gap-4">
                  <Avatar className="w-20 h-20">
                    <AvatarImage src={approvalDialog.students?.photo_url || undefined} />
                    <AvatarFallback className="text-xl bg-primary/10 text-primary">{approvalDialog.students ? getInitials(approvalDialog.students.name) : "?"}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-bold text-lg">{approvalDialog.students?.name}</h3>
                    <p className="text-sm text-muted-foreground">Current marks: {approvalDialog.students?.total_marks}</p>
                    <p className="text-sm mt-2">{approvalDialog.description}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="font-medium text-sm">Select marks to deduct:</p>
                  <div className="flex gap-2 flex-wrap">
                    {markOptions.map(m => (
                      <Button key={m} variant={selectedMarks === m ? "default" : "outline"} size="sm" onClick={() => setSelectedMarks(m)}>-{m}</Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="font-medium text-sm">Reason for deduction:</p>
                  <Select value={selectedReason} onValueChange={setSelectedReason}>
                    <SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger>
                    <SelectContent>{deductionReasons.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Button onClick={handleApprove} disabled={isApproving || !selectedMarks || !selectedReason} className="w-full gap-2">
                  {isApproving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Approve & Deduct Marks
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Reject Dialog */}
        <Dialog open={!!rejectDialog} onOpenChange={open => !open && setRejectDialog(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Reject Incident</DialogTitle></DialogHeader>
            {rejectDialog && (
              <div className="space-y-4">
                <p className="text-sm">Rejecting incident for <strong>{rejectDialog.students?.name}</strong></p>
                <Textarea placeholder="Reason for rejection (optional)..." value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3} />
                <Button onClick={handleReject} disabled={isApproving} variant="destructive" className="w-full gap-2">
                  {isApproving ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  Reject Incident
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Reports;
