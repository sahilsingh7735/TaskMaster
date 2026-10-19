# TaskMaster API

A collaborative task tracking and management system built as the Airtribe Project 7 backend foundation.

## Current setup

- Node.js 20+
- Express 5
- dotenv for environment configuration
- JSON request handling
- Health endpoint at `GET /api/health`
- Account creation at `POST /api/auth/register`

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

## Story 1: Create an account

The registration endpoint accepts a JSON body with `name`, `email`, and `password`:

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Asha Kumar","email":"asha@example.com","password":"correct horse battery staple"}'
```

Successful requests return `201 Created` with the new user's `id`, `name`, `email`, and `createdAt`. Passwords are stored as salted `scrypt` hashes in `data/users.json`; the password and hash are never returned by the API.

Validation returns `400 Bad Request`, and an email already in use returns `409 Conflict`.

Run the Story 1 tests with:

```bash
npm test
```

## Project structure

```text
src/
  app.js       Express application and middleware
  server.js    Environment loading and HTTP server startup
  routes/      HTTP routes, including account registration
  users/       User persistence
data/
  users.json   Local user records for development
```

## Initial endpoints

`GET /api/health` confirms that the service is running. Feature work such as authentication, database integration, projects, tasks, and collaboration should be added in separate pull requests.

At this stage, `POST /api/auth/register` is the only account feature implemented. Login, sessions, profiles, tasks, projects, comments, attachments, notifications, and AI features are intentionally out of scope for Story 1.

## Git workflow

Create a branch for each feature, keep pull requests focused, and update this README as new modules are introduced.
