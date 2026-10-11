import { useAdminData } from '@/data/context';
import { cn } from '@/lib/utils';
import {
  CalendarDays,
  ClipboardCheck,
  GraduationCap,
  LayoutDashboard,
  LifeBuoy,
  GraduationCap as LogoIcon,
  Megaphone,
  Settings,
  Users,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/students', label: 'Student Directory', icon: Users },
  { to: '/enrollment', label: 'Enrollment & COR', icon: ClipboardCheck },
  { to: '/grades', label: 'Academic Records', icon: GraduationCap },
  { to: '/schedules', label: 'Class Schedules', icon: CalendarDays },
  { to: '/announcements', label: 'Announcements', icon: Megaphone },
  { to: '/helpdesk', label: 'Support Helpdesk', icon: LifeBuoy },
  { to: '/settings', label: 'Settings', icon: Settings },
];

interface SidebarProps {
  onNavigate?: () => void;
  className?: string;
}

export function Sidebar({ onNavigate, className }: SidebarProps) {
  const {
    state: { settings },
  } = useAdminData();
  return (
    <div className={cn('flex h-full flex-col bg-white', className)}>
      {/* Logo / Brand */}
      <div className="flex h-16 items-center gap-3 border-b border-border px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <LogoIcon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold leading-tight text-foreground">
            University Admin
          </p>
          <p className="text-xs text-muted-foreground">Portal</p>
        </div>
      </div>

      {/* Navigation */}
      <nav
        aria-label="Admin navigation"
        className="flex-1 space-y-1 overflow-y-auto scrollbar-thin px-3 py-4"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )
              }
            >
              <Icon className="h-5 w-5 shrink-0" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-border px-6 py-4">
        <p className="text-xs text-muted-foreground">
          AY {settings.academicYear}
        </p>
        <p className="text-xs font-medium text-foreground">
          {settings.semester}
        </p>
      </div>
    </div>
  );
}
