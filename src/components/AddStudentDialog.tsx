import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Loader2, Upload, Download, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface AddStudentDialogProps {
  classId: string;
  onStudentAdded: () => void;
}

interface CsvStudent {
  name: string;
  gender: string;
  date_of_birth: string;
  student_id: string;
  photo_url?: string;
}

const AddStudentDialog = ({ classId, onStudentAdded }: AddStudentDialogProps) => {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // Manual form
  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState("");
  const [studentId, setStudentId] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  // CSV
  const [csvStudents, setCsvStudents] = useState<CsvStudent[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);

  const handleManualSubmit = async () => {
    if (!name || !gender || !dob || !studentId) { toast.error("Please fill all required fields"); return; }
    setIsLoading(true);
    const { error } = await supabase.from("students").insert({
      name, gender, date_of_birth: dob, student_id: studentId, class_id: classId,
      photo_url: photoUrl || null,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Student added");
      setOpen(false);
      resetForm();
      onStudentAdded();
    }
    setIsLoading(false);
  };

  const resetForm = () => {
    setName(""); setGender(""); setDob(""); setStudentId(""); setPhotoUrl("");
    setCsvStudents([]); setCsvErrors([]);
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) { setCsvErrors(["File must have a header row and at least one data row"]); return; }
      const header = lines[0].split(",").map(h => h.trim().toLowerCase());
      const required = ["name", "gender", "dateofbirth", "studentid"];
      const normalized = header.map(h => h.replace(/[_\s]/g, ""));
      const missing = required.filter(r => !normalized.includes(r));
      if (missing.length > 0) { setCsvErrors([`Missing columns: ${missing.join(", ")}`]); return; }

      const nameIdx = normalized.indexOf("name");
      const genderIdx = normalized.indexOf("gender");
      const dobIdx = normalized.indexOf("dateofbirth");
      const sidIdx = normalized.indexOf("studentid");
      const photoIdx = normalized.indexOf("photourl");

      const students: CsvStudent[] = [];
      const errors: string[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map(c => c.trim());
        if (!cols[nameIdx]) { errors.push(`Row ${i + 1}: Missing name`); continue; }
        if (!cols[genderIdx]) { errors.push(`Row ${i + 1}: Missing gender`); continue; }
        if (!cols[dobIdx]) { errors.push(`Row ${i + 1}: Missing DOB`); continue; }
        if (!cols[sidIdx]) { errors.push(`Row ${i + 1}: Missing student ID`); continue; }
        students.push({
          name: cols[nameIdx],
          gender: cols[genderIdx],
          date_of_birth: cols[dobIdx],
          student_id: cols[sidIdx],
          photo_url: photoIdx >= 0 ? cols[photoIdx] : undefined,
        });
      }
      setCsvStudents(students);
      setCsvErrors(errors);
    };
    reader.readAsText(file);
  };

  const handleCsvSubmit = async () => {
    if (csvStudents.length === 0) return;
    setIsLoading(true);
    const rows = csvStudents.map(s => ({
      ...s,
      class_id: classId,
      photo_url: s.photo_url || null,
    }));
    const { error } = await supabase.from("students").insert(rows);
    if (error) toast.error(error.message);
    else {
      toast.success(`${csvStudents.length} students added`);
      setOpen(false);
      resetForm();
      onStudentAdded();
    }
    setIsLoading(false);
  };

  const downloadTemplate = () => {
    const csv = "Name,Class,Gender,DateOfBirth,StudentID,PhotoURL\nJohn Doe,Form 1A,male,2010-05-15,STU001,\nJane Smith,Form 1A,female,2010-08-20,STU002,";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "student_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) resetForm(); }}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Plus className="w-4 h-4" /> Add Student</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Add Students</DialogTitle></DialogHeader>
        <Tabs defaultValue="manual">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
            <TabsTrigger value="csv">CSV Upload</TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Full Name *</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="John Doe" /></div>
              <div>
                <Label>Gender *</Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Date of Birth *</Label><Input type="date" value={dob} onChange={e => setDob(e.target.value)} /></div>
              <div><Label>Student ID *</Label><Input value={studentId} onChange={e => setStudentId(e.target.value)} placeholder="STU001" /></div>
              <div className="col-span-2"><Label>Photo URL (optional)</Label><Input value={photoUrl} onChange={e => setPhotoUrl(e.target.value)} placeholder="https://..." /></div>
            </div>
            <Button onClick={handleManualSubmit} disabled={isLoading} className="w-full">
              {isLoading && <Loader2 className="mr-2 w-4 h-4 animate-spin" />} Add Student
            </Button>
          </TabsContent>

          <TabsContent value="csv" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Upload a CSV file with student data</p>
              <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-2">
                <Download className="w-4 h-4" /> Download Template
              </Button>
            </div>
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <Input type="file" accept=".csv" onChange={handleCsvUpload} className="max-w-xs mx-auto" />
            </div>
            {csvErrors.length > 0 && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 space-y-1">
                {csvErrors.map((err, i) => (
                  <p key={i} className="text-sm text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {err}</p>
                ))}
              </div>
            )}
            {csvStudents.length > 0 && (
              <>
                <p className="text-sm font-medium">{csvStudents.length} students ready to import:</p>
                <div className="max-h-60 overflow-y-auto border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Gender</TableHead>
                        <TableHead>DOB</TableHead>
                        <TableHead>Student ID</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {csvStudents.map((s, i) => (
                        <TableRow key={i}>
                          <TableCell>{s.name}</TableCell>
                          <TableCell className="capitalize">{s.gender}</TableCell>
                          <TableCell>{s.date_of_birth}</TableCell>
                          <TableCell>{s.student_id}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <Button onClick={handleCsvSubmit} disabled={isLoading} className="w-full gap-2">
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin" />} Import {csvStudents.length} Students
                </Button>
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default AddStudentDialog;
