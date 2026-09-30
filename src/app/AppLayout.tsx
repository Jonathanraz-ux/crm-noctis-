import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Building2,
  ChevronLeft,
  Kanban,
  LogOut,
  Menu,
  Moon,
  Sun,
  Users,
  LayoutDashboard,
  UserSearch,
  Contact2,
  ListChecks,
  ScrollText,
  ShieldCheck,
  Settings,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Avatar,
  AvatarFallback,
  Badge,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/primitives';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/providers/ToastProvider';
import { ROLE_LABELS, product, storageKeys } from '@/config/product';
import { cn } from '@/lib/utils';
import { isSupabaseConfigured } from '@/lib/supabase';
import { NotConfiguredNotice } from './NotConfiguredNotice';

/**
 * The application shell: sidebar, topbar, and the routed content area.
 *
 * Every CRM screen renders inside it. The sidebar shows CRM-domain navigation.
 * Enforcement is the RLS policies, not this list.
 */
const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/prospects', label: 'Prospects', icon: UserSearch },
  { to: '/contacts', label: 'Contacts', icon: Contact2 },
  { to: '/pipeline', label: 'Pipeline', icon: Kanban },
  { to: '/tasks', label: 'Tasks', icon: ListChecks },
  { to: '/members', label: 'Members', icon: Users },
  { to: '/roles', label: 'Roles', icon: ShieldCheck },
  { to: '/audit', label: 'Audit', icon: ScrollText },
  { to: '/settings', label: 'Settings', icon: Settings },
] as const;

function useSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(storageKeys.sidebarCollapsed) === 'true';
  });
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const toggle = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    localStorage.setItem(storageKeys.sidebarCollapsed, String(next));
  };

  const closeMobile = () => setIsMobileOpen(false);

  return { isCollapsed, toggle, isMobileOpen, setIsMobileOpen, closeMobile };
}

function useThemeToggle() {
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains('dark'),
  );

  const cycle = () => {
    const root = document.documentElement;
    const nextDark = !root.classList.contains('dark');
    if (nextDark) {
      root.classList.add('dark');
      localStorage.setItem(storageKeys.theme, 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem(storageKeys.theme, 'light');
    }
    setIsDark(nextDark);
  };

  return { isDark, cycle };
}

