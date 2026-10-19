const express = require('express');
const authRoutes = require('./routes/authRoutes');

const app = express();

app.use(express.json());

app.use('/api/auth', authRoutes);

app.get('/api/health', (_request, response) => {
  response.status(200).json({
    status: 'ok',
    service: 'taskmaster-api'
  });
});

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({
    error: 'Internal server error'
  });
});

module.exports = app;
