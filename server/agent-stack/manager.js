const { validateDesign } = require('./skills/designValidator');
const { getContext, saveContext } = require('./memory/store');
const { callLLM } = require('./llm');

class ManagerAgent {
  constructor(wss) {
    this.wss = wss;
    this.name = 'ManagerAgent';
    this.chatHistory = [];
    this.projectDebateCounts = {}; // projectId -> messages since last synthesis
    this.synthesisInProgress = {};  // projectId -> boolean
    this.currentProjectId = null;

    setInterval(() => this.processPendingTodos(), 5000);
  }

  // ─── Todo execution worker ──────────────────────────────────────────────────

  async processPendingTodos() {
    const projectStore = require('../memory/projectStore');
    await projectStore.ready;
    const projects = projectStore.getAllProjects();
    const members = this.getActiveMembers();
    const openCodeMember = members.find(m => m.id === 'opencode-cli');

    if (!openCodeMember) return;

    for (const project of projects) {
      if (project.status !== 'todos') continue;

      const pendingTodo = project.todos.find(t => t.status === 'pending');
      if (!pendingTodo) continue;

      if (!projectStore.lockTodo(project.id, pendingTodo.id, openCodeMember.name)) continue;

      this.broadcastMessage('System', 'locked todo', pendingTodo.text, 'system');
      this.broadcastStateUpdate();

      const prompt = `Please complete the following Todo for the project "${project.name}":
Todo: ${pendingTodo.text}

You MUST create and modify files ONLY within this directory: ${project.directory}
Do not modify files outside this directory.`;

      try {
        const output = await callLLM(prompt, prompt, openCodeMember.id);

        projectStore.completeTodo(project.id, pendingTodo.id, output);
        this.broadcastMessage(openCodeMember.name, 'completed todo', pendingTodo.text, 'system');
        this.broadcastStateUpdate();

        // Peer review
        const reviewer = members.find(m => m.id !== 'opencode-cli');
        if (reviewer) {
          const reviewPrompt = `OpenCode just completed the todo: "${pendingTodo.text}".
Output/log (last 1000 chars):
${(output || '').slice(-1000)}

Provide a 1-2 sentence review of this completion.`;
          const review = await callLLM(reviewPrompt, "Please review OpenCode's work", reviewer.id);
          if (review) this.broadcastMessage(reviewer.name, 'says', review, 'comment');
        }

        await this.checkAutoPromote(project.id);

        // Generate the next todo after execution completes, since synthesizeTodoItems
        // only produces one at a time and won't re-trigger unless chat is active.
        const refreshedProject = projectStore.getProject(project.id);
        if (refreshedProject && refreshedProject.status === 'todos') {
          setTimeout(() => this.synthesizeTodoItems(project.id), 3000);
        }
      } catch (err) {
        console.error(`Error executing todo with ${openCodeMember.name}:`, err);
        this.broadcastMessage('System', `error executing todo`, err.message, 'system');
        // Unlock on failure
        const todo = project.todos.find(t => t.id === pendingTodo.id);
        if (todo) { todo.status = 'pending'; todo.lockedBy = null; }
        this.broadcastStateUpdate();
      }
    }
  }

  // ─── Committee chat ─────────────────────────────────────────────────────────

