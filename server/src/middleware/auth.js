import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export async function requireAuth(req, res, next) {
  try {
    const [scheme, token] = (req.headers.authorization || '').split(' ');
    if (scheme !== 'Bearer' || !token) return res.status(401).json({ error: 'Please sign in to continue.' });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ error: 'Session is no longer valid. Please sign in again.' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session. Please sign in again.' });
  }
}
