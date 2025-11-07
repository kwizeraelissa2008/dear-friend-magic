import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Users } from "lucide-react";
import { Link } from "react-router-dom";

interface Class {
  id: string;
  name: string;
  grade_level: string | null;
}

const SIS = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("classes")
      .select("*")
      .order("name");

    if (data) {
      setClasses(data);
    }
    setIsLoading(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Student Information System</h1>
            <p className="text-muted-foreground">
              View and manage student profiles by class
            </p>
          </div>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Add Class
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading classes...</p>
          </div>
        ) : classes.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No Classes Found</CardTitle>
              <CardDescription>
                Start by adding a class to organize your students
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Add Your First Class
              </Button>
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
                        {classItem.grade_level && (
                          <CardDescription>{classItem.grade_level}</CardDescription>
                        )}
                      </div>
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Users className="w-6 h-6 text-primary" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button variant="secondary" size="sm" className="w-full">
                      View Students
                    </Button>
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