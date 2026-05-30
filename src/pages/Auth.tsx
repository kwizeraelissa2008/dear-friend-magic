import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { toast } from "sonner";
import { GraduationCap, Loader2, ArrowLeft } from "lucide-react";

const emailSchema = z.string().trim().email("Enter a valid email").max(255);
const passwordSchema = z.string().min(6, "Password must be at least 6 characters").max(72, "Password too long");
const signUpSchema = z.object({
  fullName: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: emailSchema,
  password: passwordSchema,
});

const Auth = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) checkStatusAndRedirect(session.user.id);
    });
  }, []);

  const checkStatusAndRedirect = async (userId: string) => {
    const { data: profile } = await supabase.from("profiles").select("status").eq("id", userId).single();
    if (profile?.status === "pending") {
      toast.info("Your account is pending approval by the Principal.");
      await supabase.auth.signOut();
      return;
    }
    if (profile?.status === "rejected") {
      toast.error("Your account request was rejected.");
      await supabase.auth.signOut();
      return;
    }
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle();
    const role = data?.role;
    switch (role) {
      case "dod": navigate("/reports"); break;
      case "dos": navigate("/sis"); break;
      case "principal": navigate("/analytics"); break;
      case "teacher": navigate("/report"); break;
      case "discipline_staff": navigate("/report"); break;
      default: navigate("/"); break;
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signUpSchema.safeParse({ fullName, email, password });
    if (!parsed.success) { toast.error(parsed.error.errors[0]?.message); return; }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: { data: { full_name: parsed.data.fullName }, emailRedirectTo: `${window.location.origin}/` },
      });
      if (error) throw error;
      toast.success("Account created! Your account is pending approval by the Principal. Please check your email to verify.");
    } catch (error: any) {
      toast.error(error.message || "Failed to create account");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data.user) {
        // Check approval status
        const { data: profile } = await supabase.from("profiles").select("status").eq("id", data.user.id).single();
        if (profile?.status === "pending") {
          toast.info("Your account is pending approval by the Principal.");
          await supabase.auth.signOut();
          return;
        }
        if (profile?.status === "rejected") {
          toast.error("Your account request was rejected.");
          await supabase.auth.signOut();
          return;
        }
        toast.success("Signed in successfully!");
        await checkStatusAndRedirect(data.user.id);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to sign in");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) { toast.error("Please enter your email"); return; }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("Password reset link sent! Check your email.");
      setShowForgotPassword(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to send reset link");
    } finally {
      setIsLoading(false);
    }
  };

  const BrandPanel = () => (
    <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-primary via-primary to-accent text-primary-foreground relative overflow-hidden">
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, white 2px, transparent 2px), radial-gradient(circle at 80% 60%, white 2px, transparent 2px)", backgroundSize: "60px 60px" }} />
      <div className="relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary-foreground/20 backdrop-blur rounded-xl flex items-center justify-center">
            <GraduationCap className="w-7 h-7" />
          </div>
          <div>
            <h2 className="font-bold text-lg leading-tight">Ecole des Sciences</h2>
            <p className="text-sm opacity-90">Byimana</p>
          </div>
        </div>
      </div>
      <div className="relative z-10 space-y-6">
        <div>
          <h1 className="text-4xl font-bold leading-tight">Discipline Management System</h1>
          <p className="mt-4 text-lg opacity-90">Empowering Ecole des Sciences Byimana with structured discipline, transparent records, and real-time collaboration.</p>
        </div>
        <div className="grid grid-cols-2 gap-4 pt-4">
          <div className="bg-primary-foreground/10 backdrop-blur rounded-lg p-4 border border-primary-foreground/20">
            <p className="text-2xl font-bold">Secure</p>
            <p className="text-xs opacity-80">Controlled access</p>
          </div>
          <div className="bg-primary-foreground/10 backdrop-blur rounded-lg p-4 border border-primary-foreground/20">
            <p className="text-2xl font-bold">Smart</p>
            <p className="text-xs opacity-80">AI-powered</p>
          </div>
        </div>
      </div>
      <div className="relative z-10 text-xs opacity-70">© {new Date().getFullYear()} Ecole des Sciences Byimana</div>
    </div>
  );

  if (showForgotPassword) {
    return (
      <div className="min-h-screen grid lg:grid-cols-2">
        <BrandPanel />
        <div className="flex items-center justify-center p-4 sm:p-8 bg-background">
          <Card className="w-full max-w-md border-0 shadow-none lg:shadow-lg">
            <CardHeader className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center lg:hidden">
                <GraduationCap className="w-10 h-10 text-primary-foreground" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
                <CardDescription>Enter your email to receive a password reset link</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <Input id="reset-email" type="email" placeholder="name@school.edu" value={resetEmail} onChange={e => setResetEmail(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send Reset Link
                </Button>
                <Button type="button" variant="ghost" className="w-full gap-2" onClick={() => setShowForgotPassword(false)}>
                  <ArrowLeft className="w-4 h-4" /> Back to Sign In
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <BrandPanel />
      <div className="flex items-center justify-center p-4 sm:p-8 bg-background">
        <Card className="w-full max-w-md border-0 shadow-none lg:shadow-lg">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center lg:hidden">
              <GraduationCap className="w-10 h-10 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
              <CardDescription>Sign in to Ecole des Sciences Byimana SDMS</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input id="signin-email" type="email" placeholder="name@school.edu" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input id="signin-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign In
                </Button>
                <Button type="button" variant="link" className="w-full text-sm" onClick={() => setShowForgotPassword(true)}>
                  Forgot your password?
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full Name</Label>
                  <Input id="signup-name" type="text" placeholder="John Doe" value={fullName} onChange={e => setFullName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input id="signup-email" type="email" placeholder="name@school.edu" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input id="signup-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Account
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  New accounts require approval by the Principal before access is granted.
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      </div>
    </div>
  );
};

export default Auth;
