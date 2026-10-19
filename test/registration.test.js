const assert = require('node:assert/strict');
const fsSync = require('node:fs');
const fs = require('node:fs/promises');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const testDirectory = fsSync.mkdtempSync(path.join(os.tmpdir(), 'taskmaster-'));
process.env.TASKMASTER_USERS_FILE = path.join(testDirectory, 'users.json');

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