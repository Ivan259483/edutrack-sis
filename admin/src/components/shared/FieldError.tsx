// Red message under a form field (pair it with aria-describedby on the input).
export function FieldError({
  id,
  message,
  alert = false,
}: {
  id: string;
  message?: string;
  /** Announce it immediately (for a single field whose error appears on save). */
  alert?: boolean;
}) {
  if (!message) return null;
  return (
    <p id={id} role={alert ? 'alert' : undefined} className="text-sm text-destructive">
      {message}
    </p>
  );
}
