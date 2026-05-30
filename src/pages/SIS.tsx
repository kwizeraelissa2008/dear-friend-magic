import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import AddClassDialog from "@/components/AddClassDialog";
import { toast } from "sonner";
import { CardGridSkeleton } from "@/components/Skeletons";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ClassWithCount {
  id: string;
  name: string;
  grade_level: string | null;
  student_count: number;
}

const SIS = () => {
  useDocumentTitle("Student Information System");
  const { hasRole } = useAuth();
  const [classes, setClasses] = useState<ClassWithCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<ClassWithCount | null>(null);

  useEffect(() => { fetchClasses(); }, []);

  const fetchClasses = async () => {
    setIsLoading(true);
    try {
      const { data: classData, error } = await supabase.from("classes").select("*").order("name");
      if (error) throw error;
      const withCounts = await Promise.all(
        (classData || []).map(async (c) => {
          const { count } = await supabase.from("students").select("*", { count: "exact", head: true }).eq("class_id", c.id);
          return { ...c, student_count: count || 0 };
        })
      );
      setClasses(withCounts);
    } catch (err: any) {
      toast.error(err.message || "Failed to load classes");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    const { error } = await supabase.from("classes").delete().eq("id", pendingDelete.id);
    if (error) toast.error(error.message || "Failed to delete class");
    else { toast.success(`Class "${pendingDelete.name}" deleted`); fetchClasses(); }
    setPendingDelete(null);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Student Information System</h1>
            <p className="text-sm text-muted-foreground">View and manage student profiles by class</p>
          </div>
          {hasRole("dos") && <AddClassDialog onClassAdded={fetchClasses} />}
        </div>

        {isLoading ? (
          <CardGridSkeleton count={6} />
        ) : classes.length === 0 ? (
          <Card>
            <CardHeader className="text-center items-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <CardTitle>No Classes Yet</CardTitle>
              <CardDescription>Get started by creating your first class to organize students.</CardDescription>
            </CardHeader>
            {hasRole("dos") && (
              <CardContent className="flex justify-center">
                <AddClassDialog onClassAdded={fetchClasses} />
              </CardContent>
            )}
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {classes.map((classItem) => (
              <Card key={classItem.id} className="hover:shadow-lg transition-shadow h-full flex flex-col">
                <Link to={`/sis/class/${classItem.id}`} className="flex-1">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 min-w-0">
                        <CardTitle className="text-lg sm:text-xl truncate">{classItem.name}</CardTitle>
                        {classItem.grade_level && <CardDescription className="truncate">{classItem.grade_level}</CardDescription>}
                        <p className="text-sm text-muted-foreground">{classItem.student_count} student{classItem.student_count !== 1 ? "s" : ""}</p>
                      </div>
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                        <Users className="w-6 h-6 text-primary" />
                      </div>
                    </div>
                  </CardHeader>
                </Link>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Button asChild variant="secondary" size="sm" className="flex-1">
                      <Link to={`/sis/class/${classItem.id}`}>View Students</Link>
                    </Button>
                    {hasRole("dos") && (
                      <Button
                        variant="outline" size="icon"
                        className="shrink-0 text-destructive hover:text-destructive"
                        onClick={() => setPendingDelete(classItem)}
                        aria-label={`Delete class ${classItem.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this class?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{pendingDelete?.name}</strong>
              {pendingDelete && pendingDelete.student_count > 0 && (
                <> and may affect <strong>{pendingDelete.student_count}</strong> student record{pendingDelete.student_count !== 1 ? "s" : ""} assigned to it</>
              )}
              . This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Class
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default SIS;
