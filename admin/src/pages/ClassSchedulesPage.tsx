import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { useAdminCollection, useAdminData } from '@/data/context';
import {
  dayOptions,
  instructorOptions,
  sectionOptions,
  subjects,
} from '@/data/mock-data';
import {
  periodLabel,
  scheduleConflicts,
  timeToMinutes,
  validateSchedule,
} from '@/lib/domain';
import { cn } from '@/lib/utils';
import type { DayOfWeek, Program, ScheduleClass } from '@/types';
import {
  AlertTriangle,
  CalendarDays,
  Clock,
  MapPin,
  Plus,
  User,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

const days: DayOfWeek[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];
const timeSlots = [
  '07:00',
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
];

const programColors: Record<
  Program,
  { bg: string; border: string; text: string }
> = {
  BSIT: { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-800' },
  BSBA: {
    bg: 'bg-green-100',
    border: 'border-green-300',
    text: 'text-green-800',
  },
  BSEd: {
    bg: 'bg-amber-100',
    border: 'border-amber-300',
    text: 'text-amber-800',
  },
};

export function ClassSchedulesPage() {
  const {
    state: { settings },
  } = useAdminData();
  const [schedules, setSchedules] = useAdminCollection('schedules');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [instructorFilter, setInstructorFilter] = useState('all');
  const [dayFilter, setDayFilter] = useState('all');
  const [showAddForm, setShowAddForm] = useState(false);

  // Form state
  const [formSubject, setFormSubject] = useState('');
  const [formSection, setFormSection] = useState('');
  const [formInstructor, setFormInstructor] = useState('');
  const [formDay, setFormDay] = useState('');
  const [formStartTime, setFormStartTime] = useState('');
  const [formEndTime, setFormEndTime] = useState('');
  const [formRoom, setFormRoom] = useState('');

  const filtered = useMemo(() => {
    return schedules.filter((s) => {
      const matchSection =
        sectionFilter === 'all' || s.section === sectionFilter;
      const matchInstructor =
        instructorFilter === 'all' || s.instructor === instructorFilter;
      const matchDay = dayFilter === 'all' || s.day === dayFilter;
      return matchSection && matchInstructor && matchDay;
    });
  }, [schedules, sectionFilter, instructorFilter, dayFilter]);

  // Detect conflicts in current schedules
  const conflictIds = useMemo(
    () =>
      new Set(
        schedules
          .filter((s) =>
            Object.values(scheduleConflicts(s, schedules)).some(Boolean)
          )
          .map((s) => s.id)
      ),
    [schedules]
  );
  const handleSave = () => {
    if (
      !formSubject ||
      !formSection ||
      !formInstructor ||
      !formDay ||
      !formStartTime ||
      !formEndTime ||
      !formRoom
    ) {
      toast.error('Missing fields', {
        description: 'Please fill in all fields before saving.',
      });
      return;
    }

    if (timeToMinutes(formEndTime) <= timeToMinutes(formStartTime)) {
      toast.error('Invalid time', {
        description: 'End time must be after start time.',
      });
      return;
    }

    const subject = subjects.find((s) => s.id === formSubject);
    if (!subject) return;

    const newClass: ScheduleClass = {
      id: crypto.randomUUID(),
      subjectCode: subject.code,
      subjectTitle: subject.title,
      section: formSection,
      program: formSection.startsWith('BSIT')
        ? 'BSIT'
        : formSection.startsWith('BSBA')
          ? 'BSBA'
          : 'BSEd',
      instructor: formInstructor,
      day: formDay as DayOfWeek,
      startTime: formStartTime,
      endTime: formEndTime,
      room: formRoom.trim(),
    };

    try {
      validateSchedule(newClass, schedules);
    } catch (error) {
      toast.error('Cannot save schedule', {
        description: (error as Error).message,
      });
      return;
    }
    if (
      !setSchedules(
        (prev) => [...prev, newClass],
        'Added class ' + subject.title + ' for ' + formSection
      )
    )
      return;
    toast.success('Class added', {
      description: `${subject.title} for ${formSection} has been scheduled.`,
    });
    setShowAddForm(false);
    setFormSubject('');
    setFormSection('');
    setFormInstructor('');
    setFormDay('');
    setFormStartTime('');
    setFormEndTime('');
    setFormRoom('');
  };

  const getClassPosition = (cls: ScheduleClass) => {
    const startMin = timeToMinutes(cls.startTime);
    const endMin = timeToMinutes(cls.endTime);
    const gridStart = 7 * 60; // 07:00
    const slotHeight = 60; // px per hour
    const top = ((startMin - gridStart) / 60) * slotHeight;
    const height = ((endMin - startMin) / 60) * slotHeight;
    return { top, height };
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Class Schedules"
        description={`${periodLabel(settings)} · Weekly classes, 07:00–18:00`}
        breadcrumbs={[{ label: 'Admin' }, { label: 'Class Schedules' }]}
        actions={
          <Button
            aria-label="Add Class"
            className="gap-2"
            onClick={() => setShowAddForm(true)}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Class</span>
          </Button>
        }
      />

      {/* Conflict Warning */}
      {conflictIds.size > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" />
          <div>
            <p className="text-sm font-semibold text-red-800">
              Scheduling Conflict Detected
            </p>
            <p className="text-xs text-red-700">
              {conflictIds.size} class
              {conflictIds.size > 1 ? 'es have' : ' has'} a room or instructor
              conflict. Conflicting classes are highlighted in the schedule grid
              below.
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Select value={sectionFilter} onValueChange={setSectionFilter}>
              <SelectTrigger
                aria-label="Section"
                className="w-full sm:w-[160px]"
              >
                <SelectValue placeholder="Section" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sections</SelectItem>
                {sectionOptions.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={instructorFilter}
              onValueChange={setInstructorFilter}
            >
              <SelectTrigger
                aria-label="Instructor"
                className="w-full sm:w-[200px]"
              >
                <SelectValue placeholder="Instructor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Instructors</SelectItem>
                {instructorOptions.map((i) => (
                  <SelectItem key={i} value={i}>
                    {i}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={dayFilter} onValueChange={setDayFilter}>
              <SelectTrigger aria-label="Day" className="w-full sm:w-[140px]">
                <SelectValue placeholder="Day" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Days</SelectItem>
                {dayOptions.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Schedule Grid */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Weekly Schedule</CardTitle>
          <CardDescription>
            Color-coded by program, conflicts highlighted in red
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Day headers */}
              <div className="flex border-b border-border">
                <div className="w-16 shrink-0 border-r border-border p-2 text-xs font-semibold text-muted-foreground">
                  Time
                </div>
                {days.map((day) => (
                  <div
                    key={day}
                    className="flex-1 border-r border-border p-2 text-center text-xs font-semibold text-foreground last:border-r-0"
                  >
                    {day.slice(0, 3)}
                  </div>
                ))}
              </div>

              {/* Grid body */}
              <div
                className="flex"
                style={{ height: `${timeSlots.length * 60}px` }}
              >
                {/* Time column */}
                <div className="w-16 shrink-0 border-r border-border relative">
                  {timeSlots.map((time, i) => (
                    <div
                      key={time}
                      className="absolute left-0 right-0 border-t border-border/50 p-1 text-xs text-muted-foreground"
                      style={{ top: `${i * 60}px` }}
                    >
                      {time}
                    </div>
                  ))}
                </div>

                {/* Day columns */}
                {days.map((day) => (
                  <div
                    key={day}
                    className="relative flex-1 border-r border-border last:border-r-0"
                  >
                    {/* Time slot grid lines */}
                    {timeSlots.map((_, i) => (
                      <div
                        key={i}
                        className="absolute left-0 right-0 border-t border-border/30"
                        style={{ top: `${i * 60}px` }}
                      />
                    ))}
                    {/* Classes for this day */}
                    {filtered
                      .filter((cls) => cls.day === day)
                      .map((cls) => {
                        const { top, height } = getClassPosition(cls);
                        const colors = programColors[cls.program];
                        const hasConflict = conflictIds.has(cls.id);
                        return (
                          <div
                            key={cls.id}
                            className={cn(
                              'absolute left-1 right-1 rounded-md border p-1.5 text-xs overflow-hidden',
                              colors.bg,
                              colors.border,
                              hasConflict &&
                                'border-red-400 bg-red-100 ring-2 ring-red-300'
                            )}
                            style={{
                              top: `${top}px`,
                              height: `${height - 4}px`,
                            }}
                            title={`${cls.subjectTitle}\n${cls.instructor}\n${cls.room}\n${cls.startTime}-${cls.endTime}`}
                          >
                            <p
                              className={cn(
                                'font-semibold leading-tight',
                                colors.text,
                                hasConflict && 'text-red-800'
                              )}
                            >
                              {cls.subjectCode}
                            </p>
                            <p className="text-xs text-foreground/70 leading-tight">
                              {cls.section}
                            </p>
                            <p className="text-xs text-foreground/60 leading-tight">
                              {cls.room}
                            </p>
                            {hasConflict && (
                              <div className="mt-0.5 flex items-center gap-0.5 text-red-600">
                                <AlertTriangle className="h-3 w-3" />
                                <span className="text-xs font-medium">
                                  Conflict
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schedule List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Scheduled Classes ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {filtered.length === 0 ? (
            <div className="py-8 text-center">
              <CalendarDays className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                No classes found for the selected filters.
              </p>
            </div>
          ) : (
            filtered.map((cls) => {
              const colors = programColors[cls.program];
              const hasConflict = conflictIds.has(cls.id);
              return (
                <div
                  key={cls.id}
                  className={cn(
                    'flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between',
                    hasConflict ? 'border-red-200 bg-red-50' : 'border-border'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-lg',
                        colors.bg
                      )}
                    >
                      <CalendarDays className={cn('h-5 w-5', colors.text)} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {cls.subjectTitle}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {cls.subjectCode} · {cls.section}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {cls.day} {cls.startTime}-{cls.endTime}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {cls.room}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {cls.instructor}
                    </span>
                    {hasConflict && (
                      <span className="flex items-center gap-1 text-red-600 font-medium">
                        <AlertTriangle className="h-3 w-3" />
                        Conflict
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Add Class Dialog */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Class</DialogTitle>
            <DialogDescription>
              Schedule a new class. Conflicts will be detected automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="schedule-subject">Subject</Label>
              <Select value={formSubject} onValueChange={setFormSubject}>
                <SelectTrigger id="schedule-subject">
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.code} - {s.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="schedule-section">Section</Label>
              <Select value={formSection} onValueChange={setFormSection}>
                <SelectTrigger id="schedule-section">
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
            <div className="space-y-2">
              <Label htmlFor="schedule-instructor">Instructor</Label>
              <Select value={formInstructor} onValueChange={setFormInstructor}>
                <SelectTrigger id="schedule-instructor">
                  <SelectValue placeholder="Select instructor" />
                </SelectTrigger>
                <SelectContent>
                  {instructorOptions.map((i) => (
                    <SelectItem key={i} value={i}>
                      {i}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="schedule-day">Day</Label>
              <Select value={formDay} onValueChange={setFormDay}>
                <SelectTrigger id="schedule-day">
                  <SelectValue placeholder="Select day" />
                </SelectTrigger>
                <SelectContent>
                  {dayOptions.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="schedule-start">Start Time</Label>
                <Input
                  id="schedule-start"
                  min="07:00"
                  max="18:00"
                  type="time"
                  value={formStartTime}
                  onChange={(e) => setFormStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="schedule-end">End Time</Label>
                <Input
                  id="schedule-end"
                  min="07:00"
                  max="18:00"
                  type="time"
                  value={formEndTime}
                  onChange={(e) => setFormEndTime(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="schedule-room">Room</Label>
              <Input
                id="schedule-room"
                placeholder="e.g. Rm 401"
                value={formRoom}
                onChange={(e) => setFormRoom(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddForm(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Schedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
