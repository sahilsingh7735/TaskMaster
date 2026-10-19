# TaskMaster API

A collaborative task tracking and management system built as the Airtribe Project 7 backend foundation.

## Current setup

- Node.js 20+
- Express 5
- dotenv for environment configuration
- JSON request handling
- Health endpoint at `GET /api/health`
- Account creation at `POST /api/auth/register`
- Secure login at `POST /api/auth/login`
- Profile viewing at `GET /api/users/me`
- Profile updates at `PATCH /api/users/me`
- Task creation at `POST /api/tasks`
- Assigned-task listing at `GET /api/tasks`
- Task completion at `PATCH /api/tasks/:taskId/status`

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

## Story 2: Log in

Set `JWT_SECRET` in `.env` to a long random value before starting the API. Login accepts the registered email and password:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"asha@example.com","password":"correct horse battery staple"}'
```

Successful requests return `200 OK` with a signed Bearer access token that expires after one hour and the public user fields. Invalid credentials return the same `401 Unauthorized` response whether the email or password is incorrect, preventing account enumeration. Missing or malformed fields return `400 Bad Request`.

## Story 3: View and update a profile

Profile endpoints require the Bearer token returned by login. View the current user's public profile with:

```bash
curl http://localhost:3000/api/users/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Update the user's name and/or email with:

```bash
curl -X PATCH http://localhost:3000/api/users/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Asha Singh","email":"asha.singh@example.com"}'
```

Successful requests return the public `id`, `name`, `email`, and `createdAt` fields. Passwords cannot be changed through the profile endpoint and password hashes are never returned. Missing, expired, or invalid tokens return `401 Unauthorized`; invalid profile data returns `400 Bad Request`; an email already in use returns `409 Conflict`.

## Story 4: Create a task

Task creation requires a Bearer token and accepts `title`, `description`, and an ISO 8601 `dueDate`:

```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Plan sprint","description":"Prepare the sprint backlog","dueDate":"2026-10-24T18:00:00.000Z"}'
```

Successful requests return `201 Created` with the task's server-generated `id`, authenticated `userId`, normalized title/description/due date, `status: "open"`, and `createdAt`. Missing or invalid fields return `400 Bad Request`; missing or invalid tokens return `401 Unauthorized`. Task editing, deletion, listing, filtering, searching, assignment, and collaboration are intentionally not implemented yet.

## Story 5: View assigned tasks

Retrieve the tasks owned by the authenticated user with:

```bash
curl http://localhost:3000/api/tasks \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

The endpoint returns `200 OK` with a `tasks` array containing only records whose server-owned `userId` matches the token subject. An account with no assigned tasks receives an empty array. Missing or invalid tokens return `401 Unauthorized`; filtering, sorting, searching, and task changes are intentionally out of scope for this story.

## Story 6: Mark a task as completed

Mark one of the authenticated user's tasks as completed with:

```bash
curl -X PATCH http://localhost:3000/api/tasks/TASK_ID/status \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"completed"}'
```

The endpoint returns `200 OK` with the updated task. Missing or invalid tokens return `401 Unauthorized`, invalid status updates return `400 Bad Request`, and a task that does not belong to the authenticated user returns `404 Not Found`. Task editing, deletion, reassignment, and reverting completion are intentionally out of scope for this story.

## Project structure

```text
src/
  app.js       Express application and middleware
  server.js    Environment loading and HTTP server startup
  middleware/  JWT authentication middleware
  routes/      HTTP routes for auth, profiles, and task operations
  tasks/       Task persistence
  users/       User persistence, password verification, and public views
data/
  users.json   Local user records for development
  tasks.json   Local task records for development
```

## Initial endpoints

`GET /api/health` confirms that the service is running. Further feature work such as tasks, projects, and collaboration should be added in separate pull requests.

At this stage, account registration, login, profile viewing/updating, task creation, assigned-task listing, and task completion are implemented. Task editing/deletion, filtering, searching, reassignment, projects, comments, attachments, notifications, and AI features are intentionally out of scope for Stories 1 to 6.

## Git workflow

Create a branch for each feature, keep pull requests focused, and update this README as new modules are introduced.
