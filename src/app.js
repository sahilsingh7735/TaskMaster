const express = require('express');

const app = express();

app.use(express.json());

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