  async handleCommitteeChat(text, senderId, projectId = null, depth = 0) {
    const projectStore = require('../memory/projectStore');
    await projectStore.ready;
    const members = this.getActiveMembers();

    this.chatHistory.push({ sender: senderId, text });
    if (this.chatHistory.length > 10) this.chatHistory.shift();

    if (projectId) this.currentProjectId = projectId;
    const activeProjectId = this.currentProjectId;

    if (depth >= 2) return;

    // Build project context block for system prompt
    let projectContext = '';
    if (activeProjectId) {
      const projectStore = require('../memory/projectStore');
      const project = projectStore.getProject(activeProjectId);
      if (project) {
        projectContext = `\nActive project: "${project.name}" (current phase: ${project.status})`;
        const phaseItems = project[project.status] || [];
        if (phaseItems.length > 0) {
          projectContext += `\nCurrent ${project.status}:\n${phaseItems.map(i => `- ${i.text}`).join('\n')}`;
        }
      }
    }

    const historyStr = this.chatHistory.map(m => `${m.sender}: ${m.text}`).join('\n');

    // Decide who responds
    let responders = members;
    if (senderId !== 'System' && !senderId.startsWith('user_')) {
      // AI-to-AI: one random other model, 60% of the time
      const others = members.filter(m => m.name !== senderId);
      responders = (others.length > 0 && Math.random() < 0.6)
        ? [others[Math.floor(Math.random() * others.length)]]
        : [];
    }

    for (const member of responders) {
      const systemPrompt = `You are a member of the "DesignedByCommittee" AI development swarm.${projectContext}
Recent conversation:
${historyStr}

Give a brief, opinionated response (1-3 sentences) on design, architecture, or the latest suggestion.
Be punchy and distinct. Do NOT prefix your message with your name.`;

      try {
        const responseText = await callLLM(systemPrompt, text, member.id);
        if (responseText) {
          this.broadcastMessage(member.name, 'says', responseText, 'comment');
          setTimeout(() => this.handleCommitteeChat(responseText, member.name, activeProjectId, depth + 1), 1000);
        }
      } catch (err) {
        console.error(`Error querying ${member.name}:`, err);
        this.broadcastMessage('System', `error from ${member.name}`, err.message, 'system');
      }
    }

    // Trigger draft synthesis at root depth only, once per 5 messages
    if (depth === 0 && activeProjectId && !this.synthesisInProgress[activeProjectId]) {
      this.projectDebateCounts[activeProjectId] = (this.projectDebateCounts[activeProjectId] || 0) + 1;
      const count = this.projectDebateCounts[activeProjectId];
      if (count >= 3 && count % 5 === 0) {
        setTimeout(() => this.synthesizeDraftItem(activeProjectId), 4000);
      }
    }
  }

  // ─── Draft synthesis ────────────────────────────────────────────────────────

