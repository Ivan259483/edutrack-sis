import { EmptyState } from '@/components/shared/EmptyState';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAdminCollection } from '@/data/context';
import {
  announcementCategoryOptions,
  programOptions,
  sectionOptions,
  targetAudienceOptions,
  yearLevelOptions,
} from '@/data/mock-data';
import { usePageIntent } from '@/hooks/use-page-intent';
import { formatDate, today, validateTarget } from '@/lib/domain';
import { cn } from '@/lib/utils';
import type {
  Announcement,
  AnnouncementCategory,
  TargetAudience,
} from '@/types';
import {
  FileEdit,
  Megaphone,
  Pencil,
  Plus,
  Search,
  Send,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

const categoryColors: Record<AnnouncementCategory, string> = {
  Academic: 'bg-blue-100 text-blue-800 border-blue-200',
  Enrollment: 'bg-green-100 text-green-800 border-green-200',
  Event: 'bg-amber-100 text-amber-800 border-amber-200',
  General: 'bg-gray-100 text-gray-700 border-gray-200',
  Urgent: 'bg-red-100 text-red-800 border-red-200',
};

export function AnnouncementsPage() {
  const intent = usePageIntent();
  const [announcements, setAnnouncements] = useAdminCollection('announcements');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [message, setMessage] = useState('');
  const [targetAudience, setTargetAudience] = useState('All Students');
  const [targetValue, setTargetValue] = useState('All Students');

  const filtered = useMemo(() => {
    return announcements.filter((a) => {
      const matchSearch =
        a.title.toLowerCase().includes(search.toLowerCase()) ||
        a.message.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || a.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [announcements, search, statusFilter]);

  const openCreate = useCallback(() => {
    setIsCreating(true);
    setEditing(null);
    setTitle('');
    setCategory('');
    setMessage('');
    setTargetAudience('All Students');
    setTargetValue('All Students');
  }, []);

  const openEdit = useCallback((ann: Announcement) => {
    setEditing(ann);
    setIsCreating(false);
    setTitle(ann.title);
    setCategory(ann.category);
    setMessage(ann.message);
    setTargetAudience(ann.targetAudience);
    setTargetValue(ann.targetValue);
  }, []);

  const requestedAnnouncement = announcements.find(
    (a) => a.id === intent.recordId
  );
  useEffect(() => {
    if (intent.action === 'create') openCreate();
    else if (requestedAnnouncement) openEdit(requestedAnnouncement);
  }, [requestedAnnouncement, intent.action, openCreate, openEdit]);
  const handleSave = () => {
    try {
      validateTarget(
        { targetAudience: targetAudience as TargetAudience, targetValue },
        {
          programs: programOptions,
          years: yearLevelOptions,
          sections: sectionOptions,
        }
      );
    } catch (error) {
      toast.error('Choose a target audience', {
        description: (error as Error).message,
      });
      return;
    }
    if (!title.trim() || !category || !message.trim()) {
      toast.error('Missing fields', {
        description: 'Please fill in title, category, and message.',
      });
      return;
    }

    if (editing) {
      if (
        !setAnnouncements(
          (prev) =>
            prev.map((a) =>
              a.id === editing.id
                ? {
                    ...a,
                    title,
                    category: category as AnnouncementCategory,
                    message,
                    targetAudience: targetAudience as TargetAudience,
                    targetValue,
                  }
                : a
            ),
          'Updated announcement: ' + title
        )
      )
        return;
      toast.success('Announcement updated', {
        description: `"${title}" has been updated.`,
      });
    } else {
      const newAnn: Announcement = {
        id: crypto.randomUUID(),
        title,
        category: category as AnnouncementCategory,
        message,
        targetAudience: targetAudience as TargetAudience,
        targetValue,
        status: 'Draft',
        author: 'Admin',
        dateCreated: today(),
        datePublished: null,
      };
      if (
        !setAnnouncements(
          (prev) => [newAnn, ...prev],
          'Created announcement: ' + title
        )
      )
        return;
      toast.success('Announcement created', {
        description: `"${title}" has been saved as a draft.`,
      });
    }
    closeForm();
  };

  const closeForm = () => {
    intent.clearIntent();
    setEditing(null);
    setIsCreating(false);
    setTitle('');
    setCategory('');
    setMessage('');
    setTargetAudience('All Students');
    setTargetValue('All Students');
  };

  const handleTogglePublish = (ann: Announcement) => {
    const newStatus = ann.status === 'Published' ? 'Draft' : 'Published';
    if (
      !setAnnouncements(
        (prev) =>
          prev.map((a) =>
            a.id === ann.id
              ? {
                  ...a,
                  status: newStatus,
                  datePublished: newStatus === 'Published' ? today() : null,
                }
              : a
          ),
        newStatus + ' announcement: ' + ann.title
      )
    )
      return;
    toast.success(
      newStatus === 'Published'
        ? 'Announcement published'
        : 'Announcement unpublished',
      {
        description: `"${ann.title}" is now ${newStatus.toLowerCase()}.`,
      }
    );
  };

  const handleDelete = () => {
    if (deleteTarget) {
      if (
        !setAnnouncements(
          (prev) => prev.filter((a) => a.id !== deleteTarget.id),
          'Deleted announcement: ' + deleteTarget.title
        )
      )
        return;
      toast.success('Announcement deleted', {
        description: `"${deleteTarget.title}" has been removed.`,
      });
      setDeleteTarget(null);
    }
  };

  const formOpen = isCreating || !!editing;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Announcements"
        description="Create and manage university announcements"
        breadcrumbs={[{ label: 'Admin' }, { label: 'Announcements' }]}
        actions={
          <Button
            aria-label="Create Announcement"
            className="gap-2"
            onClick={openCreate}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Create Announcement</span>
          </Button>
        }
      />

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="relative flex-1 sm:min-w-[240px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search announcements..."
                placeholder="Search announcements..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger
                aria-label="Status"
                className="w-full sm:w-[140px]"
              >
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Published">Published</SelectItem>
                <SelectItem value="Draft">Draft</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Announcements List */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={<Megaphone className="h-6 w-6" />}
              title="No announcements found"
              description="Create your first announcement to get started."
              action={
                <Button className="gap-2" onClick={openCreate}>
                  <Plus className="h-4 w-4" />
                  Create Announcement
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((ann) => (
            <Card key={ann.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <CardTitle className="text-base leading-tight">
                      {ann.title}
                    </CardTitle>
                  </div>
                  <StatusBadge status={ann.status} showDot />
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={cn(
                      'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold',
                      categoryColors[ann.category]
                    )}
                  >
                    {ann.category}
                  </span>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground">
                    {ann.targetValue}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between gap-3">
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {ann.message}
                </p>
                <div className="flex flex-wrap gap-2 items-center justify-between pt-2 border-t border-border">
                  <div className="text-xs text-muted-foreground">
                    {ann.datePublished
                      ? `Published ${formatDate(ann.datePublished)}`
                      : `Created ${formatDate(ann.dateCreated)}`}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 text-xs"
                      onClick={() => handleTogglePublish(ann)}
                    >
                      {ann.status === 'Published' ? (
                        <>
                          <FileEdit className="h-3.5 w-3.5" />
                          Unpublish
                        </>
                      ) : (
                        <>
                          <Send className="h-3.5 w-3.5" />
                          Publish
                        </>
                      )}
                    </Button>
                    <Button
                      aria-label={`Edit ${ann.title}`}
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(ann)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      aria-label={`Delete ${ann.title}`}
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => setDeleteTarget(ann)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={(open) => !open && closeForm()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Edit Announcement' : 'Create Announcement'}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? 'Update the announcement details.'
                : 'Fill in the details below to create a new announcement.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="announcement-title">Title</Label>
              <Input
                id="announcement-title"
                placeholder="Enter announcement title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="announcement-category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="announcement-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {announcementCategoryOptions.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="announcement-message">Message</Label>
              <Textarea
                id="announcement-message"
                placeholder="Enter announcement message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="announcement-audience">Target Audience</Label>
              <Select
                value={targetAudience}
                onValueChange={(v) => {
                  setTargetAudience(v);
                  setTargetValue(v === 'All Students' ? v : '');
                }}
              >
                <SelectTrigger id="announcement-audience">
                  <SelectValue placeholder="Select audience" />
                </SelectTrigger>
                <SelectContent>
                  {targetAudienceOptions.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {targetAudience === 'Specific Program' && (
              <div className="space-y-2">
                <Label htmlFor="announcement-program">Program</Label>
                <Select value={targetValue} onValueChange={setTargetValue}>
                  <SelectTrigger id="announcement-program">
                    <SelectValue placeholder="Select program" />
                  </SelectTrigger>
                  <SelectContent>
                    {programOptions.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {targetAudience === 'Specific Year Level' && (
              <div className="space-y-2">
                <Label htmlFor="announcement-year">Year Level</Label>
                <Select value={targetValue} onValueChange={setTargetValue}>
                  <SelectTrigger id="announcement-year">
                    <SelectValue placeholder="Select year level" />
                  </SelectTrigger>
                  <SelectContent>
                    {yearLevelOptions.map((y) => (
                      <SelectItem key={y} value={y}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {targetAudience === 'Specific Section' && (
              <div className="space-y-2">
                <Label htmlFor="announcement-section">Section</Label>
                <Select value={targetValue} onValueChange={setTargetValue}>
                  <SelectTrigger id="announcement-section">
                    <SelectValue placeholder="Select section" />
                  </SelectTrigger>
                  <SelectContent>
                    {sectionOptions.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeForm}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editing ? 'Update' : 'Save as Draft'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Announcement</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.title}"? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
