import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Users, Shield, BarChart3 } from "lucide-react";

const About = () => {
  const features = [
    {
      icon: Users,
      title: "Student Information System",
      description: "Comprehensive student profiles with photo, marks, and class management.",
    },
    {
      icon: Shield,
      title: "Discipline Management",
      description: "Track incidents, deduct marks, and manage student permissions effectively.",
    },
    {
      icon: BarChart3,
      title: "Analytics & Reports",
      description: "Visualize discipline trends and generate detailed reports.",
    },
    {
      icon: GraduationCap,
      title: "Role-Based Access",
      description: "Secure access for DOD, DOS, Principal, Teachers, and Discipline Staff.",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-4">
            <GraduationCap className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">About SDMS</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            School Discipline Management System is a comprehensive platform designed to help
            schools manage student discipline, track incidents, and maintain accurate records.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title}>
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{feature.title}</CardTitle>
                      <CardDescription className="mt-1">{feature.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>System Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between py-2 border-b">
              <span className="font-medium">Version</span>
              <span className="text-muted-foreground">1.0.0</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="font-medium">Built with</span>
              <span className="text-muted-foreground">React + Lovable Cloud</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="font-medium">Purpose</span>
              <span className="text-muted-foreground">School Discipline Management</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default About;