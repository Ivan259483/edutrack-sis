import { describe, expect, it } from 'vitest';
import { parseHandoff } from '@/auth/handoff';
import { TOKEN_KEY, tokenStore } from '@/lib/api';

const JWT = 'aaa.bbb.ccc';

describe('Remember Me hand-off', () => {
  it('reads the token and whether to remember it', () => {
    expect(parseHandoff(`#token=${JWT}`)).toEqual({ token: JWT, remember: true });
    expect(parseHandoff(`#token=${JWT}&remember=0`)).toEqual({
      token: JWT,
      remember: false,
    });
  });
  it('ignores anything that is not a hand-off', () => {
    expect(parseHandoff('')).toBeUndefined();
    expect(parseHandoff('#token=not-a-jwt')).toBeUndefined();
    expect(parseHandoff(`#token=${JWT}&remember=1`)).toBeUndefined();
    expect(parseHandoff(`#token=${JWT}&other=x`)).toBeUndefined();
  });
  it('keeps a remembered token in localStorage', () => {
    tokenStore.set(JWT, true);
    expect(localStorage.getItem(TOKEN_KEY)).toBe(JWT);
    expect(sessionStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(tokenStore.get()).toBe(JWT);
  });
  it('keeps a token that is not remembered only for this tab', () => {
    localStorage.setItem(TOKEN_KEY, 'old.remembered.token');
    tokenStore.set(JWT, false);
    expect(sessionStorage.getItem(TOKEN_KEY)).toBe(JWT);
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(tokenStore.get()).toBe(JWT);
  });
  it('signing out clears both storages', () => {
    localStorage.setItem(TOKEN_KEY, JWT);
    sessionStorage.setItem(TOKEN_KEY, JWT);
    tokenStore.clear();
    expect(tokenStore.get()).toBeNull();
  });
});