  async synthesizeDraftItem(projectId) {
    if (this.synthesisInProgress[projectId]) {
      console.log(`[Synthesis] Already in progress for ${projectId}, skipping`);
      return;
    }
    this.synthesisInProgress[projectId] = true;

    const projectStore = require('../memory/projectStore');
    const project = projectStore.getProject(projectId);

    if (!project || project.status === 'completed') {
      this.synthesisInProgress[projectId] = false;
      return;
    }

    if (project.status === 'todos') {
      this.synthesisInProgress[projectId] = false;
      await this.synthesizeTodoItems(projectId);
      return;
    }

    const phase = project.status;
    const phaseLabel = phase === 'requirements' ? 'requirement' : 'task';
    const existingItems = project[phase].length > 0
      ? project[phase].map((i, n) => `${n + 1}. ${i.text}`).join('\n')
      : 'None yet.';
    const historyStr = this.chatHistory.slice(-8).map(m => `${m.sender}: ${m.text}`).join('\n');

    const members = this.getActiveMembers().filter(m => m.id !== 'opencode-cli');
    if (members.length === 0) { this.synthesisInProgress[projectId] = false; return; }

    const drafter = members[Math.floor(Math.random() * members.length)];
    console.log(`[Synthesis] ${drafter.name} drafting a ${phaseLabel} for "${project.name}"`);

    // Simple prompt — no enforced format. We parse defensively below.
    const systemPrompt = `You are a senior software architect synthesising ${phase} for the project "${project.name}".

Recent committee discussion:
${historyStr}

${phase} already captured:
${existingItems}

Write exactly ONE new ${phaseLabel} that is not already listed above. Write only the ${phaseLabel} itself — a single clear sentence with no prefix, no numbering, and no explanation. If all essential ${phase} are fully covered, write only the single word: COMPLETE`;

    try {
      const response = await callLLM(systemPrompt, `Write one ${phaseLabel} for "${project.name}"`, drafter.id);
      console.log(`[Synthesis] ${drafter.name} raw response: ${JSON.stringify(response)}`);

      if (!response) {
        console.log('[Synthesis] No response received');
        this.synthesisInProgress[projectId] = false;
        return;
      }

      const trimmed = response.trim();

      // Detect "all done" signal
      if (/^complete\.?$/i.test(trimmed) || /^all\s+(essential\s+)?requirements\s+are/i.test(trimmed)) {
        this.broadcastMessage(drafter.name, 'suggests', `The ${phase} for "${project.name}" look complete — review and sign off each item to advance.`, 'system');
        this.synthesisInProgress[projectId] = false;
        return;
      }

      // Extract the first substantive line and strip any prefix the model added despite instructions
      const firstLine = trimmed
        .split('\n')
        .map(l => l.trim())
        .find(l => l.length > 8);

      if (!firstLine) {
        console.log('[Synthesis] Could not extract a line from response');
        this.synthesisInProgress[projectId] = false;
        return;
      }

      const itemText = firstLine
        .replace(/^(draft|requirement|task|todo|item|note)\s*:\s*/i, '')
        .replace(/^\d+\.\s*/, '')
        .replace(/^[-•*]\s*/, '')
        .replace(/^["']|["']$/g, '')
        .trim();

      if (itemText.length < 8) {
        console.log(`[Synthesis] Extracted text too short: "${itemText}"`);
        this.synthesisInProgress[projectId] = false;
        return;
      }

      console.log(`[Synthesis] Adding ${phaseLabel}: "${itemText}"`);
      const updatedProject = projectStore.addItem(projectId, phase, itemText);
      if (!updatedProject) { this.synthesisInProgress[projectId] = false; return; }

      this.broadcastMessage(drafter.name, `proposed a ${phaseLabel}`, itemText, 'vote');
      this.broadcastStateUpdate();
      this.projectDebateCounts[projectId] = 0;

      const newItem = updatedProject[phase][updatedProject[phase].length - 1];
      setTimeout(async () => {
        await this.triggerItemReview(projectId, phase, newItem, drafter.name);
        this.synthesisInProgress[projectId] = false;
        // Self-propagate: draft the next item after review completes
        setTimeout(() => this.synthesizeDraftItem(projectId), 6000);
      }, 2000);

    } catch (err) {
      console.error('[Synthesis] Error:', err.message);
      this.broadcastMessage('System', 'synthesis error', err.message, 'system');
      this.synthesisInProgress[projectId] = false;
    }
  }

  async synthesizeTodoItems(projectId) {
    const projectStore = require('../memory/projectStore');
    const project = projectStore.getProject(projectId);
    if (!project || project.status !== 'todos') return;

    // Don't add more todos if there are already pending ones waiting for execution
    if (project.todos.some(t => t.status === 'pending' || t.status === 'locked')) return;

    // Find the first approved+signed-off task that doesn't yet have a corresponding todo
    const pendingTask = project.tasks.find(task => {
      const alreadyCovered = project.todos.some(t => t.text.toLowerCase().includes(task.text.toLowerCase().slice(0, 30)));
      return !alreadyCovered;
    });

    if (!pendingTask) return;

    const members = this.getActiveMembers().filter(m => m.id !== 'opencode-cli');
    if (members.length === 0) return;
    const drafter = members[0];

    const systemPrompt = `You are breaking down a software development task into actionable todo items for the project "${project.name}".
Task: "${pendingTask.text}"

Existing todos:
${project.todos.map((t, i) => `${i + 1}. ${t.text} [${t.status}]`).join('\n') || 'None.'}

Propose exactly ONE new, specific, atomic todo item (e.g. "Create src/App.jsx with the main component scaffold").
Respond with ONLY:
DRAFT: <the todo item text>

If this task is fully covered by existing todos, respond with: COMPLETE`;

    try {
      const response = await callLLM(systemPrompt, `Break down: "${pendingTask.text}"`, drafter.id);
      if (!response) return;

      const draftMatch = response.match(/^DRAFT:\s*(.+)$/im);
      if (draftMatch) {
        const todoText = draftMatch[1].trim();
        projectStore.addItem(projectId, 'todos', todoText);
        this.broadcastMessage(drafter.name, 'drafted todo', todoText, 'vote');
        this.broadcastStateUpdate();
      }
    } catch (err) {
      console.error('[Manager] Todo synthesis error:', err);
    }
  }

  // ─── Peer review & approval ─────────────────────────────────────────────────

  async triggerItemReview(projectId, phase, item, proposerName) {
    const projectStore = require('../memory/projectStore');
    const members = this.getActiveMembers().filter(m => m.id !== 'opencode-cli' && m.name !== proposerName);

    // If no reviewers available, auto-approve
    if (members.length === 0) {
      projectStore.approveItem(projectId, phase, item.id, proposerName);
      const proj = projectStore.getProject(projectId);
      const it = proj && proj[phase] && proj[phase].find(i => i.id === item.id);
      if (it) { it.aiApproved = true; await projectStore._saveToDisk(); this.broadcastStateUpdate(); }
      await this.checkAutoPromote(projectId);
      return;
    }

    const reviewers = members.slice(0, Math.min(2, members.length));
    const phaseLabel = phase === 'requirements' ? 'requirement' : phase === 'tasks' ? 'task' : 'todo';

    for (const reviewer of reviewers) {
      const systemPrompt = `You are reviewing a proposed ${phaseLabel} for a software project.
Proposed item: "${item.text}"

If you approve it as written, respond with ONLY:
APPROVE: <one-sentence reason>

If you want to suggest a refinement, respond with ONLY:
REVISE: <improved text> REASON: <why>`;

      try {
        const response = await callLLM(systemPrompt, `Review this ${phaseLabel}: "${item.text}"`, reviewer.id);
        console.log(`[Review] ${reviewer.name} on "${item.text}": ${JSON.stringify(response)}`);
        if (!response) continue;

        const approveMatch = response.match(/^APPROVE:\s*(.+)$/im);
        const reviseMatch  = response.match(/^REVISE:\s*(.+?)(?:\s+REASON:|$)/im);

        // Positive-sentiment fallback — if no format used, check tone
        const looksPositive = /\b(agree|approved?|good|great|looks? (good|right|fine|solid)|yes|sounds? (good|right)|correct|perfect|fine|lgtm|ship it)\b/i.test(response);
        // Revision fallback — response contains a clearly reworded version
        const reviseFallbackMatch = response.match(/(?:should be|better as|suggest(?:ion)?:?|instead:?)\s+[""]?(.{10,200})[""]?/i);

        if (approveMatch) {
          projectStore.approveItem(projectId, phase, item.id, reviewer.name);
          this.broadcastMessage(reviewer.name, 'approved', `"${item.text}" — ${approveMatch[1].trim()}`, 'vote');
          this.broadcastStateUpdate();
          await this.checkAIConsensus(projectId, phase, item.id);
        } else if (reviseMatch) {
          const revisedText = reviseMatch[1].trim();
          projectStore.reviseItem(projectId, phase, item.id, revisedText);
          this.broadcastMessage(reviewer.name, 'revised to', revisedText, 'vote');
          this.broadcastStateUpdate();
          const updatedItem = projectStore.getProject(projectId)?.[phase]?.find(i => i.id === item.id);
          if (updatedItem) setTimeout(() => this.triggerItemReview(projectId, phase, updatedItem, reviewer.name), 3000);
        } else if (looksPositive) {
          // Informal approval — accept it
          projectStore.approveItem(projectId, phase, item.id, reviewer.name);
          this.broadcastMessage(reviewer.name, 'approved', `"${item.text}"`, 'vote');
          this.broadcastStateUpdate();
          await this.checkAIConsensus(projectId, phase, item.id);
        } else if (reviseFallbackMatch) {
          const revisedText = reviseFallbackMatch[1].replace(/[""]$/g, '').trim();
          projectStore.reviseItem(projectId, phase, item.id, revisedText);
          this.broadcastMessage(reviewer.name, 'revised to', revisedText, 'vote');
          this.broadcastStateUpdate();
          const updatedItem = projectStore.getProject(projectId)?.[phase]?.find(i => i.id === item.id);
          if (updatedItem) setTimeout(() => this.triggerItemReview(projectId, phase, updatedItem, reviewer.name), 3000);
        } else {
          // Couldn't parse intent — default to approve so the loop doesn't stall
          projectStore.approveItem(projectId, phase, item.id, reviewer.name);
          this.broadcastMessage(reviewer.name, 'approved', `"${item.text}"`, 'vote');
          this.broadcastStateUpdate();
          await this.checkAIConsensus(projectId, phase, item.id);
        }
      } catch (err) {
        console.error(`[Review] Error for ${reviewer.name}:`, err.message);
        this.broadcastMessage('System', `review error from ${reviewer.name}`, err.message, 'system');
      }

      await new Promise(r => setTimeout(r, 1500)); // stagger reviewers
    }
  }

  async checkAIConsensus(projectId, phase, itemId) {
    const projectStore = require('../memory/projectStore');
    const project = projectStore.getProject(projectId);
    if (!project) return;

    const item = project[phase] && project[phase].find(i => i.id === itemId);
    if (!item) return;

    const activeAI = this.getActiveMembers().filter(m => m.id !== 'opencode-cli');
    const approvalCount = (item.aiApprovals || []).length;

    if (approvalCount >= Math.ceil(activeAI.length / 2)) {
      item.aiApproved = true;
      await projectStore._saveToDisk();
      this.broadcastMessage('System', 'AI consensus reached on', item.text, 'system');
      this.broadcastStateUpdate();
      await this.checkAutoPromote(projectId);
    }
  }

  // ─── Auto-promotion ──────────────────────────────────────────────────────────

  async checkAutoPromote(projectId) {
    const projectStore = require('../memory/projectStore');
    const project = projectStore.getProject(projectId);
    if (!project || project.status === 'completed') return;

    const phase = project.status;
    const items = project[phase];
    if (items.length === 0) return;

    let shouldPromote;
    if (phase === 'todos') {
      shouldPromote = items.every(i => i.status === 'done' && i.signedOff);
    } else {
      shouldPromote = items.every(i => i.aiApproved && i.signedOff);
    }

    if (!shouldPromote) return;

    const updatedProject = projectStore.promotePhase(projectId);
    if (!updatedProject) return;

    this.broadcastStateUpdate();
    this.broadcastMessage('System', 'auto-promoted project to', updatedProject.status, 'system');

    // Reset synthesis state for the new phase
    this.projectDebateCounts[projectId] = 0;
    this.synthesisInProgress[projectId] = false;

    setTimeout(() => {
      this.handleCommitteeChat(
        `The project "${updatedProject.name}" has been promoted to the ${updatedProject.status} phase. Let's plan the ${updatedProject.status}.`,
        'System',
        projectId
      );
    }, 1500);

    // Kick off todo generation immediately on entering todos phase without
    // waiting for the debate cycle to accumulate enough messages.
    if (updatedProject.status === 'todos') {
      setTimeout(() => this.synthesizeTodoItems(projectId), 5000);
    }
  }

  // ─── Design validation (existing feature) ───────────────────────────────────

  async handleDesignUpdate(update, userId) {
    const context = getContext();
    const validationResult = validateDesign(update, context);
    if (!validationResult.isValid) {
      this.broadcastProactiveMessage(validationResult.feedback);
    } else {
      saveContext({ lastUpdate: update, timestamp: Date.now() });
    }
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

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
    if (members.length === 0) members.push({ id: 'local', name: 'Fallback Model' });
    return members;
  }

  broadcastStateUpdate() {
    const projectStore = require('../memory/projectStore');
    this.wss.clients.forEach(client => {
      if (client.readyState === 1) {
        client.send(JSON.stringify({ type: 'project_updated', projects: projectStore.getAllProjects() }));
      }
    });
  }

  broadcastProactiveMessage(message) {
    this.broadcastMessage('AI Architect', 'suggests', message, 'system');
  }

  broadcastMessage(sender, action, detail, type) {
    const msg = { id: Date.now() + Math.random(), sender, action, detail, type };
    this.wss.clients.forEach(client => {
      if (client.readyState === 1) {
        client.send(JSON.stringify({ type: 'new_message', message: msg }));
      }
    });
  }
}

module.exports = ManagerAgent;
