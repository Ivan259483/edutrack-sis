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
import { initials, normalize, today } from '@/lib/domain';
import {
  clean,
  email,
  lengthBetween,
  onlyErrors,
  pastDate,
  personName,
  phone,
  required,
  studentId,
  type FieldErrors,
} from '@/lib/validation';
import type { Student } from '@/types';
import { useState } from 'react';
import { toast } from 'sonner';

// Inline messages shown under each field. The API enforces the same rules.
function validateStudent(form: Student, others: Student[]): FieldErrors {
  const errors = onlyErrors({
    studentId: studentId(form.studentId),
    fullName: personName(form.fullName, 'Full name', 100),
    email: email(form.email),
    contactNumber: phone(form.contactNumber, 'Contact number', { allowPlaceholder: true }),
    address: lengthBetween(form.address, 'Address', 5, 300),
    emergencyContact: personName(form.emergencyContact, 'Emergency contact', 100),
    emergencyContactNumber: phone(form.emergencyContactNumber, 'Emergency contact number', {
      allowPlaceholder: true,
    }),
    dateEnrolled: pastDate(form.dateEnrolled, 'Date enrolled', today()),
    program: required(form.program, 'Program'),
    yearLevel: required(form.yearLevel, 'Year level'),
    section: required(form.section, 'Section'),
    academicStatus: required(form.academicStatus, 'Status'),
  });
  if (!errors.studentId && others.some((s) => normalize(s.studentId) === normalize(form.studentId)))
    errors.studentId = 'Student ID is already in use.';
  if (!errors.email && others.some((s) => normalize(s.email) === normalize(form.email)))
    errors.email = 'Email is already registered.';
  return errors;
}

export function StudentForm({
  student,
  onClose,
}: {
  student: Student | null;
  onClose: () => void;
}) {
  const [students, , saveStudents] = useAdminCollection('students');
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
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [serverErrors, setServerErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const update = (key: keyof Student, value: string) => {
    setServerErrors((prev) => ({ ...prev, [key]: '' }));
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
  };
  const fields = [
    ['studentId', 'Student ID', 'text', 'e.g. 2024-00115', 10],
    ['fullName', 'Full name', 'text', 'e.g. Ma. Clara Peñaflor', 100],
    ['email', 'Email', 'email', 'e.g. name@school.edu', 254],
    ['contactNumber', 'Contact number', 'tel', 'e.g. 0917 123 4567', 30],
    ['address', 'Address', 'text', '', 300],
    ['emergencyContact', 'Emergency contact', 'text', '', 100],
    ['emergencyContactNumber', 'Emergency contact number', 'tel', 'e.g. 0917 123 4567', 30],
    ['dateEnrolled', 'Date enrolled', 'date', '', 10],
  ] as const;
  const others = students.filter((s) => s.id !== form.id);
  const allErrors = { ...validateStudent(form, others), ...onlyErrors(serverErrors) };
  // A field shows its message once it was left (blur) or the form was submitted.
  const fieldErrors: FieldErrors = Object.fromEntries(
    Object.entries(allErrors).filter(([key]) => submitted || touched[key])
  );
  const blur = (key: string) => setTouched((prev) => ({ ...prev, [key]: true }));
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
  const submit = async () => {
    if (saving) return; // no double submits
    setSubmitted(true);
    setError('');
    if (Object.keys(allErrors).length) return;
    const result = studentSchema.safeParse({
      ...form,
      studentId: clean(form.studentId),
      fullName: clean(form.fullName),
      email: form.email.trim().toLowerCase(),
      contactNumber: clean(form.contactNumber),
      address: clean(form.address),
      emergencyContact: clean(form.emergencyContact),
      emergencyContactNumber: clean(form.emergencyContactNumber),
      avatarInitials: initials(form.fullName),
    });
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }
    setSaving(true);
    const saved = await saveStudents(
      (prev) =>
        student
          ? prev.map((s) => (s.id === student.id ? result.data : s))
          : [...prev, result.data],
      `${student ? 'Updated' : 'Added'} student ${result.data.fullName}`
    );
    setSaving(false);
    if (saved.ok) {
      toast.success('Student saved');
      onClose();
      return;
    }
    setServerErrors(saved.fieldErrors);
    if (!Object.keys(saved.fieldErrors).length) setError(saved.message);
  };
  return (
    <Dialog open onOpenChange={(open) => !open && !saving && onClose()}>
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
            void submit();
          }}
          className="space-y-4"
        >
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map(([key, label, type, placeholder, maxLength]) => (
              <div className="space-y-2" key={key}>
                <Label htmlFor={`student-${key}`}>{label}</Label>
                <Input
                  required
                  id={`student-${key}`}
                  type={type}
                  value={form[key]}
                  placeholder={placeholder || undefined}
                  maxLength={maxLength}
                  max={key === 'dateEnrolled' ? today() : undefined}
                  onChange={(e) => update(key, e.target.value)}
                  onBlur={() => blur(key)}
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
                  onBlur={() => blur(key)}
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
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save Student'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
