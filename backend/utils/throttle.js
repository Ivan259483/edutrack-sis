import AuthThrottle from '../models/AuthThrottle.js';

// Is this key locked? Returns the remaining milliseconds (0 when not locked).
export async function lockedFor(key) {
  const doc = await AuthThrottle.findById(key).lean();
  const remaining = doc?.lockedUntil ? doc.lockedUntil.getTime() - Date.now() : 0;
  return Math.max(0, remaining);
}

// Counts one failure inside a rolling window; after `limit` failures the key is
// locked for `lockMs`. Returns how many failures are left before the lock.
export async function recordFailure(key, { limit, windowMs, lockMs }) {
  const now = Date.now();
  let doc = await AuthThrottle.findOneAndUpdate(
    { _id: key, windowStart: { $gt: new Date(now - windowMs) } },
    { $inc: { count: 1 } },
    { new: true }
  );
  if (!doc) {
    doc = await AuthThrottle.findOneAndUpdate(
      { _id: key },
      { count: 1, windowStart: new Date(now), lockedUntil: null, expiresAt: new Date(now + windowMs + lockMs) },
      { upsert: true, new: true }
    );
  }
  if (doc.count >= limit) {
    doc.lockedUntil = new Date(now + lockMs);
    doc.expiresAt = new Date(now + lockMs);
    await doc.save();
  }
  return Math.max(0, limit - doc.count);
}

// Allows one action per `ms` (e.g. one reset code per minute). Returns 0 when
// the action may go ahead (and starts the cooldown), else the milliseconds left.
export async function cooldown(key, ms) {
  const now = Date.now();
  const doc = await AuthThrottle.findOneAndUpdate(
    { _id: key, $or: [{ lockedUntil: null }, { lockedUntil: { $lte: new Date(now) } }] },
    { count: 1, windowStart: new Date(now), lockedUntil: new Date(now + ms), expiresAt: new Date(now + ms) },
    { new: true }
  );
  if (doc) return 0;
  const remaining = await lockedFor(key);
  if (remaining) return remaining;
  // No record yet: create it (a concurrent duplicate insert just means "too soon").
  try {
    await AuthThrottle.create({ _id: key, count: 1, lockedUntil: new Date(now + ms), expiresAt: new Date(now + ms) });
    return 0;
  } catch (err) {
    if (err.code === 11000) return ms;
    throw err;
  }
}

export const clearThrottle = (...keys) => AuthThrottle.deleteMany({ _id: { $in: keys } });
