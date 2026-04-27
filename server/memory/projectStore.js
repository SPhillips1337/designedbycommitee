const fs = require('fs');
const path = require('path');

class ProjectStore {
  constructor() {
    this.projects = {};
    this.baseProjectsDir = path.resolve(__dirname, '../projects');
    
    if (!fs.existsSync(this.baseProjectsDir)) {
      fs.mkdirSync(this.baseProjectsDir, { recursive: true });
    }
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
      status: 'requirements', // requirements, tasks, todos, completed
      directory: projectDir,
      requirements: [],
      tasks: [],
      todos: [],
    };

    this.projects[projectId] = newProject;
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
    if (!project) return null;

    // phase should be one of 'requirements', 'tasks', 'todos'
    if (!project[phase]) return null;

    const newItem = {
      id: `item_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      text,
      signedOff: false,
    };

    if (phase === 'todos') {
      newItem.status = 'pending'; // pending, locked, done
      newItem.lockedBy = null;
      newItem.output = null;
    }

    project[phase].push(newItem);
    return project;
  }

  signOffItem(projectId, phase, itemId) {
    const project = this.projects[projectId];
    if (!project || !project[phase]) return null;

    const item = project[phase].find(i => i.id === itemId);
    if (item) {
      item.signedOff = !item.signedOff; // toggle
    }
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
    return project;
  }

  lockTodo(projectId, todoId, agentName) {
    const project = this.projects[projectId];
    if (!project) return null;

    const todo = project.todos.find(t => t.id === todoId);
    if (todo && todo.status === 'pending') {
      todo.status = 'locked';
      todo.lockedBy = agentName;
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
      todo.signedOff = false; // Requires review sign-off
      return true;
    }
    return false;
  }
}

// Singleton pattern
const store = new ProjectStore();
module.exports = store;
