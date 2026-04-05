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
  parent_name?: string;
  parent_phone?: string;
  photo_url?: string;
}

const AddStudentDialog = ({ classId, onStudentAdded }: AddStudentDialogProps) => {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState("");
  const [studentId, setStudentId] = useState("");
  const [parentName, setParentName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [csvStudents, setCsvStudents] = useState<CsvStudent[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);

  const handleManualSubmit = async () => {
    if (!name || !gender || !dob || !studentId) { toast.error("Please fill all required fields"); return; }
    setIsLoading(true);
    const { error } = await supabase.from("students").insert({
      name, gender, date_of_birth: dob, student_id: studentId, class_id: classId,
      parent_name: parentName || null, parent_phone: parentPhone || null,
      photo_url: photoUrl || null,
    });
    if (error) {
      if (error.message.includes("duplicate")) toast.error("A student with this admission number already exists");
      else toast.error(error.message);
    } else {
      toast.success("Student added");
      setOpen(false); resetForm(); onStudentAdded();
    }
    setIsLoading(false);
  };

  const resetForm = () => {
    setName(""); setGender(""); setDob(""); setStudentId("");
    setParentName(""); setParentPhone(""); setPhotoUrl("");
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

      const idx = (col: string) => normalized.indexOf(col);
      const students: CsvStudent[] = [];
      const errors: string[] = [];
      const seenIds = new Set<string>();

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map(c => c.trim());
        if (!cols[idx("name")]) { errors.push(`Row ${i + 1}: Missing name`); continue; }
        if (!cols[idx("gender")]) { errors.push(`Row ${i + 1}: Missing gender`); continue; }
        if (!cols[idx("dateofbirth")]) { errors.push(`Row ${i + 1}: Missing DOB`); continue; }
        if (!cols[idx("studentid")]) { errors.push(`Row ${i + 1}: Missing student ID`); continue; }
        if (seenIds.has(cols[idx("studentid")])) { errors.push(`Row ${i + 1}: Duplicate student ID ${cols[idx("studentid")]}`); continue; }
        seenIds.add(cols[idx("studentid")]);
        students.push({
          name: cols[idx("name")],
          gender: cols[idx("gender")],
          date_of_birth: cols[idx("dateofbirth")],
          student_id: cols[idx("studentid")],
          parent_name: idx("parentname") >= 0 ? cols[idx("parentname")] : undefined,
          parent_phone: idx("parentphone") >= 0 ? cols[idx("parentphone")] : undefined,
          photo_url: idx("photourl") >= 0 ? cols[idx("photourl")] : undefined,
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
      name: s.name, gender: s.gender, date_of_birth: s.date_of_birth, student_id: s.student_id,
      class_id: classId, parent_name: s.parent_name || null, parent_phone: s.parent_phone || null,
      photo_url: s.photo_url || null,
    }));
    const { error } = await supabase.from("students").insert(rows);
    if (error) {
      if (error.message.includes("duplicate")) toast.error("Some students have duplicate admission numbers");
      else toast.error(error.message);
    } else {
      toast.success(`${csvStudents.length} students added`);
      setOpen(false); resetForm(); onStudentAdded();
    }
    setIsLoading(false);
  };

  const downloadTemplate = () => {
    const csv = "Name,Gender,DateOfBirth,StudentID,ParentName,ParentPhone,PhotoURL\nJohn Doe,male,2010-05-15,STU001,Jane Doe,+254700000000,\nJane Smith,female,2010-08-20,STU002,Mary Smith,+254711111111,";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "student_template.csv"; a.click();
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
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Date of Birth *</Label><Input type="date" value={dob} onChange={e => setDob(e.target.value)} /></div>
              <div><Label>Admission No *</Label><Input value={studentId} onChange={e => setStudentId(e.target.value)} placeholder="STU001" /></div>
              <div><Label>Parent/Guardian Name</Label><Input value={parentName} onChange={e => setParentName(e.target.value)} placeholder="Jane Doe" /></div>
              <div><Label>Parent Phone</Label><Input value={parentPhone} onChange={e => setParentPhone(e.target.value)} placeholder="+254700000000" /></div>
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
                <Download className="w-4 h-4" /> Template
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
                        <TableHead>Adm No</TableHead>
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
