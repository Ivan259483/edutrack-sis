import { useAdminSession } from '@/auth/context';
import { ChangePasswordForm } from '@/components/shared/ChangePasswordForm';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAdminCollection, useAdminData } from '@/data/context';
import { formatDate, initials } from '@/lib/domain';
import { searchAdmin } from '@/lib/search';
import { cn } from '@/lib/utils';
import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Search,
  Settings as SettingsIcon,
  User,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const navigate = useNavigate();
  const { state } = useAdminData();
  const { session, signOut } = useAdminSession();
  const [notifList, setNotifList] = useAdminCollection('notifications');
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const results = searchAdmin(state, query);
  const unreadCount = notifList.filter((n) => !n.read).length;

  const handleNotificationClick = (id: string) => {
    const saved = setNotifList((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    if (saved) {
      setNotificationsOpen(false);
      navigate(notifList.find((n) => n.id === id)?.href || '/');
    }
  };

  const handleMarkAllRead = () => {
    setNotifList((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-white/95 px-4 backdrop-blur-sm sm:px-6">
      {/* Mobile menu */}
      <Button
        aria-label="Open navigation"
        variant="ghost"
        size="icon"
        onClick={onMenuClick}
        className="lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Search */}
      <div className="relative min-w-0 flex-1 sm:max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <button
          onClick={() => setSearchOpen(true)}
          aria-label="Search Admin Portal"
          className="h-9 w-full rounded-md bg-muted/50 pl-9 pr-2 text-left text-sm text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="sm:hidden">Search</span>
          <span className="hidden sm:inline">Search the Admin Portal…</span>
        </button>
      </div>

      <div className="ml-auto flex shrink-0 items-center justify-end gap-2">
        {/* Notifications */}
        <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
          <PopoverTrigger asChild>
            <Button
              aria-label={`Notifications, ${unreadCount} unread`}
              variant="ghost"
              size="icon"
              className="relative"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                  {unreadCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="text-sm font-semibold">Notifications</p>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs text-primary hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>
            <ScrollArea className="h-80">
              {notifList.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No notifications
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {notifList.map((notif) => (
                    <button
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif.id)}
                      className={cn(
                        'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50',
                        !notif.read && 'bg-blue-50/50'
                      )}
                    >
                      {!notif.read && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                      )}
                      <div className={cn('flex-1', notif.read && 'pl-5')}>
                        <p className="text-sm font-medium text-foreground">
                          {notif.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {notif.description}
                        </p>
                        <p className="text-xs text-muted-foreground/70 mt-0.5">
                          {formatDate(notif.timestamp)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </PopoverContent>
        </Popover>

        {/* Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label="Admin account menu"
              className="flex items-center gap-2 rounded-lg p-1.5 transition-colors hover:bg-accent"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                  {session ? initials(session.name) : 'AD'}
                </AvatarFallback>
              </Avatar>
              <div className="hidden text-left sm:block">
                <p className="text-sm font-medium leading-tight text-foreground">
                  {session?.name ?? 'Admin'}
                </p>
                <p className="text-xs text-muted-foreground">Administrator</p>
              </div>
              <ChevronDown className="hidden h-4 w-4 text-muted-foreground sm:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <p className="font-medium">{session?.name}</p>
              <p className="text-xs font-normal text-muted-foreground">
                {session?.email}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setProfileOpen(true)}>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              <SettingsIcon className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={signOut}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Admin Profile</DialogTitle>
            <DialogDescription>
              Signed in to the EduTrack backend.
            </DialogDescription>
          </DialogHeader>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-muted-foreground">Name</dt>
              <dd>{session?.name}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Email</dt>
              <dd>{session?.email}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Role</dt>
              <dd>Administrator</dd>
            </div>
          </dl>
          <ChangePasswordForm />
        </DialogContent>
      </Dialog>
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Search Admin Portal</DialogTitle>
            <DialogDescription>
              Find students, enrollments, tickets, and announcements.
            </DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            aria-label="Global search"
            placeholder="Search by name, ID, subject, or title…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div
            aria-live="polite"
            className="max-h-[55dvh] overflow-y-auto space-y-1"
          >
            {results.map((result) => (
              <button
                key={result.id}
                className="w-full rounded-md p-3 text-left hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => {
                  navigate(result.href);
                  setSearchOpen(false);
                  setQuery('');
                }}
              >
                <span className="block text-sm font-medium">
                  {result.label}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {result.detail}
                </span>
              </button>
            ))}
            {!results.length && (
              <p className="p-4 text-sm text-muted-foreground">
                {query.trim()
                  ? 'No matching records. Try a different name, ID, or keyword.'
                  : 'Type to search across Admin records.'}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
