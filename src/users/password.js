const crypto = require('node:crypto');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${derivedKey}`;
}

function verifyPassword(password, storedHash) {
  const parts = typeof storedHash === 'string' ? storedHash.split('$') : [];

  if (parts.length !== 3 || parts[0] !== 'scrypt') {
    return false;
  }

  try {
    const derivedKey = crypto.scryptSync(password, parts[1], 64);
    const storedKey = Buffer.from(parts[2], 'hex');

    return storedKey.length === derivedKey.length && crypto.timingSafeEqual(storedKey, derivedKey);
  } catch (_error) {
    return false;
  }
}

module.exports = { hashPassword, verifyPassword };