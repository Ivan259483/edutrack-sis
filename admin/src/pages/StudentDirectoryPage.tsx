import { EmptyState } from '@/components/shared/EmptyState';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { StudentForm } from '@/components/shared/StudentForm';
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAdminCollection } from '@/data/context';
import {
  programOptions,
  sectionOptions,
  yearLevelOptions,
} from '@/data/mock-data';
import { usePageIntent } from '@/hooks/use-page-intent';
import {
  clampPage,
  downloadCsv,
  filterStudents,
  formatDate,
} from '@/lib/domain';
import type { Student } from '@/types';
import {
  Download,
  Eye,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

export function StudentDirectoryPage() {
  const intent = usePageIntent();
  const [formStudent, setFormStudent] = useState<Student | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [students, setStudents] = useAdminCollection('students');
  const [search, setSearch] = useState(intent.query);
  const [programFilter, setProgramFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewStudent, setViewStudent] = useState<Student | null>(null);
  const [deleteStudent, setDeleteStudent] = useState<Student | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const filtered = useMemo(
    () =>
      filterStudents(
        students,
        search,
        programFilter,
        yearFilter,
        sectionFilter,
        statusFilter
      ),
    [students, search, programFilter, yearFilter, sectionFilter, statusFilter]
  );

  const totalPages = Math.ceil(filtered.length / pageSize);
  const page = clampPage(currentPage, filtered.length, pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const displayedStudent =
    viewStudent || students.find((s) => s.id === intent.recordId) || null;

  const handleDelete = () => {
    if (deleteStudent) {
      if (
        !setStudents(
          (prev) => prev.filter((s) => s.id !== deleteStudent.id),
          `Deleted student ${deleteStudent.fullName}`
        )
      )
        return;
      toast.success('Student deleted', {
        description: `${deleteStudent.fullName} has been removed from the directory.`,
      });
      setDeleteStudent(null);
    }
  };

  const handleExport = () => {
    downloadCsv(filtered);
    toast.success('CSV download requested', {
      description: `${filtered.length} matching student records prepared. Check your browser downloads.`,
    });
  };

  const handleAddStudent = () => {
    setFormStudent(null);
    setFormOpen(true);
  };

  const clearFilters = () => {
    setSearch('');
    setProgramFilter('all');
    setYearFilter('all');
    setSectionFilter('all');
    setStatusFilter('all');
    setCurrentPage(1);
  };

  const hasFilters =
    search ||
    programFilter !== 'all' ||
    yearFilter !== 'all' ||
    sectionFilter !== 'all' ||
    statusFilter !== 'all';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Directory"
        description="Manage and view all student records"
        breadcrumbs={[{ label: 'Admin' }, { label: 'Student Directory' }]}
        actions={
          <>
            <Button
              aria-label="Export CSV"
              variant="outline"
              className="gap-2"
              onClick={handleExport}
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export CSV</span>
            </Button>
            <Button
              aria-label="Add Student"
              className="gap-2"
              onClick={handleAddStudent}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Student</span>
            </Button>
          </>
        }
      />

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="relative flex-1 sm:min-w-[240px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search by name, ID, or email..."
                placeholder="Search by name, ID, or email..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9"
              />
            </div>
            <Select
              value={programFilter}
              onValueChange={(v) => {
                setProgramFilter(v);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger
                aria-label="Program"
                className="w-full sm:w-[140px]"
              >
                <SelectValue placeholder="Program" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Programs</SelectItem>
                {programOptions.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={yearFilter}
              onValueChange={(v) => {
                setYearFilter(v);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger
                aria-label="Year Level"
                className="w-full sm:w-[140px]"
              >
                <SelectValue placeholder="Year Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {yearLevelOptions.map((y) => (
                  <SelectItem key={y} value={y}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={sectionFilter}
              onValueChange={(v) => {
                setSectionFilter(v);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger
                aria-label="Section"
                className="w-full sm:w-[140px]"
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
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger
                aria-label="Status"
                className="w-full sm:w-[140px]"
              >
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="On Leave">On Leave</SelectItem>
                <SelectItem value="Graduated">Graduated</SelectItem>
                <SelectItem value="Suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-muted-foreground"
              >
                Clear filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {filtered.length} student{filtered.length !== 1 ? 's' : ''} found
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {paginated.length === 0 ? (
            <EmptyState
              icon={<Users className="h-6 w-6" />}
              title="No students found"
              description="Try adjusting your search or filters."
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-6">Student</TableHead>
                      <TableHead>ID</TableHead>
                      <TableHead>Program</TableHead>
                      <TableHead className="hidden md:table-cell">
                        Year Level
                      </TableHead>
                      <TableHead className="hidden lg:table-cell">
                        Section
                      </TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.map((student) => (
                      <TableRow
                        key={student.id}
                        tabIndex={0}
                        aria-label={`View ${student.fullName}`}
                        onKeyDown={(e) => {
                          if (
                            e.target === e.currentTarget &&
                            (e.key === 'Enter' || e.key === ' ')
                          ) {
                            e.preventDefault();
                            setViewStudent(student);
                          }
                        }}
                        className="cursor-pointer focus-visible:outline focus-visible:outline-2"
                        onClick={() => setViewStudent(student)}
                      >
                        <TableCell className="pl-6">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                                {student.avatarInitials}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                {student.fullName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {student.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {student.studentId}
                        </TableCell>
                        <TableCell className="text-sm">
                          {student.program}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm">
                          {student.yearLevel}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm">
                          {student.section}
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            status={student.academicStatus}
                            showDot
                          />
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                aria-label={`Actions for ${student.fullName}`}
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => setViewStudent(student)}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View Profile
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setFormStudent(student);
                                  setFormOpen(true);
                                }}
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setDeleteStudent(student)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-border px-6 py-3">
                  <p className="text-xs text-muted-foreground">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 1}
                      onClick={() => setCurrentPage(page - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === totalPages}
                      onClick={() => setCurrentPage(page + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* View Student Modal */}
      {(formOpen || intent.action === 'add') && (
        <StudentForm
          student={formStudent}
          onClose={() => {
            setFormOpen(false);
            intent.clearIntent();
          }}
        />
      )}
      <Dialog
        open={!!displayedStudent}
        onOpenChange={(open) => {
          if (!open) {
            setViewStudent(null);
            intent.clearIntent();
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {displayedStudent && (
            <>
              <DialogHeader>
                <DialogTitle>Student Profile</DialogTitle>
                <DialogDescription>
                  Detailed student information
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6">
                {/* Profile Header */}
                <div className="flex items-center gap-4 rounded-lg border border-border p-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="bg-primary text-primary-foreground text-lg font-semibold">
                      {displayedStudent.avatarInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-foreground">
                      {displayedStudent.fullName}
                    </h3>
                    <p className="text-sm text-muted-foreground font-mono">
                      {displayedStudent.studentId}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <StatusBadge
                        status={displayedStudent.academicStatus}
                        showDot
                      />
                      <span className="inline-flex items-center rounded-md border border-border bg-muted px-2.5 py-0.5 text-xs font-semibold">
                        {displayedStudent.program}
                      </span>
                      <span className="inline-flex items-center rounded-md border border-border bg-muted px-2.5 py-0.5 text-xs font-semibold">
                        {displayedStudent.section}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Contact Info */}
                <div>
                  <h4 className="mb-3 text-sm font-semibold text-foreground">
                    Contact Information
                  </h4>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {[
                      { label: 'Email', value: displayedStudent.email },
                      {
                        label: 'Contact Number',
                        value: displayedStudent.contactNumber,
                      },
                      { label: 'Address', value: displayedStudent.address },
                      {
                        label: 'Date Enrolled',
                        value: formatDate(displayedStudent.dateEnrolled),
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="rounded-lg border border-border p-3"
                      >
                        <p className="text-xs text-muted-foreground">
                          {item.label}
                        </p>
                        <p className="mt-0.5 text-sm font-medium text-foreground">
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Emergency Contact */}
                <div>
                  <h4 className="mb-3 text-sm font-semibold text-foreground">
                    Emergency Contact
                  </h4>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-border p-3">
                      <p className="text-xs text-muted-foreground">
                        Contact Name
                      </p>
                      <p className="mt-0.5 text-sm font-medium text-foreground">
                        {displayedStudent.emergencyContact}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border p-3">
                      <p className="text-xs text-muted-foreground">
                        Contact Number
                      </p>
                      <p className="mt-0.5 text-sm font-medium text-foreground">
                        {displayedStudent.emergencyContactNumber}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Academic Info */}
                <div>
                  <h4 className="mb-3 text-sm font-semibold text-foreground">
                    Academic Information
                  </h4>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border border-border p-3">
                      <p className="text-xs text-muted-foreground">Program</p>
                      <p className="mt-0.5 text-sm font-medium text-foreground">
                        {displayedStudent.program}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border p-3">
                      <p className="text-xs text-muted-foreground">
                        Year Level
                      </p>
                      <p className="mt-0.5 text-sm font-medium text-foreground">
                        {displayedStudent.yearLevel}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border p-3">
                      <p className="text-xs text-muted-foreground">Section</p>
                      <p className="mt-0.5 text-sm font-medium text-foreground">
                        {displayedStudent.section}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteStudent}
        onOpenChange={(open) => !open && setDeleteStudent(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Student</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deleteStudent?.fullName}? This
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
