const { validateDesign } = require('./skills/designValidator');
const { getContext, saveContext } = require('./memory/store');
const { callLLM } = require('./llm');

class ManagerAgent {
  constructor(wss) {
    this.wss = wss;
    this.name = "ManagerAgent";
    this.chatHistory = [];
    
    // Start background worker to pick up pending todos
    setInterval(() => this.processPendingTodos(), 5000);
  }

  async processPendingTodos() {
    const projectStore = require('../memory/projectStore');
    const projects = projectStore.getAllProjects();
    const members = this.getActiveMembers();
    const openCodeMember = members.find(m => m.id === 'opencode-cli');

    if (!openCodeMember) return; // If opencode is not available, do nothing for now

    for (const project of projects) {
      if (project.status === 'todos') {
        const pendingTodo = project.todos.find(t => t.status === 'pending');
        if (pendingTodo) {
          // Lock it
          if (projectStore.lockTodo(project.id, pendingTodo.id, openCodeMember.name)) {
            this.broadcastMessage('System', 'locked todo', pendingTodo.text, 'system');
            
            // Broadcast state update
            this.broadcastStateUpdate();
            
            // Tell OpenCode to execute it
            const prompt = `Please complete the following Todo for the project "${project.name}":
Todo: ${pendingTodo.text}

You MUST create and modify files ONLY within this directory: ${project.directory}
Do not modify files outside this directory.`;
            
            try {
              const { callLLM } = require('./llm');
              const output = await callLLM(prompt, prompt, openCodeMember.id);
              
              // Mark complete
              projectStore.completeTodo(project.id, pendingTodo.id, output);
              this.broadcastMessage(openCodeMember.name, 'completed todo', pendingTodo.text, 'system');
              this.broadcastStateUpdate();
              
              // Ask another model to review it
              const reviewer = members.find(m => m.id !== 'opencode-cli');
              if (reviewer) {
                const reviewPrompt = `OpenCode just completed the todo: "${pendingTodo.text}". 
Here is its output/log:
${output.slice(-1000)}

Please provide a 1-2 sentence review of this completion.`;
                const review = await callLLM(reviewPrompt, "Please review OpenCode's work", reviewer.id);
                this.broadcastMessage(reviewer.name, 'says', review, 'comment');
              }

            } catch (err) {
              console.error(`Error executing todo with ${openCodeMember.name}:`, err);
              // Unlock it on failure
              pendingTodo.status = 'pending';
              pendingTodo.lockedBy = null;
              this.broadcastStateUpdate();
            }
          }
        }
      }
    }
  }

  broadcastStateUpdate() {
    const projectStore = require('../memory/projectStore');
    this.wss.clients.forEach((client) => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(JSON.stringify({ type: 'project_updated', projects: projectStore.getAllProjects() }));
      }
    });
  }

  // Detect which LLMs have been configured in .env
  getActiveMembers() {
    const members = [];
    if (process.env.LOCAL_LLM_API_BASE) members.push({ id: 'local', name: 'Local Model' });
    if (process.env.REMOTE_LLM_API_BASE) members.push({ id: 'remote', name: 'Remote Model' });
    if (process.env.OPENAI_API_KEY) members.push({ id: 'openai', name: 'OpenAI' });
    if (process.env.GEMINI_API_KEY) members.push({ id: 'gemini', name: 'Gemini' });
    if (process.env.OPENROUTER_API_KEY) members.push({ id: 'openrouter', name: 'OpenRouter' });
    if (process.env.ANTHROPIC_API_KEY) members.push({ id: 'anthropic', name: 'Claude' });
    if (process.env.USE_GEMINI_CLI === 'true') members.push({ id: 'gemini-cli', name: 'Gemini CLI' });
    if (process.env.USE_OPENCODE_CLI === 'true') members.push({ id: 'opencode-cli', name: 'OpenCode CLI' });
    
    // Fallback if none configured
    if (members.length === 0) {
      members.push({ id: 'local', name: 'Fallback Model' });
    }
    return members;
  }

  async handleCommitteeChat(text, senderId, depth = 0) {
    const members = this.getActiveMembers();
    
    // Add to history
    if (!this.chatHistory) this.chatHistory = [];
    this.chatHistory.push({ sender: senderId, text });
    if (this.chatHistory.length > 8) this.chatHistory.shift();

    const historyStr = this.chatHistory.map(msg => `${msg.sender}: ${msg.text}`).join('\n');

    // If it's an AI and we reached max depth, stop to prevent infinite loops
    if (depth >= 2) return;

    // If it's a user, all models respond. If it's an AI, pick 1 random other model to reply.
    let responders = members;
    if (senderId !== 'System' && !senderId.startsWith('user_')) {
      // It's an AI replying to another AI
      const otherMembers = members.filter(m => m.name !== senderId);
      if (otherMembers.length > 0) {
        // Randomly decide if someone should reply (60% chance)
        if (Math.random() < 0.6) {
          const randomMember = otherMembers[Math.floor(Math.random() * otherMembers.length)];
          responders = [randomMember];
        } else {
          responders = [];
        }
      }
    }

    responders.forEach(async (member) => {
      const systemPrompt = `You are a member of a development swarm committee ("DesignedByCommittee").
Here is the recent conversation history:
${historyStr}

Please provide a brief, opinionated response (1-3 sentences) on design, architecture, or the latest suggestion.
Keep it punchy, collaborative, and distinct. Do not prefix your message with your name.`;

      try {
        const responseText = await callLLM(systemPrompt, text, member.id);
        if (responseText) {
          this.broadcastMessage(member.name, 'says', responseText, 'comment');
          // Give the other models a chance to reply to this AI
          setTimeout(() => {
            this.handleCommitteeChat(responseText, member.name, depth + 1);
          }, 1000);
        }
      } catch (err) {
        console.error(`Error querying ${member.name}:`, err);
      }
    });
  }

  async handleDesignUpdate(update, userId) {
    console.log(`[${this.name}] Received update from ${userId}:`, update);
    const context = getContext();
    const validationResult = validateDesign(update, context);
    
    if (!validationResult.isValid) {
      this.broadcastProactiveMessage(validationResult.feedback);
    } else {
      saveContext({ lastUpdate: update, timestamp: Date.now() });
    }
  }

  broadcastProactiveMessage(message) {
    this.broadcastMessage('AI Architect', 'suggests', message, 'system');
  }

  broadcastMessage(sender, action, detail, type) {
    const msg = { id: Date.now() + Math.random(), sender, action, detail, type };
    this.wss.clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(JSON.stringify({ type: 'new_message', message: msg }));
      }
    });
  }
}

module.exports = ManagerAgent;
