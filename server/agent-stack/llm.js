// Advanced LLM provider supporting multiple API and CLI backends
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function callLLM(systemPrompt, userPrompt, providerOverride) {
  const provider = providerOverride || process.env.ACTIVE_LLM_PROVIDER || 'local';
  console.log(`[LLM] Calling provider: ${provider}`);

  try {
    switch (provider) {
      case 'local':
        return await callOpenAICompatible(
          process.env.LOCAL_LLM_API_BASE || 'http://localhost:1234/v1',
          process.env.LOCAL_OPENAI_API_KEY || 'lm-studio',
          process.env.LOCAL_LLM_MODEL || 'local-model',
          systemPrompt,
          userPrompt
        );

      case 'remote':
        return await callOpenAICompatible(
          process.env.REMOTE_LLM_API_BASE,
          process.env.REMOTE_OPENAI_API_KEY || 'ollama',
          process.env.REMOTE_LLM_MODEL || 'llama3',
          systemPrompt,
          userPrompt
        );

      case 'openai':
        return await callOpenAICompatible(
          'https://api.openai.com/v1',
          process.env.OPENAI_API_KEY,
          process.env.OPENAI_MODEL || 'gpt-4o',
          systemPrompt,
          userPrompt
        );

      case 'openrouter':
        return await callOpenAICompatible(
          'https://openrouter.ai/api/v1',
          process.env.OPENROUTER_API_KEY,
          process.env.OPENROUTER_MODEL || 'anthropic/claude-3-sonnet',
          systemPrompt,
          userPrompt,
          { "HTTP-Referer": "https://designedbycommittee.ai", "X-Title": "DesignedByCommittee" }
        );

      case 'gemini':
        return await callGeminiAPI(systemPrompt, userPrompt);

      case 'anthropic':
        return await callAnthropicAPI(systemPrompt, userPrompt);

      case 'gemini-cli':
        return await callCLI('gemini', `${systemPrompt}\n\n${userPrompt}`);

      case 'opencode-cli':
        return await callOpenCodeMCP(systemPrompt, userPrompt);

      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  } catch (error) {
    console.error(`LLM Provider (${provider}) failed:`, error.message);
    return null;
  }
}

async function callOpenAICompatible(baseUrl, apiKey, model, systemPrompt, userPrompt, extraHeaders = {}) {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      ...extraHeaders
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI-Compat Error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function callGeminiAPI(systemPrompt, userPrompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-1.5-pro';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
      }]
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API Error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

async function callAnthropicAPI(systemPrompt, userPrompt) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20240620';
  
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: model,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic Error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

async function callCLI(cmd, prompt, flag = '') {
  // Escaping single quotes for bash
  const escapedPrompt = prompt.replace(/'/g, "'\\''");
  const execCmd = flag ? `${cmd} ${flag} '${escapedPrompt}'` : `${cmd} '${escapedPrompt}'`;
  const { stdout, stderr } = await execPromise(execCmd);
  if (stderr && !stdout) throw new Error(`${cmd} CLI Error: ${stderr}`);
  return stdout.trim();
}

async function callOpenCodeMCP(systemPrompt, userPrompt) {
  const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
  const { StdioClientTransport } = await import('@modelcontextprotocol/sdk/client/stdio.js');
  const path = require('path');

  const transport = new StdioClientTransport({
    command: 'node',
    args: [path.join(__dirname, '../tools/Better-OpenCodeMCP/dist/index.js')]
  });

  const client = new Client(
    { name: 'designedbycommitee', version: '1.0.0' },
    { capabilities: {} }
  );

  await client.connect(transport);

  try {
    const taskResult = await client.callTool({
      name: 'opencode',
      arguments: {
        task: `${systemPrompt}\n\n${userPrompt}`,
        agent: 'build',
        sessionTitle: 'Committee Debate'
      }
    });

    if (taskResult.isError) {
      throw new Error(`OpenCode MCP task failed to start: ${JSON.stringify(taskResult.content)}`);
    }

    const { taskId } = JSON.parse(taskResult.content[0].text);
    console.log(`[LLM-OpenCode] Started background task ${taskId}`);

    let isDone = false;
    let finalResult = null;
    let attempts = 0;

    while (!isDone && attempts < 30) {
      await new Promise(r => setTimeout(r, 2000));
      attempts++;

      const sessionsResult = await client.callTool({
        name: 'opencode_sessions',
        arguments: { status: 'all', limit: 10 }
      });

      const { sessions } = JSON.parse(sessionsResult.content[0].text);
      const mySession = sessions.find(s => s.taskId === taskId);
      
      if (!mySession) continue;

      if (mySession.status === 'completed' || mySession.status === 'failed') {
        isDone = true;
        finalResult = mySession.status === 'completed' 
          ? `[OpenCode] Task completed successfully.`
          : `[OpenCode] Task failed during execution.`;
      } else if (mySession.status === 'input_required') {
        await client.callTool({
          name: 'opencode_respond',
          arguments: { taskId, response: "Please proceed using your best judgment." }
        });
      }
    }
    
    return finalResult || `[OpenCode] Task ${taskId} timed out after 60s.`;
  } catch (err) {
    console.error('[LLM-OpenCode] Error:', err);
    return `[OpenCode] Error: ${err.message}`;
  } finally {
    await transport.close();
  }
}

module.exports = { callLLM };
