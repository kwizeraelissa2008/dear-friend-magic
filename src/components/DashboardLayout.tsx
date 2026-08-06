import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar";
import InstallPrompt from "@/components/InstallPrompt";
import { toast } from "sonner";
import { Bell, LogOut, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const navigate = useNavigate();
  const { user, session, profile, userRole, isLoading } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!isLoading && !session) navigate("/auth");
  }, [session, isLoading, navigate]);

  useEffect(() => {
    if (user) fetchUnreadCount();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("unread-count")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchUnreadCount();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchUnreadCount = async () => {
    if (!user) return;
    const { count } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
    setUnreadCount(count || 0);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate("/auth");
  };

  const roleLabel = userRole
    ? userRole
        .replace("_", " ")
        .replace(/\b\w/g, (c: string) => c.toUpperCase())
    : "";

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-[100dvh] w-full bg-app">
        <AppSidebar unreadCount={unreadCount} />

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
            <div className="flex h-14 items-center gap-2 px-3 sm:px-5">
              <SidebarTrigger className="h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground" />

              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-sm font-semibold text-foreground">
                  {profile?.full_name || "Welcome"}
                </p>
                {roleLabel && (
                  <p className="truncate text-[11px] text-muted-foreground">
                    {roleLabel}
                  </p>
                )}
              </div>

              <Button
                asChild
                variant="ghost"
                size="icon"
                className="relative h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground"
              >
                <Link to="/notifications" aria-label="Notifications">
                  <Bell className="h-[18px] w-[18px]" />
                  {unreadCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -right-0.5 -top-0.5 h-4 min-w-4 justify-center p-0 px-1 text-[10px]"
                    >
                      {unreadCount}
                    </Badge>
                  )}
                </Link>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                        {profile ? getInitials(profile.full_name) : "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">
                        {profile?.full_name || "User"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {user?.email}
                      </p>
                      {roleLabel && (
                        <p className="text-xs text-primary">{roleLabel}</p>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" /> Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <main className="relative flex-1 overflow-hidden p-4 pb-[calc(7rem+env(safe-area-inset-bottom))] sm:p-6 lg:p-8 md:pb-10">
            <div
              className="aurora-orb -left-24 top-10 h-72 w-72"
              style={{ background: "hsl(217 91% 60% / 0.28)" }}
              aria-hidden
            />
            <div
              className="aurora-orb -right-16 top-1/3 h-80 w-80"
              style={{ background: "hsl(160 84% 45% / 0.16)", animationDelay: "-6s" }}
              aria-hidden
            />
            <div className="relative mx-auto w-full max-w-6xl animate-fade-in">
              {children}
            </div>
          </main>
        </div>
        <InstallPrompt />
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
