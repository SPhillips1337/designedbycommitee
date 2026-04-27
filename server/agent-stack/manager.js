const { validateDesign } = require('./skills/designValidator');
const { getContext, saveContext } = require('./memory/store');

class ManagerAgent {
  constructor(wss) {
    this.wss = wss;
    this.name = "ManagerAgent";
  }

  // Handle incoming design updates from the frontend
  async handleDesignUpdate(update, userId) {
    console.log(`[${this.name}] Received update from ${userId}:`, update);
    
    // 1. Get recent context
    const context = getContext();
    
    // 2. Delegate to Worker Skill (ClawTeam pattern)
    const validationResult = validateDesign(update, context);
    
    // 3. Process Result (devsys Orchestration pattern)
    if (!validationResult.isValid) {
      // Broadcast a proactive message if the design breaks tokens
      this.broadcastProactiveMessage(validationResult.feedback);
    } else {
      // Save valid context
      saveContext({ lastUpdate: update, timestamp: Date.now() });
    }
  }

  broadcastProactiveMessage(message) {
    const aiMessage = {
      id: Date.now(),
      sender: 'AI Architect',
      action: 'suggests',
      detail: message,
      type: 'system'
    };
    
    this.wss.clients.forEach((client) => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(JSON.stringify({ type: 'new_message', message: aiMessage }));
      }
    });
  }
}

module.exports = ManagerAgent;
