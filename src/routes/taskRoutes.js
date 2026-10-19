const crypto = require('node:crypto');
const express = require('express');
const authenticate = require('../middleware/authenticate');
const TaskStore = require('../tasks/taskStore');

const router = express.Router();
const taskStore = new TaskStore();

function validateTask(body) {
  const errors = {};
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const dueDateValue = typeof body.dueDate === 'string' ? body.dueDate.trim() : '';
  const dueDate = dueDateValue ? new Date(dueDateValue) : null;

  if (title.length < 1 || title.length > 200) {
    errors.title = 'Title must be between 1 and 200 characters';
  }

  if (description.length < 1 || description.length > 5000) {
    errors.description = 'Description must be between 1 and 5000 characters';
  }

  if (!dueDate || Number.isNaN(dueDate.getTime())) {
    errors.dueDate = 'A valid due date is required';
  }

  return {
    errors,
    task: {
      title,
      description,
      dueDate: dueDate && !Number.isNaN(dueDate.getTime()) ? dueDate.toISOString() : null
    }
  };
}

router.get('/', authenticate, async (request, response, next) => {
  try {
    const tasks = await taskStore.findByUserId(request.auth.sub);
    return response.status(200).json({ tasks });
  } catch (error) {
    return next(error);
  }
});

router.post('/', authenticate, async (request, response, next) => {
  try {
    const { errors, task: taskInput } = validateTask(request.body || {});

    if (Object.keys(errors).length > 0) {
      return response.status(400).json({
        error: 'Validation failed',
        fields: errors
      });
    }

    const task = await taskStore.create({
      id: crypto.randomUUID(),
      userId: request.auth.sub,
      ...taskInput,
      status: 'open',
      createdAt: new Date().toISOString()
    });

    return response.status(201).json({
      message: 'Task created successfully',
      task
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;