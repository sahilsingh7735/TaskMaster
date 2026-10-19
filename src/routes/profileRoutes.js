const express = require('express');
const authenticate = require('../middleware/authenticate');
const publicUser = require('../users/publicUser');
const UserStore = require('../users/userStore');

const router = express.Router();
const userStore = new UserStore();

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function validateProfileUpdate(body) {
  const errors = {};
  const updates = {};
  const fields = Object.keys(body);

  if (fields.length === 0) {
    errors.profile = 'At least one profile field is required';
  }

  const unsupportedFields = fields.filter((field) => !['name', 'email'].includes(field));

  if (unsupportedFields.length > 0) {
    errors.profile = 'Only name and email can be updated';
  }

  if (Object.prototype.hasOwnProperty.call(body, 'name')) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';

    if (name.length < 2 || name.length > 80) {
      errors.name = 'Name must be between 2 and 80 characters';
    } else {
      updates.name = name;
    }
  }

  if (Object.prototype.hasOwnProperty.call(body, 'email')) {
    const email = typeof body.email === 'string' ? normalizeEmail(body.email) : '';

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      errors.email = 'A valid email address is required';
    } else {
      updates.email = email;
    }
  }

  return { errors, updates };
}

router.use(authenticate);

router.get('/me', async (request, response, next) => {
  try {
    const user = await userStore.findById(request.auth.sub);

    if (!user) {
      return response.status(401).json({
        error: 'User account not found'
      });
    }

    return response.status(200).json({ user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
});

router.patch('/me', async (request, response, next) => {
  try {
    const { errors, updates } = validateProfileUpdate(request.body || {});

    if (Object.keys(errors).length > 0) {
      return response.status(400).json({
        error: 'Validation failed',
        fields: errors
      });
    }

    const result = await userStore.updateById(request.auth.sub, updates);

    if (result === 'not_found') {
      return response.status(401).json({
        error: 'User account not found'
      });
    }

    if (result === 'email_taken') {
      return response.status(409).json({
        error: 'An account with this email already exists'
      });
    }

    return response.status(200).json({
      message: 'Profile updated successfully',
      user: publicUser(result)
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;