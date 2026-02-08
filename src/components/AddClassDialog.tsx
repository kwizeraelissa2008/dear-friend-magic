import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface AddClassDialogProps {
  onClassAdded: () => void;
}

const AddClassDialog = ({ onClassAdded }: AddClassDialogProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error("Class name is required"); return; }
    setIsLoading(true);
    const { error } = await supabase.from("classes").insert({
      name: name.trim(),
      grade_level: gradeLevel.trim() || null,
    });
    if (error) { toast.error("Failed to add class"); }
    else {
      toast.success("Class added");
      setOpen(false);
      setName("");
      setGradeLevel("");
      onClassAdded();
    }
    setIsLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Plus className="w-4 h-4" /> Add Class</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add New Class</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Class Name</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Form 1A" /></div>
          <div><Label>Grade Level (optional)</Label><Input value={gradeLevel} onChange={e => setGradeLevel(e.target.value)} placeholder="e.g. Grade 9" /></div>
          <Button onClick={handleSubmit} disabled={isLoading} className="w-full">
            {isLoading && <Loader2 className="mr-2 w-4 h-4 animate-spin" />} Add Class
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddClassDialog;
