import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Users, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import AddClassDialog from "@/components/AddClassDialog";
import { toast } from "sonner";

interface ClassWithCount {
  id: string;
  name: string;
  grade_level: string | null;
  student_count: number;
}

const SIS = () => {
  const { hasRole } = useAuth();
  const [classes, setClasses] = useState<ClassWithCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { fetchClasses(); }, []);

  const fetchClasses = async () => {
    setIsLoading(true);
    const { data: classData } = await supabase.from("classes").select("*").order("name");
    if (classData) {
      // Get student counts
      const withCounts = await Promise.all(
        classData.map(async (c) => {
          const { count } = await supabase.from("students").select("*", { count: "exact", head: true }).eq("class_id", c.id);
          return { ...c, student_count: count || 0 };
        })
      );
      setClasses(withCounts);
    }
    setIsLoading(false);
  };

  const handleDeleteClass = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const { error } = await supabase.from("classes").delete().eq("id", id);
    if (error) toast.error("Failed to delete class");
    else { toast.success("Class deleted"); fetchClasses(); }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Student Information System</h1>
            <p className="text-muted-foreground">View and manage student profiles by class</p>
          </div>
          {hasRole("dos") && <AddClassDialog onClassAdded={fetchClasses} />}
        </div>

        {isLoading ? (
          <div className="text-center py-12"><p className="text-muted-foreground">Loading classes...</p></div>
        ) : classes.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No Classes Found</CardTitle>
              <CardDescription>Start by adding a class to organize your students</CardDescription>
            </CardHeader>
            <CardContent>
              {hasRole("dos") && <AddClassDialog onClassAdded={fetchClasses} />}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {classes.map((classItem) => (
              <Link key={classItem.id} to={`/sis/class/${classItem.id}`}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-xl">{classItem.name}</CardTitle>
                        {classItem.grade_level && <CardDescription>{classItem.grade_level}</CardDescription>}
                        <p className="text-sm text-muted-foreground">{classItem.student_count} student{classItem.student_count !== 1 ? "s" : ""}</p>
                      </div>
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Users className="w-6 h-6 text-primary" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Button variant="secondary" size="sm" className="flex-1">View Students</Button>
                      {hasRole("dos") && (
                        <Button variant="outline" size="icon" className="shrink-0 text-destructive" onClick={(e) => handleDeleteClass(e, classItem.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default SIS;
