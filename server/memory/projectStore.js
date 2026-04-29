const fs = require('fs');
const path = require('path');

const STORE_FILE = path.resolve(__dirname, '../projects/store.json');

class ProjectStore {
  constructor() {
    this.projects = {};
    this.baseProjectsDir = path.resolve(__dirname, '../projects');
    this.writeQueue = Promise.resolve();

    if (!fs.existsSync(this.baseProjectsDir)) {
      fs.mkdirSync(this.baseProjectsDir, { recursive: true });
    }

    this.ready = this._loadFromDisk();
  }

  async _loadFromDisk() {
    try {
      if (fs.existsSync(STORE_FILE)) {
        const raw = await fs.promises.readFile(STORE_FILE, 'utf8');
        this.projects = JSON.parse(raw);
        console.log(`[ProjectStore] Loaded ${Object.keys(this.projects).length} project(s) from disk.`);
      }
    } catch (err) {
      console.error('[ProjectStore] Failed to load from disk:', err.message);
      this.projects = {};
    }
  }

  async _saveToDisk() {
    // Capture state synchronously to ensure what we write matches the state when _saveToDisk was called
    const data = JSON.stringify(this.projects, null, 2);

    this.writeQueue = this.writeQueue.then(async () => {
      try {
        await fs.promises.writeFile(STORE_FILE, data);
      } catch (err) {
        console.error('[ProjectStore] Failed to save to disk:', err.message);
      }
    });

    return this.writeQueue;
  }

  createProject(name) {
    const timestamp = new Date().toISOString().replace(/T/, '-').replace(/:/g, '').split('.')[0];
    const safeName = name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const dirName = `${timestamp}-${safeName}`;
    const projectDir = path.join(this.baseProjectsDir, dirName);

    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }

    const projectId = `proj_${Date.now()}`;
    const newProject = {
      id: projectId,
      name,
      status: 'requirements',
      directory: projectDir,
      requirements: [],
      tasks: [],
      todos: [],
    };

    this.projects[projectId] = newProject;
    this._saveToDisk();
    return newProject;
  }

  getProject(id) {
    return this.projects[id];
  }

  getAllProjects() {
    return Object.values(this.projects);
  }

  addItem(projectId, phase, text) {
    const project = this.projects[projectId];
    if (!project || !project[phase]) return null;

    const newItem = {
      id: `item_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      text,
      signedOff: false,
      aiApprovals: [],
      aiApproved: false,
    };

    if (phase === 'todos') {
      newItem.status = 'pending';
      newItem.lockedBy = null;
      newItem.output = null;
    }

    project[phase].push(newItem);
    this._saveToDisk();
    return project;
  }

  approveItem(projectId, phase, itemId, agentName) {
    const project = this.projects[projectId];
    if (!project || !project[phase]) return null;

    const item = project[phase].find(i => i.id === itemId);
    if (item && !item.aiApprovals.includes(agentName)) {
      item.aiApprovals.push(agentName);
      this._saveToDisk();
    }
    return project;
  }

  reviseItem(projectId, phase, itemId, newText) {
    const project = this.projects[projectId];
    if (!project || !project[phase]) return null;

    const item = project[phase].find(i => i.id === itemId);
    if (item) {
      item.text = newText;
      item.aiApprovals = []; // Reset approvals on revision
      item.aiApproved = false;
      this._saveToDisk();
    }
    return project;
  }

  signOffItem(projectId, phase, itemId) {
    const project = this.projects[projectId];
    if (!project || !project[phase]) return null;

    const item = project[phase].find(i => i.id === itemId);
    if (item) {
      item.signedOff = !item.signedOff;
    }
    this._saveToDisk();
    return project;
  }

  promotePhase(projectId) {
    const project = this.projects[projectId];
    if (!project) return null;

    if (project.status === 'requirements') {
      project.status = 'tasks';
    } else if (project.status === 'tasks') {
      project.status = 'todos';
    } else if (project.status === 'todos') {
      project.status = 'completed';
    }
    this._saveToDisk();
    return project;
  }

  lockTodo(projectId, todoId, agentName) {
    const project = this.projects[projectId];
    if (!project) return null;

    const todo = project.todos.find(t => t.id === todoId);
    if (todo && todo.status === 'pending') {
      todo.status = 'locked';
      todo.lockedBy = agentName;
      this._saveToDisk();
      return true;
    }
    return false;
  }

  completeTodo(projectId, todoId, output) {
    const project = this.projects[projectId];
    if (!project) return null;

    const todo = project.todos.find(t => t.id === todoId);
    if (todo && todo.status === 'locked') {
      todo.status = 'done';
      todo.output = output;
      todo.signedOff = false;
      this._saveToDisk();
      return true;
    }
    return false;
  }
}

const store = new ProjectStore();
module.exports = store;
