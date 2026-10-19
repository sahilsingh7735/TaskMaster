const jwt = require('jsonwebtoken');

function authenticate(request, response, next) {
  const authorization = request.get('authorization') || '';
  const tokenMatch = authorization.match(/^Bearer\s+(.+)$/i);

  if (!tokenMatch) {
    return response.status(401).json({
      error: 'Authentication required'
    });
  }

  if (!process.env.JWT_SECRET) {
    return next(new Error('JWT_SECRET is not configured'));
  }

  try {
    request.auth = jwt.verify(tokenMatch[1], process.env.JWT_SECRET);
    return next();
  } catch (_error) {
    return response.status(401).json({
      error: 'Invalid or expired token'
    });
  }
}

module.exports = authenticate;