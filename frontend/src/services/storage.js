// Where the signed-in session is kept. With "Remember Me" it is saved in
// localStorage and survives closing the browser; otherwise it lives in
// sessionStorage and ends when the browser tab is closed.
const KEYS = ['edutrack_token', 'edutrack_user'];

const safe = (fn, fallback = null) => {
  try {
    return fn();
  } catch {
    return fallback; // storage blocked: the session lasts for this page only
  }
};

export const isRemembered = () => safe(() => localStorage.getItem('edutrack_token') !== null, false);

export const readSession = (key) =>
  safe(() => localStorage.getItem(key) ?? sessionStorage.getItem(key));

// Saves to the storage chosen at sign-in (or the one already in use).
export const writeSession = (key, value, remember = isRemembered()) =>
  safe(() => {
    (remember ? localStorage : sessionStorage).setItem(key, value);
    (remember ? sessionStorage : localStorage).removeItem(key);
  });

export const clearSession = () =>
  safe(() => {
    for (const key of KEYS) {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    }
  });
