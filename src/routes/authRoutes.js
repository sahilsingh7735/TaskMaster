const crypto = require('node:crypto');
const express = require('express');
const jwt = require('jsonwebtoken');
const { hashPassword, verifyPassword } = require('../users/password');
const publicUser = require('../users/publicUser');
const UserStore = require('../users/userStore');

const router = express.Router();
const userStore = new UserStore();
const dummyPasswordHash = hashPassword('invalid-login-password');

function normalizeEmail(email) {
  return email.trim().toLowerCase();
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

function validateLogin(body) {
  const errors = {};
  const email = typeof body.email === 'string' ? normalizeEmail(body.email) : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    errors.email = 'A valid email address is required';
  }

  if (password.length < 1 || password.length > 128) {
    errors.password = 'Password is required';
  }

  return { errors, email, password };
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
      user: publicUser(user)
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/login', async (request, response, next) => {
  try {
    const { errors, email, password } = validateLogin(request.body || {});

    if (Object.keys(errors).length > 0) {
      return response.status(400).json({
        error: 'Validation failed',
        fields: errors
      });
    }

    const user = await userStore.findByEmail(email);

    const passwordHash = user ? user.passwordHash : dummyPasswordHash;

    if (!verifyPassword(password, passwordHash)) {
      return response.status(401).json({
        error: 'Invalid email or password'
      });
    }

    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not configured');
    }

    const accessToken = jwt.sign(
      { sub: user.id, type: 'access' },
      jwtSecret,
      { expiresIn: '1h' }
    );

    return response.status(200).json({
      message: 'Login successful',
      tokenType: 'Bearer',
      expiresIn: 3600,
      accessToken,
      user: publicUser(user)
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;