export function AppLayout({ children }: { children?: ReactNode }) {
  const { isCollapsed, toggle, isMobileOpen, setIsMobileOpen, closeMobile } =
    useSidebar();
  const location = useLocation();

  return (
    <TooltipProvider delayDuration={200}>
      <div className="bg-surface-subtle flex h-full min-h-screen">
        <a
          href="#main"
          className="sr-only-focusable bg-primary text-on-primary absolute top-3 left-3 z-50 rounded-md px-3 py-2 text-sm"
        >
          Skip to content
        </a>

        {/* --------------------------------------------------------- sidebar */}
        <aside
          className={cn(
            'border-line bg-surface fixed inset-y-0 left-0 z-40 flex shrink-0 flex-col border-r',
            'transition-[width,transform] duration-200 lg:static lg:translate-x-0',
            'w-64 lg:w-64',
            isCollapsed ? 'lg:w-16' : 'lg:w-64',
            isMobileOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <div className="border-line flex h-14 items-center gap-2 border-b px-4">
            <span className="bg-primary text-on-primary grid size-7 shrink-0 place-items-center rounded-md">
              <Kanban className="size-4" />
            </span>
            {!isCollapsed && (
              <span className="truncate text-sm font-semibold">
                {product.shortName}
              </span>
            )}
          </div>

          <div className="px-3 pt-4">
            <WorkspaceSwitcher collapsed={isCollapsed} />
          </div>

          <nav
            className="scrollbar-slim mt-3 flex-1 space-y-0.5 overflow-y-auto px-2 pb-4"
            aria-label="Main"
          >
            {NAV.map((item) => (
              <SidebarLink
                key={item.to}
                {...item}
                collapsed={isCollapsed}
                onNavigate={closeMobile}
              />
            ))}
          </nav>

          <div className="border-line border-t p-2">
            <Button
              variant="ghost"
              size={isCollapsed ? 'icon' : 'sm'}
              onClick={toggle}
              className={cn(
                'w-full justify-start gap-2',
                isCollapsed && 'justify-center',
              )}
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <ChevronLeft
                className={cn(
                  'transition-transform',
                  isCollapsed && 'rotate-180',
                )}
              />
              {!isCollapsed && 'Collapse'}
            </Button>
          </div>
        </aside>

        {isMobileOpen ? (
          <button
            type="button"
            className="fixed inset-0 z-30 bg-black/40 lg:hidden"
            onClick={closeMobile}
            aria-label="Close navigation"
          />
        ) : null}

        {/* ---------------------------------------------------------- content */}
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar onOpenNav={() => setIsMobileOpen(true)} />

          <main
            id="main"
            className="scrollbar-slim flex-1 overflow-y-auto"
            tabIndex={-1}
            key={location.pathname}
          >
            <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
              {isSupabaseConfigured ? null : <NotConfiguredNotice />}
              {children ?? <Outlet />}
            </div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}

function SidebarLink({
  to,
  label,
  icon: Icon,
  end,
  collapsed,
  onNavigate,
}: {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
  collapsed: boolean;
  onNavigate: () => void;
}) {
  const link = (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
          'focus-visible:outline-primary focus-visible:outline-2 focus-visible:outline-offset-2',
          isActive
            ? 'bg-primary-soft text-primary'
            : 'text-foreground-muted hover:bg-surface-muted hover:text-foreground',
          collapsed && 'justify-center px-0',
        )
      }
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      {!collapsed && <span className="truncate">{label}</span>}
    </NavLink>
  );

  return collapsed ? (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="block">{link}</span>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  ) : (
    link
  );
}

function WorkspaceSwitcher({ collapsed }: { collapsed: boolean }) {
  const { organizations, activeOrganization, setActiveOrganizationId, role } =
    useAuth();

  if (organizations.length === 0) {
    return (
      <div className="border-line text-foreground-muted rounded-md border border-dashed px-3 py-2.5 text-xs">
        {collapsed ? '—' : 'No workspace yet'}
      </div>
    );
  }

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="border-line bg-surface-subtle rounded-md border px-2 py-2 text-center">
            <Building2
              className="text-foreground-subtle mx-auto size-4"
              aria-hidden
            />
          </div>
        </TooltipTrigger>
        <TooltipContent side="right">
          {activeOrganization?.name ?? 'Workspace'}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="border-line bg-surface-subtle hover:bg-surface-muted flex w-full items-center gap-2 rounded-md border px-2.5 py-2 text-left transition-colors"
        >
          <Building2
            className="text-foreground-subtle size-4 shrink-0"
            aria-hidden
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">
              {activeOrganization?.name ?? '—'}
            </span>
            <span className="text-foreground-muted block truncate text-xs">
              {role ? (ROLE_LABELS[role] ?? role) : 'No role'}
            </span>
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-60" align="start">
        <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
        {organizations.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onSelect={() => setActiveOrganizationId(org.id)}
            className={cn(
              org.id === activeOrganization?.id &&
                'bg-surface-muted font-medium',
            )}
          >
            <Building2 className="size-4" aria-hidden />
            <span className="truncate">{org.name}</span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <NavLink to="/settings">Workspace settings</NavLink>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Topbar({ onOpenNav }: { onOpenNav: () => void }) {
  const { profile, user, role, signOut } = useAuth();
  const { isDark, cycle } = useThemeToggle();
  const { success } = useToast();
  const [signingOut, setSigningOut] = useState(false);

  const initials =
    profile?.full_name
      ?.split(' ')
      .map((w: string) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) ??
    user?.email?.[0]?.toUpperCase() ??
    '?';

  return (
    <header className="border-line bg-surface flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onOpenNav}
        aria-label="Open navigation"
      >
        <Menu />
      </Button>

      <div className="flex-1" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={cycle}
            aria-label="Switch colour theme"
          >
            {isDark ? <Moon /> : <Sun />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {isDark ? 'Switch to light' : 'Switch to dark'}
        </TooltipContent>
      </Tooltip>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="hover:bg-surface-muted flex items-center gap-2 rounded-md py-1 pr-2 pl-1 transition-colors"
          >
            <Avatar className="size-8">
              <AvatarFallback className="text-[10px]">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="hidden text-left sm:block">
              <span className="block max-w-40 truncate text-sm font-medium">
                {profile?.full_name ?? user?.email ?? 'Account'}
              </span>
              <span className="text-foreground-muted block text-xs">
                {role ? (ROLE_LABELS[role] ?? role) : 'No role'}
              </span>
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64" align="end">
          <div className="px-2.5 py-2">
            <p className="truncate text-sm font-medium">
              {profile?.full_name ?? 'Account'}
            </p>
            <p className="text-foreground-muted truncate text-xs">
              {user?.email}
            </p>
            {role ? (
              <Badge variant="default" className="mt-1.5">
                {ROLE_LABELS[role] ?? role}
              </Badge>
            ) : null}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <NavLink to="/settings">Settings</NavLink>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={signingOut}
            onSelect={async () => {
              setSigningOut(true);
              try {
                await signOut();
                success('Signed out');
              } finally {
                setSigningOut(false);
              }
            }}
            className="text-danger data-[disabled]:text-danger"
          >
            <LogOut className="size-4" aria-hidden />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
