import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Shield, Clock, Plus, Edit, Phone, User } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface Student {
  id: string;
  student_id: string;
  name: string;
  gender: string;
  date_of_birth: string;
  photo_url: string | null;
  total_marks: number;
  class_id: string | null;
  parent_name: string | null;
  parent_phone: string | null;
  status: string;
}

interface Permission {
  id: string;
  title: string;
  description: string;
  status: string;
  expires_at: string;
  created_at: string;
}

interface Incident {
  id: string;
  description: string;
  severity: string;
  status: string;
  location: string | null;
  marks_deducted: number | null;
  deduction_reason: string | null;
  created_at: string;
}

const StudentProfile = () => {
  const { studentId } = useParams();
  const { hasRole, user } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [className, setClassName] = useState("");
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [permDialogOpen, setPermDialogOpen] = useState(false);
  const [permForm, setPermForm] = useState({ title: "", description: "", expires_at: "" });
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", parent_name: "", parent_phone: "", status: "active" });

  useEffect(() => { if (studentId) fetchAll(); }, [studentId]);

  const fetchAll = async () => {
    setIsLoading(true);
    const [studentRes, permRes, incRes] = await Promise.all([
      supabase.from("students").select("*").eq("id", studentId).single(),
      supabase.from("permissions").select("*").eq("student_id", studentId).order("created_at", { ascending: false }),
      supabase.from("incidents").select("*").eq("student_id", studentId).order("created_at", { ascending: false }),
    ]);
    if (studentRes.data) {
      setStudent(studentRes.data as Student);
      setEditForm({
        name: studentRes.data.name,
        parent_name: (studentRes.data as any).parent_name || "",
        parent_phone: (studentRes.data as any).parent_phone || "",
        status: (studentRes.data as any).status || "active",
      });
      if (studentRes.data.class_id) {
        const { data: cls } = await supabase.from("classes").select("name").eq("id", studentRes.data.class_id).single();
        if (cls) setClassName(cls.name);
      }
    }
    if (permRes.data) setPermissions(permRes.data);
    if (incRes.data) setIncidents(incRes.data as Incident[]);
    setIsLoading(false);
  };

  const handleGrantPermission = async () => {
    if (!user || !studentId) return;
    const { error } = await supabase.from("permissions").insert({
      student_id: studentId, title: permForm.title, description: permForm.description,
      expires_at: new Date(permForm.expires_at).toISOString(), granted_by: user.id,
    });
    if (error) { toast.error("Failed to grant permission"); return; }
    await supabase.from("audit_logs").insert({
      action: "permission_granted", performed_by: user.id, target_id: studentId,
      details: `Permission: ${permForm.title}`,
    });
    toast.success("Permission granted");
    setPermDialogOpen(false);
    setPermForm({ title: "", description: "", expires_at: "" });
    fetchAll();
  };

  const handleEditStudent = async () => {
    if (!studentId || !user) return;
    const { error } = await supabase.from("students").update({
      name: editForm.name,
      parent_name: editForm.parent_name || null,
      parent_phone: editForm.parent_phone || null,
      status: editForm.status,
    }).eq("id", studentId);
    if (error) { toast.error("Failed to update student"); return; }
    await supabase.from("audit_logs").insert({
      action: "student_updated", performed_by: user.id, target_id: studentId,
      details: `Updated student info: ${editForm.name}`,
    });
    toast.success("Student updated");
    setEditDialogOpen(false);
    fetchAll();
  };

  if (isLoading) return <DashboardLayout><p className="text-center py-12 text-muted-foreground">Loading...</p></DashboardLayout>;
  if (!student) return <DashboardLayout><p className="text-center py-12 text-muted-foreground">Student not found</p></DashboardLayout>;

  const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  const statusColor = student.status === "active" ? "default" : student.status === "suspended" ? "secondary" : "destructive";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to={student.class_id ? `/sis/class/${student.class_id}` : "/sis"}>
            <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight flex-1">Student Profile</h1>
          {hasRole("dos") && (
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2"><Edit className="w-4 h-4" /> Edit</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Edit Student</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div><Label>Full Name</Label><Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} /></div>
                  <div><Label>Parent/Guardian Name</Label><Input value={editForm.parent_name} onChange={e => setEditForm(f => ({ ...f, parent_name: e.target.value }))} /></div>
                  <div><Label>Parent Phone</Label><Input value={editForm.parent_phone} onChange={e => setEditForm(f => ({ ...f, parent_phone: e.target.value }))} /></div>
                  <div>
                    <Label>Status</Label>
                    <Select value={editForm.status} onValueChange={v => setEditForm(f => ({ ...f, status: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                        <SelectItem value="expelled">Expelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleEditStudent} className="w-full">Save Changes</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Student Info */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-6">
              <Avatar className="w-28 h-28 mx-auto md:mx-0">
                <AvatarImage src={student.photo_url || undefined} />
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">{getInitials(student.name)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-3 text-center md:text-left">
                <div className="flex items-center gap-3 justify-center md:justify-start">
                  <h2 className="text-2xl font-bold">{student.name}</h2>
                  <Badge variant={statusColor} className="capitalize">{student.status}</Badge>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Admission No:</span> <strong>{student.student_id}</strong></div>
                  <div><span className="text-muted-foreground">Class:</span> <strong>{className || "Unassigned"}</strong></div>
                  <div><span className="text-muted-foreground">Gender:</span> <strong className="capitalize">{student.gender}</strong></div>
                  <div><span className="text-muted-foreground">DOB:</span> <strong>{new Date(student.date_of_birth).toLocaleDateString()}</strong></div>
                  <div>
                    <span className="text-muted-foreground">Marks:</span>{" "}
                    <Badge variant={student.total_marks >= 80 ? "default" : student.total_marks >= 60 ? "secondary" : "destructive"}>
                      {student.total_marks}
                    </Badge>
                  </div>
                </div>
                {(student.parent_name || student.parent_phone) && (
                  <div className="flex gap-4 text-sm pt-2 border-t">
                    {student.parent_name && (
                      <span className="flex items-center gap-1"><User className="w-4 h-4 text-muted-foreground" /> {student.parent_name}</span>
                    )}
                    {student.parent_phone && (
                      <span className="flex items-center gap-1"><Phone className="w-4 h-4 text-muted-foreground" /> {student.parent_phone}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Permissions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5" /> Permissions</CardTitle>
              <CardDescription>Active and expired permissions</CardDescription>
            </div>
            {hasRole("dod") && (
              <Dialog open={permDialogOpen} onOpenChange={setPermDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2"><Plus className="w-4 h-4" /> Grant</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Grant Permission</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div><Label>Title</Label><Input value={permForm.title} onChange={e => setPermForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Late entry" /></div>
                    <div><Label>Description</Label><Textarea value={permForm.description} onChange={e => setPermForm(p => ({ ...p, description: e.target.value }))} placeholder="Details..." /></div>
                    <div><Label>Expires At</Label><Input type="datetime-local" value={permForm.expires_at} onChange={e => setPermForm(p => ({ ...p, expires_at: e.target.value }))} /></div>
                    <Button onClick={handleGrantPermission} className="w-full">Grant Permission</Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </CardHeader>
          <CardContent>
            {permissions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No permissions on record.</p>
            ) : (
              <div className="space-y-3">
                {permissions.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium">{p.title}</p>
                      <p className="text-sm text-muted-foreground">{p.description}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><Clock className="w-3 h-3" /> Expires: {new Date(p.expires_at).toLocaleString()}</p>
                    </div>
                    <Badge variant={p.status === "active" ? "default" : "secondary"}>{p.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Incidents */}
        <Card>
          <CardHeader>
            <CardTitle>Incident History ({incidents.length})</CardTitle>
            <CardDescription>Reported incidents for this student</CardDescription>
          </CardHeader>
          <CardContent>
            {incidents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No incidents on record.</p>
            ) : (
              <div className="space-y-3">
                {incidents.map(inc => (
                  <div key={inc.id} className="p-3 rounded-lg border space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={inc.status === "approved" ? "default" : inc.status === "rejected" ? "destructive" : "secondary"}>{inc.status}</Badge>
                        <Badge variant="outline" className="capitalize">{inc.severity}</Badge>
                        {inc.location && <Badge variant="outline">{inc.location}</Badge>}
                      </div>
                      <span className="text-xs text-muted-foreground">{new Date(inc.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm">{inc.description}</p>
                    {inc.marks_deducted ? (
                      <p className="text-xs text-destructive font-medium">-{inc.marks_deducted} marks ({inc.deduction_reason})</p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default StudentProfile;
