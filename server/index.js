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
  
  // Send initial state
  ws.send(JSON.stringify({ type: 'init', state: designState, messages }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'user_join':
          activeUsers.add(data.userId);
          broadcast({ type: 'presence', users: Array.from(activeUsers) });
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
          break;
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

const PORT = process.env.PORT || 4002;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
