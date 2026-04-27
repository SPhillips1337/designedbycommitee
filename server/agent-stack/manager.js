const { validateDesign } = require('./skills/designValidator');
const { getContext, saveContext } = require('./memory/store');
const { callLLM } = require('./llm');

class ManagerAgent {
  constructor(wss) {
    this.wss = wss;
    this.name = "ManagerAgent";
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

  async handleCommitteeChat(text, userId) {
    const members = this.getActiveMembers();
    const systemPrompt = `You are a member of a design committee ("DesignedByCommittee").
The user ${userId} has just said: "${text}".
Please provide a brief, opinionated response (1-3 sentences) on design, architecture, or the user's suggestion.
Keep it punchy, collaborative, and distinct. Do not prefix your message with your name.`;

    // Fire off all requests concurrently, but we'll broadcast them as they arrive
    members.forEach(async (member) => {
      try {
        const responseText = await callLLM(systemPrompt, text, member.id);
        if (responseText) {
          this.broadcastMessage(member.name, 'says', responseText, 'comment');
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
