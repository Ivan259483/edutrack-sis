import { Button } from '@/components/ui/button';
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
import { useAdminCollection } from '@/data/context';
import {
  programOptions,
  sectionOptions,
  yearLevelOptions,
} from '@/data/mock-data';
import { studentSchema } from '@/data/schema';
import { initials, today } from '@/lib/domain';
import type { Student } from '@/types';
import { useState } from 'react';
import { toast } from 'sonner';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
type FieldErrors = Partial<Record<keyof Student, string>>;
// Inline messages shown under each field (the schema still validates on save).
function validateStudent(form: Student, labels: Record<string, string>) {
  const errors: FieldErrors = {};
  for (const [key, label] of Object.entries(labels))
    if (!String(form[key as keyof Student] ?? '').trim())
      errors[key as keyof Student] = `${label} is required.`;
  if (!errors.email && !EMAIL.test(form.email.trim()))
    errors.email = 'Enter a valid email address, e.g. name@school.edu.';
  return errors;
}

export function StudentForm({
  student,
  onClose,
}: {
  student: Student | null;
  onClose: () => void;
}) {
  const [, setStudents] = useAdminCollection('students');
  const [form, setForm] = useState<Student>(
    () =>
      student ?? {
        id: crypto.randomUUID(),
        studentId: '',
        fullName: '',
        email: '',
        contactNumber: '',
        address: '',
        emergencyContact: '',
        emergencyContactNumber: '',
        program: 'BSIT',
        yearLevel: '1st Year',
        section: 'BSIT 1A',
        academicStatus: 'Active',
        dateEnrolled: today(),
        avatarInitials: '',
      }
  );
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const update = (key: keyof Student, value: string) =>
    setForm((prev) => ({
      ...prev,
      [key]: value,
      ...(key === 'program'
        ? {
            yearLevel:
              yearLevelOptions.find((year) =>
                sectionOptions.some((section) =>
                  section.startsWith(`${value} ${year[0]}`)
                )
              ) ?? prev.yearLevel,
          }
        : {}),
      ...(key === 'program' || key === 'yearLevel' ? { section: '' } : {}),
    }));
  const fields = [
    ['studentId', 'Student ID', 'text'],
    ['fullName', 'Full name', 'text'],
    ['email', 'Email', 'email'],
    ['contactNumber', 'Contact number', 'tel'],
    ['address', 'Address', 'text'],
    ['emergencyContact', 'Emergency contact', 'text'],
    ['emergencyContactNumber', 'Emergency contact number', 'tel'],
    ['dateEnrolled', 'Date enrolled', 'date'],
  ] as const;
  const labels: Record<string, string> = {
    ...Object.fromEntries(fields.map(([key, label]) => [key, label])),
    program: 'Program',
    yearLevel: 'Year level',
    section: 'Section',
    academicStatus: 'Status',
  };
  const fieldErrors = submitted ? validateStudent(form, labels) : {};
  const errorProps = (key: keyof Student) =>
    fieldErrors[key]
      ? { 'aria-invalid': true, 'aria-describedby': `student-${key}-error` }
      : {};
  const errorText = (key: keyof Student) =>
    fieldErrors[key] && (
      <p id={`student-${key}-error`} className="text-sm text-destructive">
        {fieldErrors[key]}
      </p>
    );
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{student ? 'Edit Student' : 'Add Student'}</DialogTitle>
          <DialogDescription>
            Enter the student’s contact and academic information. All fields are
            required.
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            setSubmitted(true);
            setError('');
            if (Object.keys(validateStudent(form, labels)).length) return;
            const result = studentSchema.safeParse({
              ...form,
              avatarInitials: initials(form.fullName),
            });
            if (!result.success) {
              setError(result.error.issues[0].message);
              return;
            }
            if (
              setStudents(
                (prev) =>
                  student
                    ? prev.map((s) => (s.id === student.id ? result.data : s))
                    : [...prev, result.data],
                `${student ? 'Updated' : 'Added'} student ${result.data.fullName}`
              )
            ) {
              toast.success('Student saved');
              onClose();
            }
          }}
          className="space-y-4"
        >
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map(([key, label, type]) => (
              <div className="space-y-2" key={key}>
                <Label htmlFor={`student-${key}`}>{label}</Label>
                <Input
                  required
                  id={`student-${key}`}
                  type={type}
                  value={form[key]}
                  onChange={(e) => update(key, e.target.value)}
                  className={fieldErrors[key] ? 'border-destructive' : undefined}
                  {...errorProps(key)}
                />
                {errorText(key)}
              </div>
            ))}
            {(
              [
                ['program', 'Program', programOptions],
                [
                  'yearLevel',
                  'Year level',
                  yearLevelOptions.filter((year) =>
                    sectionOptions.some((section) =>
                      section.startsWith(`${form.program} ${year[0]}`)
                    )
                  ),
                ],
                [
                  'section',
                  'Section',
                  sectionOptions.filter((s) =>
                    s.startsWith(`${form.program} ${form.yearLevel[0]}`)
                  ),
                ],
                [
                  'academicStatus',
                  'Status',
                  ['Active', 'On Leave', 'Graduated', 'Suspended'],
                ],
              ] as const
            ).map(([key, label, options]) => (
              <div className="space-y-2" key={key}>
                <Label htmlFor={`student-${key}`}>{label}</Label>
                <select
                  required
                  id={`student-${key}`}
                  className={`flex h-9 w-full rounded-md border bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring ${fieldErrors[key] ? 'border-destructive' : 'border-input'}`}
                  value={form[key]}
                  onChange={(e) => update(key, e.target.value)}
                  {...errorProps(key)}
                >
                  <option value="" disabled>
                    Select {label.toLowerCase()}
                  </option>
                  {options.map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
                {errorText(key)}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Save Student</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
