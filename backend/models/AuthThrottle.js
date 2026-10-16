import mongoose from 'mongoose';

// Counters for sign-in failures, reset-code guesses and request cooldowns.
// Kept in MongoDB (not in memory) because on Vercel every request may run in a
// different serverless instance. Keys look like `login:<user id>`.
const authThrottleSchema = new mongoose.Schema({
  _id: { type: String },
  count: { type: Number, default: 0 },
  windowStart: { type: Date, default: Date.now },
  lockedUntil: { type: Date, default: null },
  // MongoDB deletes the record once it no longer matters.
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
});

export default mongoose.model('AuthThrottle', authThrottleSchema);
