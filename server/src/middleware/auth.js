import jwt from 'jsonwebtoken';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured in server/.env');
  }
  return secret;
}

export function signToken(payload) {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

export function verifyToken(token) {
  return jwt.verify(token, getJwtSecret());
}

/**
 * Express middleware enforcing a valid Bearer JWT.
 */
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  try {
    req.user = verifyToken(token);
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token. Please log in again.' });
  }
}

/**
 * Socket.IO middleware validating JWT passed in handshake.auth.token or Authorization header.
 */
export function socketAuthMiddleware(socket, next) {
  const authToken = socket.handshake.auth?.token;
  const header = socket.handshake.headers?.authorization || '';
  const bearerToken = header.startsWith('Bearer ') ? header.slice(7) : null;
  const token = authToken || bearerToken;

  if (!token) {
    return next(new Error('Authentication required'));
  }

  try {
    socket.user = verifyToken(token);
    return next();
  } catch {
    return next(new Error('Invalid or expired token'));
  }
}

