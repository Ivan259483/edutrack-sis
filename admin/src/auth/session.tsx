import { PageLoading } from '@/components/shared/PageLoading';
import { AUTH_EXPIRED_EVENT, TOKEN_KEY, tokenStore } from '@/lib/api';
import { leaveTo, studentLoginUrl } from '@/lib/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { apiAuthClient } from './client';
import {
  Context,
  useAdminSession,
  type AdminSession,
  type AuthClient,
  type SessionStatus,
} from './context';

// The EduTrack login page hands an admin over as `#token=<jwt>`. The token is
// read once and removed from the address bar immediately.
function takeHandoffToken(): string | undefined {
  const match = /^#token=([\w-]+\.[\w-]+\.[\w-]+)$/.exec(window.location.hash);
  if (!match) return undefined;
  window.history.replaceState(
    null,
    '',
    window.location.pathname + window.location.search
  );
  return match[1];
}

export function SessionProvider({
  children,
  client = apiAuthClient,
}: {
  children: ReactNode;
  client?: AuthClient;
}) {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [status, setStatus] = useState<SessionStatus>('loading');
  useEffect(() => {
    let active = true;
    client.restore(takeHandoffToken()).then((restored) => {
      if (!active) return;
      setSession(restored);
      setStatus(restored ? 'signed-in' : 'signed-out');
    });
    const expired = () => {
      setSession(null);
      setStatus('signed-out');
    };
    // A page restored from the back/forward cache after signing out must not
    // show admin data again.
    const restoredFromCache = (event: PageTransitionEvent) => {
      if (event.persisted && !tokenStore.get()) leaveTo(studentLoginUrl());
    };
    // Signing out in one tab removes the shared token; sign out every other tab too.
    const signedOutElsewhere = (event: StorageEvent) => {
      if (event.key === TOKEN_KEY && !event.newValue) expired();
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, expired);
    window.addEventListener('pageshow', restoredFromCache);
    window.addEventListener('storage', signedOutElsewhere);
    return () => {
      active = false;
      window.removeEventListener(AUTH_EXPIRED_EVENT, expired);
      window.removeEventListener('pageshow', restoredFromCache);
      window.removeEventListener('storage', signedOutElsewhere);
    };
  }, [client]);
  return (
    <Context.Provider
      value={{
        session,
        status,
        signOut: () => {
          client.signOut();
          setSession(null);
          setStatus('signed-out');
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}

// Signed out: go to the EduTrack login page (Administrator tab).
function StudentLoginRedirect() {
  const url = studentLoginUrl();
  useEffect(() => leaveTo(url), [url]);
  return (
    <main className="flex min-h-dvh items-center justify-center p-6 text-sm text-muted-foreground">
      <p>
        Redirecting to the{' '}
        <a className="font-medium text-primary underline" href={url}>
          EduTrack sign-in page
        </a>
        …
      </p>
    </main>
  );
}

export function RequireAdmin() {
  const { status } = useAdminSession();
  if (status === 'loading') return <PageLoading />;
  return status === 'signed-in' ? <Outlet /> : <StudentLoginRedirect />;
}

// /login: the admin portal has no sign-in form of its own.
export function LoginRedirect() {
  const { status } = useAdminSession();
  if (status === 'loading') return <PageLoading />;
  return status === 'signed-in' ? <Navigate to="/" replace /> : <StudentLoginRedirect />;
}
