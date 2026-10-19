const fs = require('node:fs/promises');
const path = require('node:path');

const defaultUsersFile = path.join(__dirname, '..', '..', 'data', 'users.json');

class UserStore {
  constructor(filePath = process.env.TASKMASTER_USERS_FILE || defaultUsersFile) {
    this.filePath = filePath;
    this.writeQueue = Promise.resolve();
  }

  async readUsers() {
    try {
      const contents = await fs.readFile(this.filePath, 'utf8');
      const users = JSON.parse(contents);
      return Array.isArray(users) ? users : [];
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }

      await fs.mkdir(path.dirname(this.filePath), { recursive: true });
      await fs.writeFile(this.filePath, '[]\n', 'utf8');
      return [];
    }
  }

  async create(user) {
    const operation = this.writeQueue.then(async () => {
      const users = await this.readUsers();

      if (users.some((existingUser) => existingUser.email === user.email)) {
        return null;
      }

      users.push(user);
      await fs.writeFile(this.filePath, `${JSON.stringify(users, null, 2)}\n`, 'utf8');
      return user;
    });

    this.writeQueue = operation.catch(() => undefined);
    return operation;
  }

  async findByEmail(email) {
    const users = await this.readUsers();
    return users.find((user) => user.email === email) || null;
  }
}

module.exports = UserStore;