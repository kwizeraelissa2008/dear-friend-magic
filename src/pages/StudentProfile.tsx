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
import { ArrowLeft, Shield, Clock, Edit, Plus } from "lucide-react";
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

  useEffect(() => {
    if (studentId) fetchAll();
  }, [studentId]);

  const fetchAll = async () => {
    setIsLoading(true);
    const [studentRes, permRes, incRes] = await Promise.all([
      supabase.from("students").select("*").eq("id", studentId).single(),
      supabase.from("permissions").select("*").eq("student_id", studentId).order("created_at", { ascending: false }),
      supabase.from("incidents").select("*").eq("student_id", studentId).order("created_at", { ascending: false }),
    ]);

    if (studentRes.data) {
      setStudent(studentRes.data);
      if (studentRes.data.class_id) {
        const { data: cls } = await supabase.from("classes").select("name").eq("id", studentRes.data.class_id).single();
        if (cls) setClassName(cls.name);
      }
    }
    if (permRes.data) setPermissions(permRes.data);
    if (incRes.data) setIncidents(incRes.data);
    setIsLoading(false);
  };

  const handleGrantPermission = async () => {
    if (!user || !studentId) return;
    const { error } = await supabase.from("permissions").insert({
      student_id: studentId,
      title: permForm.title,
      description: permForm.description,
      expires_at: new Date(permForm.expires_at).toISOString(),
      granted_by: user.id,
    });
    if (error) { toast.error("Failed to grant permission"); return; }
    toast.success("Permission granted");
    setPermDialogOpen(false);
    setPermForm({ title: "", description: "", expires_at: "" });
    fetchAll();
  };

  if (isLoading) return <DashboardLayout><p className="text-center py-12 text-muted-foreground">Loading...</p></DashboardLayout>;
  if (!student) return <DashboardLayout><p className="text-center py-12 text-muted-foreground">Student not found</p></DashboardLayout>;

  const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to={student.class_id ? `/sis/class/${student.class_id}` : "/sis"}>
            <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Student Profile</h1>
        </div>

        {/* Student Info Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-6">
              <Avatar className="w-28 h-28 mx-auto md:mx-0">
                <AvatarImage src={student.photo_url || undefined} />
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">{getInitials(student.name)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2 text-center md:text-left">
                <h2 className="text-2xl font-bold">{student.name}</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Student ID:</span> <strong>{student.student_id}</strong></div>
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
                  <Button size="sm" className="gap-2"><Plus className="w-4 h-4" /> Grant Permission</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Grant Permission</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div><Label>Title</Label><Input value={permForm.title} onChange={e => setPermForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Lost student card" /></div>
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

        {/* Incident History */}
        <Card>
          <CardHeader>
            <CardTitle>Incident History</CardTitle>
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
                      <Badge variant={inc.status === "approved" ? "default" : "secondary"}>{inc.status}</Badge>
                      <span className="text-xs text-muted-foreground">{new Date(inc.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm">{inc.description}</p>
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      <span>Severity: <strong className="capitalize">{inc.severity}</strong></span>
                      {inc.marks_deducted ? <span>Marks deducted: <strong>{inc.marks_deducted}</strong></span> : null}
                      {inc.deduction_reason && <span>Reason: {inc.deduction_reason}</span>}
                    </div>
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
