import { periodLabel } from '@/lib/domain';
import type { SystemSettings } from '@/types';
import type { ReactNode } from 'react';
export function PrintableDocument({
  title,
  period,
  children,
}: {
  title: string;
  period?: Pick<SystemSettings, 'academicYear' | 'semester'>;
  children: ReactNode;
}) {
  return (
    <section className="print-area rounded-lg border border-border p-4 sm:p-8">
      <div className="mb-6 text-center">
        <h2 className="text-xl font-bold">University Admin Portal</h2>
        <p className="text-sm text-muted-foreground">Office of the Registrar</p>
        <hr className="my-3" />
        <h3 className="text-lg font-bold">{title}</h3>
        {period && (
          <p className="text-xs text-muted-foreground">{periodLabel(period)}</p>
        )}
      </div>
      {children}
      <p className="mt-6 text-center text-xs text-muted-foreground">
        System-generated {title.toLowerCase()} · EduTrack SIS
      </p>
    </section>
  );
}
