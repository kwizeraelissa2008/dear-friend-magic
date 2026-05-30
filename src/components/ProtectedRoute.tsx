import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, AppRole } from "@/hooks/useAuth";
import { Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProtectedRouteProps {
  children: ReactNode;
  roles?: AppRole[];
}

const ProtectedRoute = ({ children, roles }: ProtectedRouteProps) => {
  const { session, userRole, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !session) navigate("/auth", { replace: true });
  }, [isLoading, session, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) return null;

  if (roles && roles.length > 0 && (!userRole || !roles.includes(userRole))) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <ShieldAlert className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground text-sm">
            You don't have permission to view this page. Contact your Principal if you believe this is a mistake.
          </p>
          <Button onClick={() => navigate("/")}>Go to Dashboard</Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
