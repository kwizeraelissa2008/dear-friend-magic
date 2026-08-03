import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Compass, Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
    document.title = "Page Not Found — SDMS";
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="text-center space-y-6 max-w-md">
        <div className="mx-auto w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
          <Compass className="w-12 h-12 text-primary" />
        </div>
        <div className="space-y-2">
          <h1 className="text-6xl font-bold tracking-tight">404</h1>
          <p className="text-xl font-medium">Page not found</p>
          <p className="text-sm text-muted-foreground">
            The page{" "}
            <code className="px-1.5 py-0.5 rounded bg-muted text-xs">
              {location.pathname}
            </code>{" "}
            does not exist or has been moved.
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link to="/">
            <Home className="w-4 h-4" /> Return Home
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
