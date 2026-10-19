const crypto = require('node:crypto');
const express = require('express');
const UserStore = require('../users/userStore');

const router = express.Router();
const userStore = new UserStore();

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${derivedKey}`;
}

function validateRegistration(body) {
  const errors = {};
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? normalizeEmail(body.email) : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (name.length < 2 || name.length > 80) {
    errors.name = 'Name must be between 2 and 80 characters';
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    errors.email = 'A valid email address is required';
  }

  if (password.length < 8 || password.length > 128) {
    errors.password = 'Password must be between 8 and 128 characters';
  }

  return { errors, name, email, password };
}

router.post('/register', async (request, response, next) => {
  try {
    const { errors, name, email, password } = validateRegistration(request.body || {});

    if (Object.keys(errors).length > 0) {
      return response.status(400).json({
        error: 'Validation failed',
        fields: errors
      });
    }

    if (await userStore.findByEmail(email)) {
      return response.status(409).json({
        error: 'An account with this email already exists'
      });
    }

    const user = await userStore.create({
      id: crypto.randomUUID(),
      name,
      email,
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString()
    });

    if (!user) {
      return response.status(409).json({
        error: 'An account with this email already exists'
      });
    }

    return response.status(201).json({
      message: 'Account created successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;