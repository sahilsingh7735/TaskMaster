const fs = require('node:fs/promises');
const path = require('node:path');

const defaultTasksFile = path.join(__dirname, '..', '..', 'data', 'tasks.json');

class TaskStore {
  constructor(filePath = process.env.TASKMASTER_TASKS_FILE || defaultTasksFile) {
    this.filePath = filePath;
    this.writeQueue = Promise.resolve();
  }

  async readTasks() {
    try {
      const contents = await fs.readFile(this.filePath, 'utf8');
      const tasks = JSON.parse(contents);
      return Array.isArray(tasks) ? tasks : [];
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }

      await fs.mkdir(path.dirname(this.filePath), { recursive: true });
      await fs.writeFile(this.filePath, '[]\n', 'utf8');
      return [];
    }
  }

  async create(task) {
    const operation = this.writeQueue.then(async () => {
      const tasks = await this.readTasks();
      tasks.push(task);
      await fs.writeFile(this.filePath, `${JSON.stringify(tasks, null, 2)}\n`, 'utf8');
      return task;
    });

    this.writeQueue = operation.catch(() => undefined);
    return operation;
  }

  async findByUserId(userId) {
    const tasks = await this.readTasks();
    return tasks.filter((task) => task.userId === userId);
  }

  async markCompleted(taskId, userId) {
    const operation = this.writeQueue.then(async () => {
      const tasks = await this.readTasks();
      const taskIndex = tasks.findIndex((task) => task.id === taskId && task.userId === userId);

      if (taskIndex === -1) {
        return null;
      }

      const completedTask = { ...tasks[taskIndex], status: 'completed' };
      tasks[taskIndex] = completedTask;
      await fs.writeFile(this.filePath, `${JSON.stringify(tasks, null, 2)}\n`, 'utf8');
      return completedTask;
    });

    this.writeQueue = operation.catch(() => undefined);
    return operation;
  }
}

module.exports = TaskStore;