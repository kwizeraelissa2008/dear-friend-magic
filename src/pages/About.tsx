import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Users, Shield, BarChart3, Bot, Heart } from "lucide-react";

const About = () => {
  const features = [
    { icon: Users, title: "Student Information System", description: "Comprehensive student profiles with photo, marks, and class management." },
    { icon: Shield, title: "Discipline Management", description: "Track incidents, deduct marks, and manage student permissions effectively." },
    { icon: BarChart3, title: "Analytics & Reports", description: "Visualize discipline trends and generate detailed reports." },
    { icon: GraduationCap, title: "Role-Based Access", description: "Secure access for DOD, DOS, Principal, Teachers, and Discipline Staff." },
    { icon: Bot, title: "AI Assistant", description: "AI-powered assistant to help staff perform tasks faster and get instant guidance." },
  ];

  const team = [
    { name: "Kwizera Elissa", role: "Founder & Lead Developer", description: "Student at Ecole des Sciences Byimana, passionate about using technology to improve school management." },
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
            <CardTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-destructive" /> Our Team
            </CardTitle>
            <CardDescription>The people behind SDMS</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {team.map((member) => (
              <div key={member.name} className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-primary-foreground font-bold text-lg">
                    {member.name.split(" ").map(n => n[0]).join("")}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold">{member.name}</h3>
                  <p className="text-sm text-primary font-medium">{member.role}</p>
                  <p className="text-sm text-muted-foreground mt-1">{member.description}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default About;
