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
  PanelLeft,
  PanelLeftClose,
  Settings,
  Shield,
  Sparkles,
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

  const displayName = user?.name?.split(/\s+/)[0] ?? "Writer";

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  const navBtn = (active: boolean) =>
    cn(
      "flex min-h-[44px] w-full items-center gap-3 rounded-lg py-2.5 text-left text-sm font-medium transition-colors md:min-h-0",
      collapsed ? "justify-center px-2" : "px-3",
      active
        ? "bg-teal-600 text-white shadow-[3px_3px_0_0_rgb(0_0_0_/_0.25)]"
        : "text-zinc-400 hover:bg-zinc-800 hover:text-white",
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
          <span className="rounded-full bg-teal-500/50 px-2 py-0.5 text-xs font-semibold tabular-nums text-white">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </button>
    );

    if (collapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent side="right" className="border-2 border-neutral-900 bg-[#fdfbf0] font-medium">
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
      <div className={cn("shrink-0 border-b border-zinc-800 pb-4 pt-6", collapsed ? "px-2" : "px-4")}>
        <div className="flex items-start gap-2">
          <button
            type="button"
            onClick={() => {
              navigate("/");
              close();
            }}
            aria-label="OdinPad home"
            className={cn(
              "flex min-w-0 flex-1 items-center gap-2 rounded-lg text-left transition-opacity hover:opacity-90",
              collapsed && "justify-center",
            )}
          >
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-2 border-teal-500/60 bg-teal-600/25"
              aria-hidden
            >
              <Sparkles className="h-5 w-5 text-teal-300" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-lg font-bold tracking-tight text-white">OdinPad</p>
                <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">Studio</p>
              </div>
            )}
          </button>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="hidden min-h-11 min-w-11 shrink-0 text-zinc-400 hover:bg-zinc-800 hover:text-white md:inline-flex md:min-h-9 md:min-w-9"
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
            <TooltipContent side="bottom" className="border-2 border-neutral-900 bg-[#fdfbf0]">
              {collapsed ? "Expand sidebar" : "Collapse sidebar"}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      <nav className="flex shrink-0 flex-col gap-1 overflow-hidden px-2 py-4" aria-label="Workspace">
        <NavItem to="/" icon={LayoutDashboard} label="Dashboard" />
        <NavItem to={ROUTES.odyssey} icon={Compass} label="Odyssey" />
        <NavItem to="/stats" icon={BarChart3} label="Stats" />
        <NavItem to="/inbox" icon={Inbox} label="Idea Web" badge={inboxUnassigned} />
        <NavItem to="/library" icon={Kanban} label="Library" badge={novels.length > 0 ? novels.length : undefined} />
        <NavItem to="/help" icon={HelpCircle} label="Help" />
        {settingsEnabled && <NavItem to="/settings" icon={Settings} label="Settings" />}
      </nav>

      {!collapsed && (
        <div className="shrink-0 border-t border-zinc-800 px-3 py-3">
          <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Projects</p>
          <ul className="space-y-1">
            {novels.slice(0, 4).map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => {
                    setActiveNovel(n.id);
                    navigate("/", { replace: true });
                    close();
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-zinc-600 bg-zinc-800 text-[10px] font-bold text-teal-300">
                    {n.title.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="truncate font-medium">{n.title}</span>
                </button>
              </li>
            ))}
            {novels.length === 0 && <li className="px-2 text-xs text-zinc-500">No projects yet</li>}
          </ul>
          {ideaWebTotal > 0 && <p className="mt-2 px-2 text-[10px] text-zinc-500">{ideaWebTotal} ideas in Idea Web</p>}
        </div>
      )}

      {collapsed && novels.length > 0 && (
        <div className="shrink-0 border-t border-zinc-800 px-2 py-2">
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="mx-auto flex min-h-11 min-w-11 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-800 hover:text-white md:min-h-0 md:min-w-0"
                onClick={() => {
                  navigate("/library");
                  close();
                }}
                aria-label={`${novels.length} project${novels.length === 1 ? "" : "s"}. Open Library`}
              >
                <BookOpen className="h-4 w-4" aria-hidden />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-[220px] border-2 border-neutral-900 bg-[#fdfbf0] text-xs">
              {novels.length} project{novels.length === 1 ? "" : "s"} — open Library
            </TooltipContent>
          </Tooltip>
        </div>
      )}

      <div className="mt-auto shrink-0 border-t border-zinc-800 p-2">
        <div
          className={cn(
            "flex items-center gap-2 rounded-lg bg-zinc-900/80 p-2",
            collapsed && "flex-col justify-center gap-2",
          )}
        >
          <Avatar className={cn("border-2 border-zinc-700", collapsed ? "h-10 w-10" : "h-9 w-9")}>
            {user?.avatarUrl ? <AvatarImage src={user.avatarUrl} alt="" /> : null}
            <AvatarFallback className="bg-teal-600 text-xs font-bold text-white">
              {displayName.slice(0, 1)}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-zinc-100">{user?.name ?? "Writer"}</p>
              <p className="truncate text-[10px] text-zinc-500">Workspace</p>
            </div>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn(
                  "min-h-11 min-w-11 shrink-0 text-zinc-400 hover:bg-zinc-800 hover:text-white md:min-h-8 md:min-w-8",
                  collapsed ? "h-8 w-8" : "h-8 w-8",
                )}
                aria-label="Account, import, export, and sign out"
              >
                <Settings className="h-4 w-4" aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 border-2 border-neutral-900 bg-[#fdfbf0]">
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
  );
}
