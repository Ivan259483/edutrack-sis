import mongoose from 'mongoose';

// One active "forgot password" code per account. Only an HMAC of the code is
// stored; requesting a new code replaces the old one.
const passwordResetSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  codeHash: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  sentAt: { type: Date, default: Date.now },
  // MongoDB deletes the record when the code expires.
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
});

export default mongoose.model('PasswordReset', passwordResetSchema);
