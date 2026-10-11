import { EmptyState } from '@/components/shared/EmptyState';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useAdminCollection } from '@/data/context';
import { ticketCategoryOptions } from '@/data/mock-data';
import { usePageIntent } from '@/hooks/use-page-intent';
import {
  formatDate,
  initials,
  replyToTicket,
  today,
  visibleTicket,
} from '@/lib/domain';
import { cn } from '@/lib/utils';
import type { SupportTicket, TicketStatus } from '@/types';
import { CheckCircle2, Clock, LifeBuoy, Search, Send } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

const categoryColors: Record<string, string> = {
  Enrollment: 'bg-blue-100 text-blue-800',
  Grades: 'bg-green-100 text-green-800',
  Technical: 'bg-amber-100 text-amber-800',
  General: 'bg-gray-100 text-gray-700',
};

export function SupportHelpdeskPage() {
  const intent = usePageIntent();
  const [tickets, setTickets] = useAdminCollection('tickets');
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const detailRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (selectedTicketId && window.matchMedia('(max-width: 1023px)').matches)
      detailRef.current?.scrollIntoView({ block: 'start' });
  }, [selectedTicketId]);

  const filtered = useMemo(() => {
    return tickets.filter((t) => {
      const matchTab = activeTab === 'all' || t.status === activeTab;
      const matchSearch =
        t.studentName.toLowerCase().includes(search.toLowerCase()) ||
        t.subject.toLowerCase().includes(search.toLowerCase()) ||
        t.ticketNumber.toLowerCase().includes(search.toLowerCase());
      const matchCategory =
        categoryFilter === 'all' || t.category === categoryFilter;
      return matchTab && matchSearch && matchCategory;
    });
  }, [tickets, activeTab, search, categoryFilter]);

  const counts = useMemo(
    () => ({
      all: tickets.length,
      Open: tickets.filter((t) => t.status === 'Open').length,
      'In Progress': tickets.filter((t) => t.status === 'In Progress').length,
      Resolved: tickets.filter((t) => t.status === 'Resolved').length,
    }),
    [tickets]
  );

  useEffect(() => {
    if (intent.recordId) {
      setActiveTab('all');
      setSearch('');
      setCategoryFilter('all');
      setSelectedTicketId(intent.recordId);
    }
  }, [intent.recordId]);
  const selectedTicket = visibleTicket(filtered, selectedTicketId);
  useEffect(() => {
    if (selectedTicketId && !filtered.some((t) => t.id === selectedTicketId)) {
      setSelectedTicketId(null);
      setReplyText('');
    }
  }, [filtered, selectedTicketId]);

  const updateTicketStatus = (id: string, status: TicketStatus) => {
    return setTickets(
      (prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, status, dateUpdated: today() } : t
        ),
      'Updated ticket status to ' + status
    );
  };

  const addReply = (id: string, message: string, resolve: boolean) =>
    setTickets(
      (prev) =>
        prev.map((t) => (t.id === id ? replyToTicket(t, message, resolve) : t)),
      resolve ? 'Replied and resolved ticket' : 'Replied to ticket'
    );
  const handleMarkInProgress = () => {
    if (!selectedTicket) return;
    if (!updateTicketStatus(selectedTicket.id, 'In Progress')) return;
    toast.success('Ticket updated', {
      description: `${selectedTicket.ticketNumber} marked as In Progress.`,
    });
  };

  const handleReply = () => {
    if (!selectedTicket || !replyText.trim()) {
      toast.error('Reply is empty', {
        description: 'Please enter a reply before sending.',
      });
      return;
    }
    if (!addReply(selectedTicket.id, replyText.trim(), false)) return;
    toast.success('Reply saved', {
      description: `Reply saved to ${selectedTicket.ticketNumber}. Ticket marked as In Progress.`,
    });
    setReplyText('');
  };

  const handleReplyAndResolve = () => {
    if (!selectedTicket || !replyText.trim()) {
      toast.error('Reply is empty', {
        description: 'Please enter a reply before resolving.',
      });
      return;
    }
    if (!addReply(selectedTicket.id, replyText.trim(), true)) return;
    toast.success('Ticket resolved', {
      description: `Reply saved and ${selectedTicket.ticketNumber} marked as Resolved.`,
    });
    setReplyText('');
  };

  const openTicket = (ticket: SupportTicket) => {
    setSelectedTicketId(ticket.id);
    setReplyText('');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Support Helpdesk"
        description="Manage student support tickets and concerns"
        breadcrumbs={[{ label: 'Admin' }, { label: 'Support Helpdesk' }]}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList
          className="max-w-full justify-start overflow-x-auto"
          aria-label="Status filters"
        >
          <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
          <TabsTrigger value="Open">Open ({counts.Open})</TabsTrigger>
          <TabsTrigger value="In Progress">
            In Progress ({counts['In Progress']})
          </TabsTrigger>
          <TabsTrigger value="Resolved">
            Resolved ({counts.Resolved})
          </TabsTrigger>
        </TabsList>

        {/* Filters */}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative flex-1 sm:min-w-[240px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search by student, subject, or ticket number..."
              placeholder="Search by student, subject, or ticket number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger
              aria-label="Category"
              className="w-full sm:w-[160px]"
            >
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {ticketCategoryOptions.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <TabsContent value={activeTab} className="mt-4">
          <div className="grid gap-4 lg:grid-cols-5">
            {/* Ticket List */}
            <div ref={listRef} className="min-w-0 lg:col-span-2 space-y-2">
              {filtered.length === 0 ? (
                <Card>
                  <CardContent className="p-0">
                    <EmptyState
                      icon={<LifeBuoy className="h-6 w-6" />}
                      title="No tickets found"
                      description="No support tickets match your filters."
                    />
                  </CardContent>
                </Card>
              ) : (
                filtered.map((ticket) => (
                  <Card
                    key={ticket.id}
                    className={cn(
                      'min-w-0 cursor-pointer transition-all hover:shadow-md focus-visible:outline focus-visible:outline-2',
                      selectedTicketId === ticket.id && 'ring-2 ring-primary'
                    )}
                    role="button"
                    tabIndex={0}
                    aria-label={`Open ticket ${ticket.ticketNumber}: ${ticket.subject}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openTicket(ticket);
                      }
                    }}
                    onClick={() => openTicket(ticket)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Avatar className="h-9 w-9 shrink-0">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                              {initials(ticket.studentName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {ticket.subject}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {ticket.studentName} · {ticket.ticketNumber}
                            </p>
                          </div>
                        </div>
                        <StatusBadge status={ticket.status} showDot />
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <span
                          className={cn(
                            'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold',
                            categoryColors[ticket.category]
                          )}
                        >
                          {ticket.category}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(ticket.dateCreated)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* Ticket Details */}
            <div ref={detailRef} className="min-w-0 lg:col-span-3 scroll-mt-4">
              {selectedTicket && (
                <Button
                  variant="ghost"
                  className="mb-2 lg:hidden"
                  onClick={() =>
                    listRef.current?.scrollIntoView({ block: 'start' })
                  }
                >
                  Back to ticket list
                </Button>
              )}
              {!selectedTicket ? (
                <Card className="h-full">
                  <CardContent className="p-0">
                    <EmptyState
                      icon={<LifeBuoy className="h-6 w-6" />}
                      title="Select a ticket"
                      description="Choose a ticket from the list to view details and reply."
                    />
                  </CardContent>
                </Card>
              ) : (
                <Card className="h-full flex flex-col">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-base">
                          {selectedTicket.subject}
                        </CardTitle>
                        <CardDescription>
                          {selectedTicket.ticketNumber}
                        </CardDescription>
                      </div>
                      <StatusBadge status={selectedTicket.status} showDot />
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span
                        className={cn(
                          'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold',
                          categoryColors[selectedTicket.category]
                        )}
                      >
                        {selectedTicket.category}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col gap-4">
                    {/* Student Info */}
                    <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                          {initials(selectedTicket.studentName)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {selectedTicket.studentName}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {selectedTicket.studentNumber}
                        </p>
                      </div>
                    </div>

                    {/* Original Concern */}
                    <div className="rounded-lg border border-border bg-muted/30 p-4">
                      <p className="text-xs font-semibold text-muted-foreground mb-1">
                        Concern
                      </p>
                      <p className="text-sm text-foreground">
                        {selectedTicket.message}
                      </p>
                      <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDate(selectedTicket.dateCreated)}
                      </p>
                    </div>

                    {/* Conversation Thread */}
                    {selectedTicket.replies.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-2">
                          Conversation
                        </p>
                        <ScrollArea className="h-[200px]">
                          <div className="space-y-3 pr-2">
                            {selectedTicket.replies.map((reply) => (
                              <div
                                key={reply.id}
                                className={cn(
                                  'flex gap-2',
                                  reply.isAdmin
                                    ? 'justify-end'
                                    : 'justify-start'
                                )}
                              >
                                <div
                                  className={cn(
                                    'rounded-lg p-3 max-w-[85%] break-words',
                                    reply.isAdmin
                                      ? 'bg-primary text-primary-foreground'
                                      : 'bg-muted'
                                  )}
                                >
                                  <p className="text-xs font-semibold mb-0.5">
                                    {reply.author}
                                  </p>
                                  <p className="text-sm">{reply.message}</p>
                                  <p
                                    className={cn(
                                      'text-xs mt-1',
                                      reply.isAdmin
                                        ? 'text-primary-foreground/70'
                                        : 'text-muted-foreground'
                                    )}
                                  >
                                    {formatDate(reply.timestamp)}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    )}

                    {/* Reply Section */}
                    {selectedTicket.status !== 'Resolved' && (
                      <div className="space-y-3 border-t border-border pt-3">
                        <Textarea
                          aria-label="Reply to selected ticket"
                          placeholder="Type your reply..."
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          rows={3}
                        />
                        <div className="flex flex-wrap gap-2">
                          {selectedTicket.status === 'Open' && (
                            <Button
                              variant="outline"
                              className="gap-2"
                              onClick={handleMarkInProgress}
                            >
                              <Clock className="h-4 w-4" />
                              Mark In Progress
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            className="gap-2"
                            onClick={handleReply}
                          >
                            <Send className="h-4 w-4" />
                            Reply
                          </Button>
                          <Button
                            className="gap-2"
                            onClick={handleReplyAndResolve}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Reply & Resolve
                          </Button>
                        </div>
                      </div>
                    )}

                    {selectedTicket.status === 'Resolved' && (
                      <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        <p className="text-sm font-medium text-green-800">
                          This ticket has been resolved.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
