import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api, apiErrorMessage } from '@/lib/api';
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';

export function ChangePasswordForm() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (next.length < 8 || !/[A-Za-z]/.test(next) || !/\d/.test(next))
      return setError('Use at least 8 characters with a letter and a number.');
    if (next !== confirm) return setError('New passwords do not match.');
    setSaving(true);
    try {
      await api.put('/auth/password', { currentPassword: current, password: next });
      toast.success('Password updated');
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (cause) {
      setError(apiErrorMessage(cause));
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
        <Input id="current-password" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="new-password">New password</Label>
        <Input id="new-password" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="confirm-password">Confirm new password</Label>
        <Input id="confirm-password" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </div>
      <Button type="submit" size="sm" disabled={saving || !current}>
        Update password
      </Button>
    </form>
  );
}
