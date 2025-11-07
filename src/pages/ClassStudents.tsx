import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, User } from "lucide-react";

interface Student {
  id: string;
  student_id: string;
  name: string;
  gender: string;
  photo_url: string | null;
  total_marks: number;
}

const ClassStudents = () => {
  const { classId } = useParams();
  const [className, setClassName] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (classId) {
      fetchClassAndStudents();
    }
  }, [classId]);

  const fetchClassAndStudents = async () => {
    setIsLoading(true);

    // Fetch class details
    const { data: classData } = await supabase
      .from("classes")
      .select("name")
      .eq("id", classId)
      .single();

    if (classData) {
      setClassName(classData.name);
    }

    // Fetch students
    const { data: studentsData } = await supabase
      .from("students")
      .select("*")
      .eq("class_id", classId)
      .order("name");

    if (studentsData) {
      setStudents(studentsData);
    }

    setIsLoading(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/sis">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight">{className}</h1>
            <p className="text-muted-foreground">Student profiles and information</p>
          </div>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Add Student
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading students...</p>
          </div>
        ) : students.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <User className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Students Found</h3>
              <p className="text-muted-foreground mb-4">
                Start adding students to this class
              </p>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Add First Student
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {students.map((student) => (
              <Link key={student.id} to={`/sis/student/${student.id}`}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center text-center space-y-4">
                      <Avatar className="w-20 h-20">
                        <AvatarImage src={student.photo_url || undefined} />
                        <AvatarFallback className="text-lg bg-primary/10 text-primary">
                          {getInitials(student.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-1 w-full">
                        <h3 className="font-semibold text-lg">{student.name}</h3>
                        <p className="text-sm text-muted-foreground">{student.student_id}</p>
                        <Badge
                          variant={student.total_marks >= 80 ? "default" : student.total_marks >= 60 ? "secondary" : "destructive"}
                          className="mt-2"
                        >
                          {student.total_marks} marks
                        </Badge>
                      </div>
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

export default ClassStudents;