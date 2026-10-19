const assert = require('node:assert/strict');
const fsSync = require('node:fs');
const fs = require('node:fs/promises');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const testDirectory = fsSync.mkdtempSync(path.join(os.tmpdir(), 'taskmaster-'));
process.env.TASKMASTER_USERS_FILE = path.join(testDirectory, 'users.json');
process.env.JWT_SECRET = 'test-only-jwt-secret-that-is-long-enough';

const app = require('../src/app');
const server = http.createServer(app);

test.before(async () => {
  await new Promise((resolve) => server.listen(0, resolve));
});

test.after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  fsSync.rmSync(testDirectory, { recursive: true, force: true });
});

async function register(payload) {
  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}/api/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });

  return {
    status: response.status,
    body: await response.json()
  };
}

async function login(payload) {
  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });

  return {
    status: response.status,
    body: await response.json()
  };
}

async function loginWithRawBody(body) {
  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body
  });

  return {
    status: response.status,
    body: await response.json()
  };
}

async function profileRequest(method, token, payload) {
  const address = server.address();
  const options = {
    method,
    headers: {
      'content-type': 'application/json'
    }
  };

  if (token) {
    options.headers.authorization = `Bearer ${token}`;
  }

  if (payload) {
    options.body = JSON.stringify(payload);
  }

  const response = await fetch(`http://127.0.0.1:${address.port}/api/users/me`, options);

  return {
    status: response.status,
    body: await response.json()
  };
}

async function createAuthenticatedUser(email, name) {
  await register({ name, email, password: 'profile test password' });
  const result = await login({ email, password: 'profile test password' });
  return result.body.accessToken;
}

test('creates an account and never returns the password hash', async () => {
  const result = await register({
    name: 'Asha Kumar',
    email: 'ASHA@example.com',
    password: 'correct horse battery staple'
  });

  assert.equal(result.status, 201);
  assert.equal(result.body.user.name, 'Asha Kumar');
  assert.equal(result.body.user.email, 'asha@example.com');
  assert.ok(result.body.user.id);
  assert.ok(result.body.user.createdAt);
  assert.equal('passwordHash' in result.body.user, false);
  assert.equal('password' in result.body.user, false);

  const storedUsers = JSON.parse(await fs.readFile(process.env.TASKMASTER_USERS_FILE, 'utf8'));
  assert.equal(storedUsers.length, 1);
  assert.match(storedUsers[0].passwordHash, /^scrypt\$[^$]+\$[^$]+$/);
  assert.notEqual(storedUsers[0].passwordHash, 'correct horse battery staple');
});

test('rejects duplicate email addresses case-insensitively', async () => {
  const result = await register({
    name: 'Another User',
    email: 'asha@EXAMPLE.com',
    password: 'another secure password'
  });

  assert.equal(result.status, 409);
  assert.equal(result.body.error, 'An account with this email already exists');
});

test('rejects invalid registration data', async () => {
  const result = await register({
    name: 'A',
    email: 'not-an-email',
    password: 'short'
  });

  assert.equal(result.status, 400);
  assert.deepEqual(Object.keys(result.body.fields).sort(), ['email', 'name', 'password']);
});

test('logs in with valid credentials and returns a bearer access token', async () => {
  const result = await login({
    email: 'ASHA@example.com',
    password: 'correct horse battery staple'
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.message, 'Login successful');
  assert.equal(result.body.tokenType, 'Bearer');
  assert.equal(result.body.expiresIn, 3600);
  assert.ok(result.body.accessToken);
  assert.equal(result.body.user.email, 'asha@example.com');
  assert.equal('passwordHash' in result.body.user, false);
});

test('rejects incorrect credentials without revealing which value is wrong', async () => {
  const wrongPassword = await login({
    email: 'asha@example.com',
    password: 'wrong password'
  });
  const unknownEmail = await login({
    email: 'missing@example.com',
    password: 'wrong password'
  });

  assert.equal(wrongPassword.status, 401);
  assert.deepEqual(wrongPassword.body, { error: 'Invalid email or password' });
  assert.equal(unknownEmail.status, 401);
  assert.deepEqual(unknownEmail.body, { error: 'Invalid email or password' });
});

test('rejects incomplete login data', async () => {
  const result = await login({ email: 'not-an-email' });

  assert.equal(result.status, 400);
  assert.deepEqual(Object.keys(result.body.fields).sort(), ['email', 'password']);
});

test('rejects malformed JSON request bodies', async () => {
  const result = await loginWithRawBody('{"email":');

  assert.equal(result.status, 400);
  assert.deepEqual(result.body, { error: 'Invalid JSON request body' });
});

test('requires authentication to view a profile', async () => {
  const result = await profileRequest('GET');

  assert.equal(result.status, 401);
  assert.deepEqual(result.body, { error: 'Authentication required' });
});

test('returns the authenticated user profile without sensitive fields', async () => {
  const token = await createAuthenticatedUser('profile-view@example.com', 'Profile Viewer');
  const result = await profileRequest('GET', token);

  assert.equal(result.status, 200);
  assert.equal(result.body.user.name, 'Profile Viewer');
  assert.equal(result.body.user.email, 'profile-view@example.com');
  assert.ok(result.body.user.id);
  assert.ok(result.body.user.createdAt);
  assert.equal('passwordHash' in result.body.user, false);
});

test('updates profile fields while preserving the password hash', async () => {
  const email = 'profile-update@example.com';
  const token = await createAuthenticatedUser(email, 'Before Update');
  const before = JSON.parse(await fs.readFile(process.env.TASKMASTER_USERS_FILE, 'utf8'))
    .find((user) => user.email === email);

  const update = await profileRequest('PATCH', token, {
    name: 'After Update',
    email: 'profile-updated@example.com'
  });

  assert.equal(update.status, 200);
  assert.equal(update.body.message, 'Profile updated successfully');
  assert.equal(update.body.user.name, 'After Update');
  assert.equal(update.body.user.email, 'profile-updated@example.com');
  assert.equal('passwordHash' in update.body.user, false);

  const after = JSON.parse(await fs.readFile(process.env.TASKMASTER_USERS_FILE, 'utf8'))
    .find((user) => user.id === before.id);
  assert.equal(after.passwordHash, before.passwordHash);
});

test('rejects unsupported profile fields', async () => {
  const token = await createAuthenticatedUser('profile-validation@example.com', 'Profile Validation');
  const result = await profileRequest('PATCH', token, {
    password: 'new password'
  });

  assert.equal(result.status, 400);
  assert.equal(result.body.fields.profile, 'Only name and email can be updated');
});