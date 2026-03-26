import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { AlertTriangle, Loader2, Send, CheckCircle, Upload, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

interface StudentResult {
  id: string;
  name: string;
  student_id: string;
  photo_url: string | null;
  class_id: string | null;
  total_marks: number;
}

const severities = ["minor", "moderate", "serious", "severe", "critical"] as const;
const locations = ["Classroom", "Dormitory", "Field", "Laboratory", "Library", "Cafeteria", "Assembly Hall", "Corridor", "Other"];

const IncidentReport = () => {
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<StudentResult[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentResult | null>(null);
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      const { data } = await supabase
        .from("students")
        .select("id, name, student_id, photo_url, class_id, total_marks")
        .ilike("name", `%${searchQuery}%`)
        .limit(5);
      setSearchResults(data || []);
      setIsSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSubmit = async () => {
    if (!selectedStudent || !description || !severity || !user) {
      toast.error("Please fill in all required fields");
      return;
    }
    setIsSubmitting(true);
    try {
      let evidenceUrl: string | null = null;

      // Upload evidence if provided
      if (evidenceFile) {
        const fileExt = evidenceFile.name.split(".").pop();
        const filePath = `${user.id}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from("evidence").upload(filePath, evidenceFile);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("evidence").getPublicUrl(filePath);
        evidenceUrl = urlData.publicUrl;
      }

      const { error } = await supabase.from("incidents").insert({
        student_id: selectedStudent.id,
        reporter_id: user.id,
        description,
        severity: severity as any,
        location: location || null,
        evidence_url: evidenceUrl,
      });
      if (error) throw error;

      // Notify DOD
      const { data: dodUsers } = await supabase.from("user_roles").select("user_id").eq("role", "dod");
      if (dodUsers) {
        const notifications = dodUsers.map(d => ({
          user_id: d.user_id,
          title: "New Incident Report",
          message: `${selectedStudent.name} reported for: ${description.slice(0, 80)}. Severity: ${severity}${location ? `. Location: ${location}` : ""}`,
          type: "incident",
        }));
        await supabase.from("notifications").insert(notifications);
      }

      // Audit log
      await supabase.from("audit_logs").insert({
        action: "incident_reported",
        performed_by: user.id,
        target_id: selectedStudent.id,
        details: `Reported ${selectedStudent.name} - ${severity} - ${description.slice(0, 100)}`,
      });

      toast.success("Incident reported successfully!");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message || "Failed to submit report");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!hasRole("teacher", "discipline_staff")) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <AlertTriangle className="w-12 h-12 mx-auto text-destructive mb-4" />
          <h2 className="text-xl font-bold">Access Denied</h2>
          <p className="text-muted-foreground">Only teachers and discipline staff can report incidents.</p>
        </div>
      </DashboardLayout>
    );
  }

  const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Report Incident</h1>
          <p className="text-muted-foreground">Submit a discipline incident report for a student</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> Incident Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Student Search */}
            <div className="space-y-2">
              <Label>Student Name *</Label>
              <Input
                placeholder="Type student name to search..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setSelectedStudent(null); }}
              />
              {isSearching && <p className="text-sm text-muted-foreground">Searching...</p>}
              {searchResults.length > 0 && !selectedStudent && (
                <div className="border rounded-lg divide-y">
                  {searchResults.map(s => (
                    <HoverCard key={s.id}>
                      <HoverCardTrigger asChild>
                        <button
                          className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 text-left"
                          onClick={() => { setSelectedStudent(s); setSearchQuery(s.name); setSearchResults([]); }}
                        >
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={s.photo_url || undefined} />
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">{getInitials(s.name)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{s.name}</p>
                            <p className="text-xs text-muted-foreground">{s.student_id}</p>
                          </div>
                        </button>
                      </HoverCardTrigger>
                      <HoverCardContent className="w-64">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-14 h-14">
                            <AvatarImage src={s.photo_url || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary">{getInitials(s.name)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold">{s.name}</p>
                            <p className="text-sm text-muted-foreground">{s.student_id}</p>
                            <p className="text-sm">Marks: {s.total_marks}</p>
                          </div>
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  ))}
                </div>
              )}
              {selectedStudent && (
                <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={selectedStudent.photo_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary">{getInitials(selectedStudent.name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{selectedStudent.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedStudent.student_id} · Marks: {selectedStudent.total_marks}</p>
                  </div>
                  <CheckCircle className="w-5 h-5 text-primary ml-auto" />
                </div>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea placeholder="Describe the incident in detail..." value={description} onChange={e => setDescription(e.target.value)} rows={4} />
            </div>

            {/* Severity & Location */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Severity *</Label>
                <Select value={severity} onValueChange={setSeverity}>
                  <SelectTrigger><SelectValue placeholder="Select severity" /></SelectTrigger>
                  <SelectContent>
                    {severities.map(s => (
                      <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Select value={location} onValueChange={setLocation}>
                  <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                  <SelectContent>
                    {locations.map(l => (
                      <SelectItem key={l} value={l}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Evidence Upload */}
            <div className="space-y-2">
              <Label>Evidence (optional)</Label>
              <div className="border-2 border-dashed rounded-lg p-4 text-center">
                {evidenceFile ? (
                  <div className="flex items-center justify-center gap-2">
                    <ImageIcon className="w-5 h-5 text-primary" />
                    <span className="text-sm">{evidenceFile.name}</span>
                    <Button variant="ghost" size="sm" onClick={() => setEvidenceFile(null)}>Remove</Button>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground mb-2">Upload photo or document evidence</p>
                    <Input type="file" accept="image/*,.pdf" className="max-w-xs mx-auto" onChange={e => setEvidenceFile(e.target.files?.[0] || null)} />
                  </>
                )}
              </div>
            </div>

            <Button onClick={handleSubmit} disabled={isSubmitting || !selectedStudent || !description || !severity} className="w-full gap-2">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Report Incident
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default IncidentReport;
