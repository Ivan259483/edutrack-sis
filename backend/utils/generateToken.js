import jwt from 'jsonwebtoken';

// Signs a JWT containing the user's ID, role and token version, valid for 24 hours.
// `protect` rejects tokens whose version no longer matches the account.
const generateToken = (user) =>
  jwt.sign({ id: String(user._id), role: user.role, tv: user.tokenVersion ?? 0 }, process.env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: '24h',
  });

export default generateToken;
