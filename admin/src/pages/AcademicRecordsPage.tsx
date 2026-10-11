import { EmptyState } from '@/components/shared/EmptyState';
import { PageHeader } from '@/components/shared/PageHeader';
import { PrintableDocument } from '@/components/shared/PrintableDocument';
import { StatusBadge } from '@/components/shared/StatusBadge';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAdminCollection, useAdminData } from '@/data/context';
import { usePageIntent } from '@/hooks/use-page-intent';
import {
  calculateRemark,
  canPublishGrade,
  parseGrade,
  periodLabel,
  transcriptSummary,
} from '@/lib/domain';
import type { GradeRecord } from '@/types';
import {
  FileText,
  GraduationCap,
  Pencil,
  Printer,
  Search,
  Upload,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

export function AcademicRecordsPage() {
  const {
    state: { settings },
  } = useAdminData();
  const intent = usePageIntent();
  const [gradeError, setGradeError] = useState('');
  const [chooseGrade, setChooseGrade] = useState(intent.action === 'encode');
  const [grades, setGrades] = useAdminCollection('grades');
  const [search, setSearch] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('all');
  const [publishFilter, setPublishFilter] = useState('all');
  const [encodeGrade, setEncodeGrade] = useState<GradeRecord | null>(null);
  const [transcriptStudent, setTranscriptStudent] = useState<string | null>(
    null
  );
  const [midterm, setMidterm] = useState('');
  const [finalGrade, setFinalGrade] = useState('');
  useEffect(() => {
    if (intent.action === 'encode') setChooseGrade(true);
  }, [intent.action]);

  const filtered = useMemo(() => {
    return grades.filter((g) => {
      const matchSearch =
        g.studentName.toLowerCase().includes(search.toLowerCase()) ||
        g.subjectTitle.toLowerCase().includes(search.toLowerCase()) ||
        g.section.toLowerCase().includes(search.toLowerCase());
      const matchSemester =
        semesterFilter === 'all' || g.semester === semesterFilter;
      const matchPublish =
        publishFilter === 'all' || g.publishStatus === publishFilter;
      return matchSearch && matchSemester && matchPublish;
    });
  }, [grades, search, semesterFilter, publishFilter]);

  const handleSaveGrade = () => {
    if (!encodeGrade) return;
    let midtermNum: number | null, finalNum: number | null;
    try {
      midtermNum = parseGrade(midterm);
      finalNum = parseGrade(finalGrade);
      setGradeError('');
    } catch (error) {
      setGradeError((error as Error).message);
      return;
    }
    const remark = calculateRemark(finalNum);

    if (
      !setGrades(
        (prev) =>
          prev.map((g) =>
            g.id === encodeGrade.id
              ? {
                  ...g,
                  midtermGrade: midtermNum,
                  finalGrade: finalNum,
                  numericalGrade: finalNum,
                  remark,
                  publishStatus: 'Draft',
                }
              : g
          ),
        `Encoded grade for ${encodeGrade.studentName}: ${encodeGrade.subjectTitle}`
      )
    )
      return;
    toast.success('Grade saved', {
      description: `${encodeGrade.subjectTitle} grade for ${encodeGrade.studentName} has been encoded.`,
    });
    setEncodeGrade(null);
    setMidterm('');
    setFinalGrade('');
  };

  const handlePublish = (grade: GradeRecord) => {
    if (!canPublishGrade(grade)) {
      toast.error('A valid final grade is required before publication.');
      return;
    }
    if (
      !setGrades(
        (prev) =>
          prev.map((g) =>
            g.id === grade.id ? { ...g, publishStatus: 'Published' } : g
          ),
        `Published grade for ${grade.studentName}: ${grade.subjectTitle}`
      )
    )
      return;
    toast.success('Grade published', {
      description: `${grade.subjectTitle} grade for ${grade.studentName} has been marked as published.`,
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const openEncode = (grade: GradeRecord) => {
    setGradeError('');
    setEncodeGrade(grade);
    setMidterm(grade.midtermGrade !== null ? String(grade.midtermGrade) : '');
    setFinalGrade(grade.finalGrade !== null ? String(grade.finalGrade) : '');
  };

  let previewRemark: ReturnType<typeof calculateRemark> | 'Invalid grade';
  try {
    previewRemark = calculateRemark(parseGrade(finalGrade));
  } catch {
    previewRemark = 'Invalid grade';
  }

  // Transcript data
  const summary = transcriptSummary(
    grades.filter((g) => g.studentId === transcriptStudent)
  );
  const transcriptGrades = summary.records;
  const transcriptName = transcriptGrades[0]?.studentName || '';
  const transcriptNumber = transcriptGrades[0]?.studentNumber || '';
  const totalUnits = summary.completedUnits;
  const passedUnits = summary.passedUnits;
  const gpa = summary.gpa?.toFixed(2) ?? 'N/A';

  // Summary stats
  const publishedCount = grades.filter(
    (g) => g.publishStatus === 'Published'
  ).length;
  const draftCount = grades.filter((g) => g.publishStatus === 'Draft').length;
  const passedCount = grades.filter((g) => g.remark === 'Passed').length;
  const failedCount = grades.filter((g) => g.remark === 'Failed').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Academic Records"
        description={`${periodLabel(settings)} · Grade encoding ${settings.gradeEncodingOpen ? 'enabled' : 'disabled'}`}
        breadcrumbs={[{ label: 'Admin' }, { label: 'Academic Records' }]}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Published Grades</p>
            <p className="mt-1 text-2xl font-bold text-green-600">
              {publishedCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Draft Grades</p>
            <p className="mt-1 text-2xl font-bold text-amber-600">
              {draftCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Passed</p>
            <p className="mt-1 text-2xl font-bold text-green-600">
              {passedCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Failed / Incomplete</p>
            <p className="mt-1 text-2xl font-bold text-red-600">
              {failedCount +
                grades.filter((g) => g.remark === 'Incomplete').length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="relative flex-1 sm:min-w-[240px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search by student, subject, or section..."
                placeholder="Search by student, subject, or section..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={semesterFilter} onValueChange={setSemesterFilter}>
              <SelectTrigger
                aria-label="Semester"
                className="w-full sm:w-[160px]"
              >
                <SelectValue placeholder="Semester" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Semesters</SelectItem>
                <SelectItem value="1st Semester">1st Semester</SelectItem>
                <SelectItem value="2nd Semester">2nd Semester</SelectItem>
                <SelectItem value="Summer">Summer</SelectItem>
              </SelectContent>
            </Select>
            <Select value={publishFilter} onValueChange={setPublishFilter}>
              <SelectTrigger
                aria-label="Status"
                className="w-full sm:w-[160px]"
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

      {/* Grades Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {filtered.length} grade record{filtered.length !== 1 ? 's' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <EmptyState
              icon={<GraduationCap className="h-6 w-6" />}
              title="No grade records found"
              description="Try adjusting your search or filters."
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Student</TableHead>
                    <TableHead className="hidden md:table-cell">
                      Subject
                    </TableHead>
                    <TableHead className="hidden lg:table-cell">
                      Section
                    </TableHead>
                    <TableHead className="text-center">Midterm</TableHead>
                    <TableHead className="text-center">Final</TableHead>
                    <TableHead>Remark</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((grade) => (
                    <TableRow key={grade.id}>
                      <TableCell className="pl-6">
                        <p className="text-sm font-medium text-foreground">
                          {grade.studentName}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {grade.studentNumber}
                        </p>
                        <p className="text-xs text-muted-foreground md:hidden">
                          {grade.subjectTitle}
                        </p>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <p className="text-sm text-foreground">
                          {grade.subjectTitle}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {grade.subjectCode}
                        </p>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">
                        {grade.section}
                      </TableCell>
                      <TableCell className="text-center text-sm font-mono">
                        {grade.midtermGrade !== null
                          ? grade.midtermGrade.toFixed(2)
                          : '-'}
                      </TableCell>
                      <TableCell className="text-center text-sm font-mono">
                        {grade.finalGrade !== null
                          ? grade.finalGrade.toFixed(2)
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={grade.remark} showDot />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={grade.publishStatus} />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            aria-label={`Encode ${grade.subjectTitle} for ${grade.studentName}`}
                            disabled={!settings.gradeEncodingOpen}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEncode(grade)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {grade.publishStatus === 'Draft' && (
                            <Button
                              aria-label={`Publish ${grade.subjectTitle} for ${grade.studentName}`}
                              title={
                                !canPublishGrade(grade)
                                  ? 'A valid final grade is required'
                                  : 'Publish grade'
                              }
                              disabled={
                                !settings.gradeEncodingOpen ||
                                !canPublishGrade(grade)
                              }
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-green-600"
                              onClick={() => handlePublish(grade)}
                            >
                              <Upload className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            aria-label={`Transcript for ${grade.studentName}`}
                            disabled={
                              !grades.some(
                                (g) =>
                                  g.studentId === grade.studentId &&
                                  g.publishStatus === 'Published' &&
                                  canPublishGrade(g)
                              )
                            }
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() =>
                              setTranscriptStudent(grade.studentId)
                            }
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Encode Grade Modal */}
      <Dialog
        open={chooseGrade}
        onOpenChange={(open) => {
          setChooseGrade(open);
          if (!open) intent.clearIntent();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select a grade to encode</DialogTitle>
            <DialogDescription>
              {settings.gradeEncodingOpen
                ? 'Choose a student and subject.'
                : 'Grade encoding is disabled. Enable it in Settings first.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {grades.map((g) => (
              <Button
                key={g.id}
                disabled={!settings.gradeEncodingOpen}
                variant="outline"
                className="h-auto w-full justify-start whitespace-normal text-left"
                onClick={() => {
                  setChooseGrade(false);
                  intent.clearIntent();
                  openEncode(g);
                }}
              >
                {g.studentName} · {g.subjectTitle}
              </Button>
            ))}
            {!grades.length && (
              <p>No grade records are available for encoding.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!encodeGrade}
        onOpenChange={(open) => {
          if (!open) {
            setEncodeGrade(null);
            setMidterm('');
            setFinalGrade('');
          }
        }}
      >
        <DialogContent className="max-w-md">
          {encodeGrade && (
            <>
              <DialogHeader>
                <DialogTitle>Encode Grade</DialogTitle>
                <DialogDescription>
                  {encodeGrade.studentName} · {encodeGrade.subjectTitle}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {gradeError && (
                  <p role="alert" className="text-sm text-destructive">
                    {gradeError}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">Student</p>
                    <p className="mt-0.5 text-sm font-medium text-foreground">
                      {encodeGrade.studentName}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">Subject</p>
                    <p className="mt-0.5 text-sm font-medium text-foreground">
                      {encodeGrade.subjectTitle}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="midterm">Midterm Grade (1.00 - 5.00)</Label>
                  <Input
                    id="midterm"
                    type="text"
                    inputMode="decimal"
                    step="0.01"
                    min="1"
                    max="5"
                    placeholder="e.g. 1.50"
                    value={midterm}
                    onChange={(e) => setMidterm(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="final">Final Grade (1.00 - 5.00)</Label>
                  <Input
                    id="final"
                    type="text"
                    inputMode="decimal"
                    step="0.01"
                    min="1"
                    max="5"
                    placeholder="e.g. 1.25"
                    value={finalGrade}
                    onChange={(e) => setFinalGrade(e.target.value)}
                  />
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">
                    Auto-calculated Remark
                  </p>
                  <div className="mt-1">
                    {previewRemark === 'Invalid grade' ? (
                      <p className="text-sm text-destructive">
                        Enter a valid grade from 1.00 to 5.00.
                      </p>
                    ) : (
                      <StatusBadge status={previewRemark} showDot />
                    )}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    1.00-3.00 = Passed · Above 3.00 = Failed · No final =
                    Incomplete
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEncodeGrade(null);
                    setMidterm('');
                    setFinalGrade('');
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleSaveGrade}>Save Grade</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Transcript Preview Modal */}
      <Dialog
        open={!!transcriptStudent}
        onOpenChange={(open) => !open && setTranscriptStudent(null)}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {transcriptGrades.length > 0 && (
            <>
              <div className="no-print flex flex-wrap gap-3 items-center justify-between pr-6">
                <DialogHeader className="flex-1">
                  <DialogTitle>Transcript of Records</DialogTitle>
                  <DialogDescription>Printable preview</DialogDescription>
                </DialogHeader>
                <Button className="gap-2 no-print" onClick={handlePrint}>
                  <Printer className="h-4 w-4" />
                  Print
                </Button>
              </div>

              {/* Printable Transcript */}
              <PrintableDocument title="Transcript of Records">
                <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Student Name
                    </p>
                    <p className="font-semibold text-foreground">
                      {transcriptName}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Student Number
                    </p>
                    <p className="font-semibold text-foreground font-mono">
                      {transcriptNumber}
                    </p>
                  </div>
                </div>

                {/* Summary */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="rounded-lg border border-border p-3 text-center">
                    <p className="text-xs text-muted-foreground">
                      Completed Units
                    </p>
                    <p className="text-lg font-bold text-foreground">
                      {totalUnits}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border p-3 text-center">
                    <p className="text-xs text-muted-foreground">
                      Units Passed
                    </p>
                    <p className="text-lg font-bold text-green-600">
                      {passedUnits}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border p-3 text-center">
                    <p className="text-xs text-muted-foreground">GPA</p>
                    <p className="text-lg font-bold text-foreground">{gpa}</p>
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-xs font-semibold">
                        Code
                      </TableHead>
                      <TableHead className="text-xs font-semibold">
                        Subject
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-center">
                        Units
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-center">
                        Final Grade
                      </TableHead>
                      <TableHead className="text-xs font-semibold">
                        Remark
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transcriptGrades.map((g) => (
                      <TableRow key={g.id} className="border-border">
                        <TableCell className="font-mono text-xs">
                          {g.subjectCode}
                        </TableCell>
                        <TableCell className="text-xs">
                          {g.subjectTitle}
                          <span className="block text-muted-foreground">
                            {g.academicYear} · {g.semester}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-center">
                          {g.units}
                        </TableCell>
                        <TableCell className="text-xs text-center font-mono">
                          {g.finalGrade !== null
                            ? g.finalGrade.toFixed(2)
                            : 'INC'}
                        </TableCell>
                        <TableCell className="text-xs">{g.remark}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </PrintableDocument>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
