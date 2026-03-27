import {
  BarChart3,
  BookOpen,
  Compass,
  Download,
  HelpCircle,
  Inbox,
  Kanban,
  LayoutDashboard,
  LogOut,
  Moon,
  PanelLeft,
  PanelLeftClose,
  Settings,
  Shield,
  Sparkles,
  Sun,
  Upload,
} from "lucide-react";
import { type NavigateFunction, useLocation } from "react-router-dom";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { featureFlags } from "@/lib/feature-flags";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type { Novel } from "@/types/novel";

export type AppSidebarProps = {
  navigate: NavigateFunction;
  onCloseMobile?: () => void;
  inboxUnassigned: number;
  ideaWebTotal: number;
  novels: Novel[];
  setActiveNovel: (id: string) => void;
  user: { name?: string | null; avatarUrl?: string | null } | null;
  onSecurity: () => void;
  onImport: () => void;
  onExport: () => void;
  onSignOut: () => void;
  settingsEnabled: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
};

export function AppSidebar({
  navigate,
  onCloseMobile,
  inboxUnassigned,
  ideaWebTotal,
  novels,
  setActiveNovel,
  user,
  onSecurity,
  onImport,
  onExport,
  onSignOut,
  settingsEnabled,
  collapsed,
  onToggleCollapse,
}: AppSidebarProps) {
  const close = () => onCloseMobile?.();
  const { pathname } = useLocation();
  const { preferences, updatePreferences } = useAuth();

  const isDark = preferences?.theme === "dark";

  const toggleTheme = () => {
    void updatePreferences({ theme: isDark ? "light" : "dark" });
  };

  const displayName = user?.name?.split(/\s+/)[0] ?? "Writer";

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  const navBtn = (active: boolean) =>
    cn(
      "flex min-h-[44px] w-full items-center gap-3 rounded-md py-2 text-left text-sm font-medium transition-colors md:min-h-0",
      collapsed ? "justify-center px-2" : "px-3",
      active
        ? "bg-sidebar-primary/10 text-sidebar-primary font-semibold"
        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
    );

  const NavItem = ({
    to,
    icon: Icon,
    label,
    badge,
  }: {
    to: string;
    icon: typeof LayoutDashboard;
    label: string;
    badge?: number;
  }) => {
    const active = isActive(to);
    const button = (
      <button
        type="button"
        className={navBtn(active)}
        aria-current={active ? "page" : undefined}
        aria-label={collapsed ? label : undefined}
        onClick={() => {
          navigate(to);
          close();
        }}
      >
        <Icon className="h-4 w-4 shrink-0" aria-hidden />
        {!collapsed && <span className="flex-1 truncate">{label}</span>}
        {!collapsed && badge != null && badge > 0 && (
          <span className="rounded-full bg-sidebar-primary/15 px-2 py-0.5 text-xs font-semibold tabular-nums text-sidebar-primary">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </button>
    );

    if (collapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {label}
            {badge != null && badge > 0 ? ` (${badge})` : ""}
          </TooltipContent>
        </Tooltip>
      );
    }
    return button;
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {/* Logo / brand */}
      <div className={cn("shrink-0 border-b border-sidebar-border pb-4 pt-6", collapsed ? "px-2" : "px-4")}>
        <div className="flex items-start gap-2">
          <button
            type="button"
            onClick={() => {
              navigate("/");
              close();
            }}
            aria-label="OdinPad home"
            className={cn(
              "flex min-w-0 flex-1 items-center gap-2 rounded-md text-left transition-colors hover:bg-sidebar-accent",
              collapsed && "justify-center",
            )}
          >
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"
              aria-hidden
            >
              <Sparkles className="h-4.5 w-4.5" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-base font-semibold tracking-tight text-sidebar-foreground">OdinPad</p>
                <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Studio</p>
              </div>
            )}
          </button>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="hidden min-h-11 min-w-11 shrink-0 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground md:inline-flex md:min-h-8 md:min-w-8"
                onClick={onToggleCollapse}
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {collapsed ? (
                  <PanelLeft className="h-4 w-4" aria-hidden />
                ) : (
                  <PanelLeftClose className="h-4 w-4" aria-hidden />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {collapsed ? "Expand sidebar" : "Collapse sidebar"}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex shrink-0 flex-col gap-0.5 overflow-hidden px-2 py-3" aria-label="Workspace">
        <NavItem to="/" icon={LayoutDashboard} label="Dashboard" />
        <NavItem to={ROUTES.odyssey} icon={Compass} label="Odyssey" />
        <NavItem to="/stats" icon={BarChart3} label="Stats" />
        <NavItem to="/inbox" icon={Inbox} label="Idea Web" badge={inboxUnassigned} />
        <NavItem to="/library" icon={Kanban} label="Library" badge={novels.length > 0 ? novels.length : undefined} />
        <NavItem to="/help" icon={HelpCircle} label="Help" />
        {settingsEnabled && <NavItem to="/settings" icon={Settings} label="Settings" />}
      </nav>

      {/* Projects list */}
      {!collapsed && (
        <div className="shrink-0 border-t border-sidebar-border px-3 py-3">
          <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Projects
          </p>
          <ul className="space-y-0.5">
            {novels.slice(0, 4).map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => {
                    setActiveNovel(n.id);
                    navigate("/", { replace: true });
                    close();
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-[10px] font-bold text-primary">
                    {n.title.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="truncate font-medium">{n.title}</span>
                </button>
              </li>
            ))}
            {novels.length === 0 && <li className="px-2 text-xs text-muted-foreground">No projects yet</li>}
          </ul>
          {ideaWebTotal > 0 && (
            <p className="mt-2 px-2 text-[10px] text-muted-foreground">{ideaWebTotal} ideas in Idea Web</p>
          )}
        </div>
      )}

      {collapsed && novels.length > 0 && (
        <div className="shrink-0 border-t border-sidebar-border px-2 py-2">
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="mx-auto flex min-h-11 min-w-11 items-center justify-center rounded-md text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground md:min-h-0 md:min-w-0"
                onClick={() => {
                  navigate("/library");
                  close();
                }}
                aria-label={`${novels.length} project${novels.length === 1 ? "" : "s"}. Open Library`}
              >
                <BookOpen className="h-4 w-4" aria-hidden />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-[220px] text-xs">
              {novels.length} project{novels.length === 1 ? "" : "s"} — open Library
            </TooltipContent>
          </Tooltip>
        </div>
      )}

      {/* Bottom: theme toggle + user menu */}
      <div className="mt-auto shrink-0 border-t border-sidebar-border p-2">
        <div
          className={cn(
            "flex items-center gap-2 rounded-lg bg-sidebar-accent/50 p-2",
            collapsed && "flex-col justify-center gap-2",
          )}
        >
          <Avatar className={cn("border border-sidebar-border", collapsed ? "h-9 w-9" : "h-8 w-8")}>
            {user?.avatarUrl ? <AvatarImage src={user.avatarUrl} alt="" /> : null}
            <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
              {displayName.slice(0, 1)}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-sidebar-foreground">{user?.name ?? "Writer"}</p>
              <p className="truncate text-[10px] text-muted-foreground">Workspace</p>
            </div>
          )}
          <div className="flex items-center gap-1">
            {/* Theme toggle */}
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  onClick={toggleTheme}
                  aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
                >
                  {isDark ? <Sun className="h-4 w-4" aria-hidden /> : <Moon className="h-4 w-4" aria-hidden />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side={collapsed ? "right" : "top"}>
                {isDark ? "Light mode" : "Dark mode"}
              </TooltipContent>
            </Tooltip>

            {/* Account menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  aria-label="Account, import, export, and sign out"
                >
                  <Settings className="h-4 w-4" aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                  {user?.name ?? "Account"}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    onSecurity();
                    close();
                  }}
                >
                  <Shield className="mr-2 h-3.5 w-3.5" />
                  Security
                </DropdownMenuItem>
                {settingsEnabled && (
                  <DropdownMenuItem
                    onClick={() => {
                      navigate("/settings");
                      close();
                    }}
                  >
                    <Settings className="mr-2 h-3.5 w-3.5" />
                    Settings
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => {
                    onImport();
                    close();
                  }}
                >
                  <Upload className="mr-2 h-3.5 w-3.5" />
                  Import
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    onExport();
                    close();
                  }}
                >
                  <Download className="mr-2 h-3.5 w-3.5" />
                  Export
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => void onSignOut()}>
                  <LogOut className="mr-2 h-3.5 w-3.5" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
}
