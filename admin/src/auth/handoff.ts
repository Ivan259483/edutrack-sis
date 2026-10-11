import type { Handoff } from './context';

// The EduTrack login page hands an admin over as `#token=<jwt>`, followed by
// `&remember=0` when "Remember Me" was not checked.
export function parseHandoff(hash: string): Handoff | undefined {
  const match = /^#token=([\w-]+\.[\w-]+\.[\w-]+)(&remember=0)?$/.exec(hash);
  return match ? { token: match[1], remember: !match[2] } : undefined;
}
