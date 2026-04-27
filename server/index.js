const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const ManagerAgent = require('./agent-stack/manager');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const aiManager = new ManagerAgent(wss);

// Simple memory store for demonstration
let designState = {
  borderRadius: 16,
  primaryColor: '#A3A6FF',
};

let messages = [
  { id: 1, sender: 'System', action: 'initialized', detail: 'the design session', type: 'system' }
];

let activeUsers = new Set();

wss.on('connection', (ws) => {
  console.log('Client connected');
  
  // Get active AI members to display in UI
  const aiMembers = aiManager.getActiveMembers();
  const projectStore = require('./memory/projectStore');
  
  // Send initial state
  ws.send(JSON.stringify({ type: 'init', state: designState, messages, aiMembers, projects: projectStore.getAllProjects() }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'user_join':
          activeUsers.add(data.userId);
          broadcast({ type: 'presence', users: Array.from(activeUsers), aiMembers });
          // Proactive welcome from the AI Architect
          aiManager.broadcastProactiveMessage(`Welcome to the committee, ${data.userId}. I am the AI Architect. I'll be monitoring our design tokens to ensure we stay within the Luminous Obsidian guidelines.`);
          break;
          
        case 'update_design':
          // Agent validation hook (Manager-Worker pattern)
          aiManager.handleDesignUpdate(data.changes, data.userId || 'User');
          
          designState = { ...designState, ...data.changes };
          const changeMsg = { 
            id: Date.now(), 
            sender: data.userId || 'User', 
            action: 'updated', 
            detail: Object.keys(data.changes).join(', '),
            type: 'vote'
          };
          messages.push(changeMsg);
          broadcast({ type: 'state_update', state: designState, new_message: changeMsg });
          break;

        case 'chat':
          const chatMsg = { 
            id: Date.now(), 
            sender: data.userId || 'User', 
            action: 'says', 
            detail: data.text,
            type: 'comment'
          };
          messages.push(chatMsg);
          broadcast({ type: 'new_message', message: chatMsg });
          
          // Trigger the LLM committee to respond!
          aiManager.handleCommitteeChat(data.text, data.userId);
          break;

        case 'create_project': {
          const projectStore = require('./memory/projectStore');
          const newProject = projectStore.createProject(data.name);
          broadcast({ type: 'project_updated', project: newProject, projects: projectStore.getAllProjects() });
          const projMsg = { id: Date.now(), sender: 'System', action: 'created project', detail: newProject.name, type: 'system' };
          messages.push(projMsg);
          broadcast({ type: 'new_message', message: projMsg });
          aiManager.handleCommitteeChat(`I just created a new project called "${newProject.name}". What should our requirements be?`, data.userId);
          break;
        }

        case 'add_project_item': {
          const projectStore = require('./memory/projectStore');
          const updatedProj = projectStore.addItem(data.projectId, data.phase, data.text);
          if (updatedProj) {
            broadcast({ type: 'project_updated', project: updatedProj, projects: projectStore.getAllProjects() });
          }
          break;
        }

        case 'sign_off_item': {
          const projectStore = require('./memory/projectStore');
          const updatedProj = projectStore.signOffItem(data.projectId, data.phase, data.itemId);
          if (updatedProj) {
            broadcast({ type: 'project_updated', project: updatedProj, projects: projectStore.getAllProjects() });
          }
          break;
        }

        case 'promote_phase': {
          const projectStore = require('./memory/projectStore');
          const updatedProj = projectStore.promotePhase(data.projectId);
          if (updatedProj) {
            broadcast({ type: 'project_updated', project: updatedProj, projects: projectStore.getAllProjects() });
            
            const msg = { id: Date.now(), sender: 'System', action: 'promoted project phase to', detail: updatedProj.status, type: 'system' };
            messages.push(msg);
            broadcast({ type: 'new_message', message: msg });
            
            aiManager.handleCommitteeChat(`The project "${updatedProj.name}" was promoted to the ${updatedProj.status} phase. What are our next steps?`, data.userId);
          }
          break;
        }
      }
    } catch (err) {
      console.error('Error processing message', err);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    // We would remove the user from activeUsers here
  });
});

function broadcast(data) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

wss.on('error', (err) => {
  console.error('WebSocket Server Error:', err);
});

const PORT = process.env.PORT || 4002;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT} (0.0.0.0)`);
});
