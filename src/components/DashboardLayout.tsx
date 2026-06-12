import { useEffect, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Home, Users, Bell, Calendar, FileText, Info, LogOut, GraduationCap, Menu, X,
  AlertTriangle, BarChart3, ScrollText, Shield, MessageSquare,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, session, profile, userRole, hasRole, isLoading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!isLoading && !session) {
      navigate("/auth");
    }
  }, [session, isLoading, navigate]);

  useEffect(() => {
    if (user) fetchUnreadCount();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("unread-count")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => {
        fetchUnreadCount();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const fetchUnreadCount = async () => {
    if (!user) return;
    const { count } = await supabase.from("notifications").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("is_read", false);
    setUnreadCount(count || 0);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate("/auth");
  };

  const roleLabel = userRole ? userRole.replace("_", " ").replace(/\b\w/g, (c: string) => c.toUpperCase()) : "";

  const navItems = [
    { name: "Home", path: "/dashboard", icon: Home },
    { name: "SIS", path: "/sis", icon: Users },
    ...(hasRole("teacher", "discipline_staff") ? [{ name: "Report", path: "/report", icon: AlertTriangle }] : []),
    { name: "Chat", path: "/chat", icon: MessageSquare },
    { name: "Notifications", path: "/notifications", icon: Bell, badge: unreadCount },
    { name: "Calendar", path: "/calendar", icon: Calendar },
    ...(hasRole("dod") ? [{ name: "Reports", path: "/reports", icon: FileText }] : []),
    ...(hasRole("principal", "dos") ? [{ name: "Analytics", path: "/analytics", icon: BarChart3 }] : []),
    ...(hasRole("principal") ? [{ name: "Users", path: "/user-management", icon: Shield }] : []),
    ...(hasRole("principal", "dos", "dod") ? [{ name: "Audit Logs", path: "/audit-logs", icon: ScrollText }] : []),
    { name: "About", path: "/about", icon: Info },
  ];

  const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;

  return (
    <div className="min-h-screen bg-app">
      <header className="sticky top-0 z-40 border-b border-border bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/75">
        <div className="container flex h-16 items-center justify-between px-4">
          <Link to="/dashboard" className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-primary to-blue-500 rounded-lg flex items-center justify-center shrink-0 shadow-sm">
              <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-foreground leading-tight truncate">SDMS</h1>
              <p className="hidden sm:block text-xs text-slate-600 truncate">School Discipline Management</p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-0.5">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link key={item.path} to={item.path}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`gap-2 relative h-9 rounded-full px-3.5 font-medium transition-colors ${
                      isActive
                        ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground shadow-sm"
                        : "text-slate-700 hover:bg-slate-100 hover:text-foreground"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.name}
                    {item.badge ? (
                      <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 px-1 text-[10px]">
                        {item.badge}
                      </Badge>
                    ) : null}
                  </Button>
                </Link>
              );
            })}
          </nav>


          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar>
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {profile ? getInitials(profile.full_name) : "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{profile?.full_name || "User"}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                    {roleLabel && <p className="text-xs text-primary">{roleLabel}</p>}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}><LogOut className="mr-2 h-4 w-4" /> Sign Out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-card p-4">
            <nav className="flex flex-col gap-2">
              {navItems.map(item => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link key={item.path} to={item.path} onClick={() => setMobileMenuOpen(false)}>
                    <Button variant={isActive ? "default" : "ghost"} size="sm" className="w-full justify-start gap-2">
                      <Icon className="w-4 h-4" />
                      {item.name}
                      {item.badge ? <Badge variant="destructive" className="ml-auto">{item.badge}</Badge> : null}
                    </Button>
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </header>

      <main className="container mx-auto p-4 md:p-6 lg:p-8 pb-24 md:pb-8">{children}</main>
    </div>
  );
};

export default DashboardLayout;
