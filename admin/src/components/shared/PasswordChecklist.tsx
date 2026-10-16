import { PASSWORD_CHECKS } from '@/lib/validation';
import { CheckCircle2, Circle } from 'lucide-react';

// Live list of the password rules under a "new password" field.
export function PasswordChecklist({ password, id }: { password: string; id?: string }) {
  return (
    <ul id={id} className="mt-1 space-y-0.5 text-xs" aria-label="Password requirements">
      {PASSWORD_CHECKS.map((check) => {
        const met = check.test(password);
        return (
          <li
            key={check.label}
            className={`flex items-center gap-1.5 ${met ? 'text-green-700' : 'text-muted-foreground'}`}
          >
            {met ? (
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Circle className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span>
              {check.label}
              <span className="sr-only">{met ? ' (done)' : ' (missing)'}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
