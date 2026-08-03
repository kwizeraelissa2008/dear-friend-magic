import { Link, useLocation } from "react-router-dom";
import {
  Home,
  Users,
  Bell,
  Calendar,
  FileText,
  Info,
  GraduationCap,
  AlertTriangle,
  BarChart3,
  ScrollText,
  Shield,
  MessageSquare,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";

interface AppSidebarProps {
  unreadCount?: number;
}

const AppSidebar = ({ unreadCount = 0 }: AppSidebarProps) => {
  const { hasRole } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();

  const main = [
    { name: "Home", path: "/dashboard", icon: Home },
    { name: "Students", path: "/sis", icon: Users },
    { name: "Chat", path: "/chat", icon: MessageSquare },
    {
      name: "Notifications",
      path: "/notifications",
      icon: Bell,
      badge: unreadCount,
    },
    { name: "Calendar", path: "/calendar", icon: Calendar },
  ];

  const work = [
    ...(hasRole("teacher", "discipline_staff")
      ? [{ name: "Report Incident", path: "/report", icon: AlertTriangle }]
      : []),
    ...(hasRole("dod")
      ? [{ name: "Reports", path: "/reports", icon: FileText }]
      : []),
    ...(hasRole("principal", "dos")
      ? [{ name: "Analytics", path: "/analytics", icon: BarChart3 }]
      : []),
  ];

  const admin = [
    ...(hasRole("principal")
      ? [{ name: "Users", path: "/user-management", icon: Shield }]
      : []),
    ...(hasRole("principal", "dos", "dod")
      ? [{ name: "Audit Logs", path: "/audit-logs", icon: ScrollText }]
      : []),
    { name: "About", path: "/about", icon: Info },
  ];

  const renderGroup = (label: string, items: typeof main) => {
    if (items.length === 0) return null;
    return (
      <SidebarGroup>
        {!collapsed && (
          <SidebarGroupLabel className="text-[11px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/45">
            {label}
          </SidebarGroupLabel>
        )}
        <SidebarGroupContent>
          <SidebarMenu>
            {items.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.path;
              return (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    tooltip={item.name}
                    className="h-10 rounded-xl text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:shadow-[0_8px_24px_-12px_hsl(var(--primary))]"
                  >
                    <Link to={item.path} className="flex items-center gap-3">
                      <Icon className="h-[18px] w-[18px] shrink-0" />
                      {!collapsed && (
                        <span className="truncate text-sm font-medium">
                          {item.name}
                        </span>
                      )}
                      {!collapsed && "badge" in item && item.badge ? (
                        <Badge
                          variant="destructive"
                          className="ml-auto h-5 min-w-5 justify-center px-1 text-[10px]"
                        >
                          {item.badge}
                        </Badge>
                      ) : null}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border/60 px-3 py-4">
        <Link to="/dashboard" className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary shadow-[0_10px_30px_-12px_hsl(var(--primary))]">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate font-display text-sm font-bold text-sidebar-foreground">
                SDMS
              </p>
              <p className="truncate text-[11px] text-sidebar-foreground/50">
                Ecole des Sciences Byimana
              </p>
            </div>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2 py-2">
        {renderGroup("Overview", main)}
        {renderGroup("Workflows", work)}
        {renderGroup("System", admin)}
      </SidebarContent>
    </Sidebar>
  );
};

export default AppSidebar;
