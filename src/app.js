const express = require('express');
const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');

const app = express();

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/users', profileRoutes);

app.get('/api/health', (_request, response) => {
  response.status(200).json({
    status: 'ok',
    service: 'taskmaster-api'
  });
});

app.use((error, _request, response, _next) => {
  if (error.type === 'entity.parse.failed') {
    return response.status(400).json({
      error: 'Invalid JSON request body'
    });
  }

  console.error(error);
  response.status(500).json({
    error: 'Internal server error'
  });
});

module.exports = app;
