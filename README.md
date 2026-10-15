# TaskMaster API

A collaborative task tracking and management system built as the Airtribe Project 7 backend foundation.

## Current setup

- Node.js 20+
- Express 5
- dotenv for environment configuration
- JSON request handling
- Health endpoint at `GET /api/health`

## Run locally

```bash
npm install
copy .env.example .env
npm run dev
```

On macOS/Linux, use `cp .env.example .env` instead of `copy`.

The API starts on `http://localhost:3000` by default. Verify it with:

```bash
curl http://localhost:3000/api/health
```

## Project structure

```text
src/
  app.js       Express application and middleware
  server.js    Environment loading and HTTP server startup
```

## Initial endpoint

`GET /api/health` confirms that the service is running. Feature work such as authentication, database integration, projects, tasks, and collaboration should be added in separate pull requests.

## Git workflow

Create a branch for each feature, keep pull requests focused, and update this README as new modules are introduced.
