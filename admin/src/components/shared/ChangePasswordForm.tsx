import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api, apiErrorMessage, apiFieldErrors, tokenStore } from '@/lib/api';
import {
  confirmPassword,
  errorProps,
  onlyErrors,
  strongPassword,
  type FieldErrors,
} from '@/lib/validation';
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { FieldError } from './FieldError';
import { PasswordChecklist } from './PasswordChecklist';

export function ChangePasswordForm() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [serverErrors, setServerErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const errors = {
    ...onlyErrors({
      currentPassword: current ? '' : 'Enter your current password.',
      password: strongPassword(next),
      confirmPassword: confirmPassword(confirm, next),
    }),
    ...onlyErrors(serverErrors),
  };
  const shown = (key: string) => (touched[key] ? errors[key] : undefined);
  const blur = (key: string) => setTouched((prev) => ({ ...prev, [key]: true }));
  const edit = (key: string, set: (v: string) => void) => (value: string) => {
    set(value);
    setServerErrors((prev) => ({ ...prev, [key]: '' }));
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return; // no double submits
    setError('');
    setTouched({ currentPassword: true, password: true, confirmPassword: true });
    if (Object.keys(errors).length) return;
    setSaving(true);
    try {
      const { data } = await api.put<{ token?: string }>('/auth/password', {
        currentPassword: current,
        password: next,
        confirmPassword: confirm,
      });
      // Other sessions are signed out; keep this one with its new token.
      if (data.token) tokenStore.replace(data.token);
      toast.success('Password updated');
      setCurrent('');
      setNext('');
      setConfirm('');
      setTouched({});
    } catch (cause) {
      const fieldErrors = apiFieldErrors(cause);
      setServerErrors(fieldErrors);
      if (!Object.keys(fieldErrors).length) setError(apiErrorMessage(cause));
    } finally {
      setSaving(false);
    }
  };
  return (
    <form className="space-y-3 border-t pt-4" onSubmit={submit} noValidate>
      <h3 className="text-sm font-semibold">Change password</h3>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="space-y-1">
        <Label htmlFor="current-password">Current password</Label>
        <Input
          id="current-password"
          type="password"
          autoComplete="current-password"
          maxLength={128}
          value={current}
          onChange={(e) => edit('currentPassword', setCurrent)(e.target.value)}
          onBlur={() => blur('currentPassword')}
          className={shown('currentPassword') ? 'border-destructive' : undefined}
          {...errorProps('current-password-error', shown('currentPassword'))}
        />
        <FieldError id="current-password-error" message={shown('currentPassword')} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="new-password">New password</Label>
        <Input
          id="new-password"
          type="password"
          autoComplete="new-password"
          maxLength={128}
          value={next}
          onChange={(e) => edit('password', setNext)(e.target.value)}
          onBlur={() => blur('password')}
          className={shown('password') ? 'border-destructive' : undefined}
          {...errorProps('new-password-error', shown('password'))}
        />
        <FieldError id="new-password-error" message={shown('password')} />
        <PasswordChecklist password={next} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="confirm-password">Confirm new password</Label>
        <Input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          maxLength={128}
          value={confirm}
          onChange={(e) => edit('confirmPassword', setConfirm)(e.target.value)}
          onBlur={() => blur('confirmPassword')}
          className={shown('confirmPassword') ? 'border-destructive' : undefined}
          {...errorProps('confirm-password-error', shown('confirmPassword'))}
        />
        <FieldError id="confirm-password-error" message={shown('confirmPassword')} />
      </div>
      <Button type="submit" size="sm" disabled={saving}>
        {saving ? 'Saving…' : 'Update password'}
      </Button>
    </form>
  );
}
